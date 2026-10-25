param(
    [string]$ModulePath, [string]$GuideRoot, [string]$StateFile,
    [int]$RootProcessId, [int]$HealthyPort, [int]$UnhealthyPort, [string]$AssetRoot
)
$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$syntax = [Management.Automation.Language.Parser]::ParseFile($ModulePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'El módulo de ciclo de vida contiene errores de sintaxis.' }
$functions = @($syntax.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $true))
$global:GuideLifecycleFunctionHits = [Collections.Generic.HashSet[string]]::new()
$breakpoints = @()
try {
    foreach ($function in $functions) {
        $line = $function.Body.EndBlock.Statements[0].Extent.StartLineNumber
        $action = [scriptblock]::Create("[void]`$global:GuideLifecycleFunctionHits.Add('$($function.Name)')")
        $breakpoints += Set-PSBreakpoint -Script $ModulePath -Line $line -Action $action
    }
    . $ModulePath
    $entry = Get-CimInstance Win32_Process -Filter "ProcessId=$RootProcessId"
    if (-not (Test-GuideProcessScope -Process $entry -GuideRoot $GuideRoot)) { throw 'No se reconoció la ruta del proceso de prueba.' }
    if (Test-GuideProcessScope -Process $null -GuideRoot $GuideRoot) { throw 'Un proceso ausente no tiene identidad verificable.' }
    if (Test-GuideProcessScope -Process @{CommandLine="node `"${GuideRoot}-otro\server.cjs`""} -GuideRoot $GuideRoot) {
        throw 'Se aceptó una carpeta que solo comparte el prefijo del proyecto.'
    }
    $tree = @(Get-GuideProcessTree -ProcessId $RootProcessId -GuideRoot $GuideRoot)
    if ($tree.Count -ne 3) { throw 'No se descubrieron las tres generaciones propias.' }
    $wrongIdentityRejected = $false
    try { Get-GuideProcessTree -ProcessId $RootProcessId -GuideRoot $GuideRoot -ExpectedCreated '1900-01-01T00:00:00.0000000Z' | Out-Null }
    catch { $wrongIdentityRejected = $_.Exception.Message.Contains('reutilizado') }
    if (-not $wrongIdentityRejected) { throw 'No se rechazó una identidad de PID diferente.' }
    Save-GuideLifecycleState -GuideRoot $GuideRoot -StateFile $StateFile -ChainId $RootProcessId
    $saved = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    if ($saved.chain -ne $RootProcessId -or $saved.processes.Count -ne 3 -or -not $saved.identities.chain) {
        throw 'El estado no guardó las identidades y los descendientes del proceso.'
    }
    Wait-GuidePort -Port $HealthyPort
    $healthy = Wait-GuideRuntime -Port $HealthyPort
    if ($healthy.chain.chainId -ne 31337 -or -not $healthy.database.connected) { throw 'El estado saludable no verificó sus dependencias.' }
    $unhealthyRejected = $false
    try { Wait-GuideRuntime -Port $UnhealthyPort -TimeoutMilliseconds 200 | Out-Null }
    catch { $unhealthyRejected = $_.Exception.Message.Contains('PostgreSQL') }
    if (-not $unhealthyRejected) { throw 'Se aceptó un puerto abierto sin PostgreSQL disponible.' }
    Initialize-GuideProofAssets -GuideRoot $AssetRoot
    Stop-GuideProcesses -GuideRoot $GuideRoot -StateFile $StateFile
    if (Test-Path -LiteralPath $StateFile) { throw 'La detención conservó un estado obsoleto.' }
    foreach ($process in $tree) {
        if (Get-CimInstance Win32_Process -Filter "ProcessId=$($process.ProcessId)") { throw 'La detención dejó una generación viva.' }
    }
    Stop-GuideProcesses -GuideRoot $GuideRoot -StateFile $StateFile
    $names = @($functions.Name | Sort-Object -Unique)
    $missing = @($names | Where-Object { -not $global:GuideLifecycleFunctionHits.Contains($_) })
    $report = @{source=$ModulePath; metric='Funciones PowerShell por AST y entradas observadas con breakpoints nativos'; functions=$names; covered=@($global:GuideLifecycleFunctionHits | Sort-Object); missing=$missing; functionCoverage=100 * ($names.Count - $missing.Count) / $names.Count}
    if ($missing.Count) { throw "Faltan funciones por verificar: $($missing -join ', ')." }
    $report | ConvertTo-Json -Depth 5 -Compress
} finally {
    $breakpoints | Remove-PSBreakpoint
    Remove-Variable -Name GuideLifecycleFunctionHits -Scope Global -ErrorAction SilentlyContinue
}
