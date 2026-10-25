#Requires -Version 7.0
[CmdletBinding()]
param([switch]$Stop, [switch]$Reload, [switch]$InitializeDatabase, [switch]$NoWatch)
$ErrorActionPreference = 'Stop'
$guideRoot = $PSScriptRoot
$guideArtifacts = Join-Path $guideRoot 'artifacts'
$guideStateFile = Join-Path $guideArtifacts 'lifecycle.json'
. (Join-Path $guideRoot 'scripts\guide-credentials.ps1')
. (Join-Path $guideRoot 'scripts\guide-processes.ps1')

if ($Stop -or $Reload) { Stop-GuideProcesses -GuideRoot $guideRoot -StateFile $guideStateFile }
if ($Stop) { Write-Host 'Componentes propios de la guía detenidos.'; return }
New-Item -ItemType Directory -Path $guideArtifacts -Force | Out-Null
$presetDatabase = @{ GUIA_DB_HOST = $env:GUIA_DB_HOST; GUIA_DB_PORT = $env:GUIA_DB_PORT }
try {
    if ($InitializeDatabase) { Initialize-GuideDatabase } else { Import-GuideCredentials }
    $databaseHost = if ($env:GUIA_DB_HOST) { $env:GUIA_DB_HOST } else { '127.0.0.1' }
    $databasePort = if ($env:GUIA_DB_PORT) { $env:GUIA_DB_PORT } else { '5434' }
    if (-not (Test-GuideDatabaseConnection -Server $databaseHost -Port $databasePort)) {
        throw "PostgreSQL no responde en ${databaseHost}:${databasePort}. Inicia el servicio de PostgreSQL en Windows y vuelve a ejecutar .\start-windows.ps1. Si cambiaste el servidor o el puerto, prepara de nuevo con .\start-windows.ps1 -InitializeDatabase."
    }
    $existing = Get-NetTCPConnection -LocalPort 8153 -State Listen -ErrorAction SilentlyContinue
    if ($existing) {
        $running = Get-CimInstance Win32_Process -Filter "ProcessId=$($existing[0].OwningProcess)"
        if (Test-GuideProcessScope -Process $running -GuideRoot $guideRoot) {
            Wait-GuideRuntime | Out-Null
            Write-Host 'La guía ya está iniciada y sus dependencias están disponibles.'
            return
        }
        throw 'El puerto 8153 está ocupado por un proceso sin identidad verificable de esta guía. No se modificó el proceso que lo usa.'
    }
    if (Get-NetTCPConnection -LocalPort 8545 -State Listen -ErrorAction SilentlyContinue) {
        throw 'El puerto 8545 está ocupado. Detén primero el nodo del proyecto propietario.'
    }
    Push-Location $guideRoot
    try {
        & node scripts/build-web.cjs
        if ($LASTEXITCODE) { throw 'No se pudo construir la web.' }
        & node node_modules/hardhat/internal/cli/cli.js compile
        if ($LASTEXITCODE) { throw 'No se pudieron compilar los contratos.' }
        Initialize-GuideProofAssets -GuideRoot $guideRoot
        $chain = Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + (Join-Path $guideRoot 'scripts\chain-node.cjs') + '"') -WorkingDirectory $guideRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $guideArtifacts 'chain.log') -RedirectStandardError (Join-Path $guideArtifacts 'chain-errors.log')
        Save-GuideLifecycleState -GuideRoot $guideRoot -StateFile $guideStateFile -ChainId $chain.Id
        Wait-GuidePort -Port 8545
        & node node_modules/hardhat/internal/cli/cli.js run scripts/deploy.js --network localhost
        if ($LASTEXITCODE) { throw 'No se pudieron desplegar los contratos.' }
        $entry = if ($NoWatch) { 'backend\server.cjs' } else { 'scripts\dev.cjs' }
        $api = Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + (Join-Path $guideRoot $entry) + '"') -WorkingDirectory $guideRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $guideArtifacts 'web.log') -RedirectStandardError (Join-Path $guideArtifacts 'web-errors.log')
        Save-GuideLifecycleState -GuideRoot $guideRoot -StateFile $guideStateFile -ChainId $chain.Id -ApiId $api.Id
        Wait-GuidePort -Port 8153
        Wait-GuideRuntime | Out-Null
        Save-GuideLifecycleState -GuideRoot $guideRoot -StateFile $guideStateFile -ChainId $chain.Id -ApiId $api.Id
        Write-Host "Guía iniciada en http://localhost:8153/. Nodo local 31337 y PostgreSQL ${databaseHost}:${databasePort}."
    } catch { Stop-GuideProcesses -GuideRoot $guideRoot -StateFile $guideStateFile; throw }
    finally { Pop-Location }
} finally {
    Remove-Item Env:GUIA_DB_USER, Env:GUIA_DB_PASSWORD -ErrorAction SilentlyContinue
    foreach ($name in $presetDatabase.Keys) { [Environment]::SetEnvironmentVariable($name, $presetDatabase[$name], 'Process') }
}
