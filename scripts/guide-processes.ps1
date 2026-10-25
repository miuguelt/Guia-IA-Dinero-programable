function Test-GuideProcessScope {
    param([object]$Process, [string]$GuideRoot)
    if (-not $Process -or -not $Process.CommandLine) { return $false }
    $root = [IO.Path]::GetFullPath($GuideRoot).TrimEnd('\', '/')
    $pattern = [regex]::Escape($root) + '(?:[\\/]|(?=["''\s]|$))'
    return [regex]::IsMatch($Process.CommandLine, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
}

function Get-GuideProcessTree {
    param([int]$ProcessId, [string]$GuideRoot, [object]$ExpectedCreated)
    $first = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
    if (-not $first) { return @() }
    if ($ProcessId -eq $PID) { throw 'La detención no puede incluir el proceso que la ejecuta.' }
    if ($ExpectedCreated) {
        $created = if ($ExpectedCreated -is [datetime]) { $ExpectedCreated.ToUniversalTime() }
                   else { [DateTimeOffset]::Parse([string]$ExpectedCreated).UtcDateTime }
        if ($first.CreationDate.ToUniversalTime() -ne $created) {
            throw "El PID $ProcessId fue reutilizado. No se detuvo ningún proceso de ese árbol."
        }
    }
    $queue = [Collections.Generic.List[object]]::new()
    $seen = @{}
    $queue.Add($first)
    for ($index = 0; $index -lt $queue.Count; $index++) {
        $entry = $queue[$index]
        if (-not (Test-GuideProcessScope -Process $entry -GuideRoot $GuideRoot)) {
            throw "El PID $($entry.ProcessId) ($($entry.Name)) no tiene una ruta del proyecto verificable. Se conservó el árbol."
        }
        $seen[[int]$entry.ProcessId] = $true
        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($entry.ProcessId)" -ErrorAction Stop)) {
            if ($child.CreationDate -lt $entry.CreationDate -or $seen.ContainsKey([int]$child.ProcessId)) { continue }
            # El anfitrión de consola de Windows termina con su cliente; no se administra como proceso de la guía.
            $consolePath = Join-Path $env:SystemRoot 'System32\conhost.exe'
            if ($child.ExecutablePath -and $child.ExecutablePath -ieq $consolePath) { continue }
            $queue.Add($child)
        }
    }
    return $queue.ToArray()
}

function Stop-GuideProcessTree {
    param([int]$ProcessId, [string]$GuideRoot, [object]$ExpectedCreated)
    $tree = @(Get-GuideProcessTree -ProcessId $ProcessId -GuideRoot $GuideRoot -ExpectedCreated $ExpectedCreated)
    # Se detienen primero los supervisores para impedir que vuelvan a crear los hijos.
    foreach ($entry in $tree) {
        $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.ProcessId)" -ErrorAction Stop
        if (-not $current) { continue }
        if ($current.CreationDate -ne $entry.CreationDate -or -not (Test-GuideProcessScope -Process $current -GuideRoot $GuideRoot)) {
            throw "La identidad del PID $($entry.ProcessId) cambió. No se detuvo ese proceso."
        }
        Stop-Process -Id $current.ProcessId -ErrorAction Stop
        Wait-Process -Id $current.ProcessId -Timeout 5 -ErrorAction SilentlyContinue
    }
    return $tree.Count
}

function Stop-GuideProcesses {
    param([string]$GuideRoot, [string]$StateFile)
    if (-not (Test-Path -LiteralPath $StateFile)) { return }
    $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    foreach ($role in @('api', 'chain')) {
        $processId = $state.$role
        if (-not $processId) { continue }
        $created = $state.identities.$role
        $count = Stop-GuideProcessTree -ProcessId $processId -GuideRoot $GuideRoot -ExpectedCreated $created
        if (-not $count) {
            foreach ($entry in @($state.processes | Where-Object { $_.role -eq $role -and $_.id -ne $processId })) {
                Stop-GuideProcessTree -ProcessId $entry.id -GuideRoot $GuideRoot -ExpectedCreated $entry.created | Out-Null
            }
        }
    }
    Remove-Item -LiteralPath $StateFile -ErrorAction Stop
}

function Save-GuideLifecycleState {
    param([string]$GuideRoot, [string]$StateFile, [int]$ChainId, [int]$ApiId)
    $state = @{chain=$ChainId; api=$ApiId; identities=@{}; processes=@()}
    foreach ($role in @('chain', 'api')) {
        $processId = $state[$role]
        if (-not $processId) { continue }
        $tree = @(Get-GuideProcessTree -ProcessId $processId -GuideRoot $GuideRoot)
        if (-not $tree.Count) { throw "El componente $role terminó antes de registrar su identidad." }
        $state.identities[$role] = $tree[0].CreationDate.ToUniversalTime().ToString('o')
        foreach ($entry in $tree) {
            $state.processes += @{role=$role; id=[int]$entry.ProcessId; created=$entry.CreationDate.ToUniversalTime().ToString('o')}
        }
    }
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $StateFile -Encoding utf8
}

function Wait-GuidePort {
    param([int]$Port)
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        $client = [Net.Sockets.TcpClient]::new()
        try { $client.Connect('127.0.0.1', $Port); return } catch { Start-Sleep -Milliseconds 250 }
        finally { $client.Dispose() }
    }
    throw "El componente local no abrió el puerto $Port. Revisa artifacts/."
}

function Wait-GuideRuntime {
    param([int]$Port = 8153, [int]$TimeoutMilliseconds = 15000)
    $clock = [Diagnostics.Stopwatch]::StartNew()
    while ($clock.ElapsedMilliseconds -lt $TimeoutMilliseconds) {
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/runtime" -TimeoutSec 2
            if ($health.api -and $health.chain.connected -and $health.chain.chainId -eq 31337 -and $health.database.connected) { return $health }
        } catch { }
        Start-Sleep -Milliseconds 250
    }
    throw 'El aula abrió el puerto, pero la cadena local o PostgreSQL no están disponibles. Revisa la configuración y los registros del proyecto.'
}

function Initialize-GuideProofAssets {
    param([string]$GuideRoot)
    Push-Location $GuideRoot
    try {
        & node --input-type=module -e "import {prepareProofAssets} from './backend/chain/proof-assets.cjs'; await prepareProofAssets(process.cwd());"
        if ($LASTEXITCODE) { throw 'No se pudieron preparar los recursos públicos de Semaphore. Revisa la conexión y vuelve a iniciar la guía.' }
    } finally { Pop-Location }
}
