#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Este preparador es exclusivo del ejecutor efímero de GitHub Actions.' }
$ciRoot = Split-Path -Parent $PSScriptRoot
$ciChain = $null
$ciWeb = $null
Push-Location $ciRoot
try {
    $env:GUIA_ADMIN_USER = 'postgres'
    $env:GUIA_ADMIN_PASSWORD = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    $env:GUIA_DB_USER = 'guia_dinero_programable'
    $env:GUIA_DB_PASSWORD = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    # setup-postgres proporciona autenticación local del ejecutor; los roles de la aplicación reciben claves efímeras.
    & node scripts/provision-database.cjs
    if ($LASTEXITCODE) { throw 'Falló la preparación de PostgreSQL del ejecutor.' }
    $uvTools = (& uv tool dir).Trim()
    $env:GUIA_AUDIT_PYTHON = Join-Path $uvTools 'slither-analyzer\Scripts\python.exe'
    $env:GUIA_SLITHER_BIN = Join-Path ((& uv tool dir --bin).Trim()) 'slither.exe'
    & npm run coverage:contracts
    if ($LASTEXITCODE) { throw 'Falló la compuerta de contratos.' }
    & npm run compile -- --force
    if ($LASTEXITCODE) { throw 'Falló la compilación nativa final.' }
    & npm run build
    if ($LASTEXITCODE) { throw 'Falló la construcción de la web.' }
    New-Item -ItemType Directory -Path 'test-results' -Force | Out-Null
    $ciChain = Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + (Join-Path $ciRoot 'scripts\chain-node.cjs') + '"') -WorkingDirectory $ciRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $ciRoot 'test-results\ci-chain.log') -RedirectStandardError (Join-Path $ciRoot 'test-results\ci-chain-errors.log')
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:8545' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'; break }
        catch { Start-Sleep -Milliseconds 250 }
    }
    & npm run deploy
    if ($LASTEXITCODE) { throw 'Falló el despliegue local del ejecutor.' }
    $ciWeb = Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + (Join-Path $ciRoot 'backend\server.cjs') + '"') -WorkingDirectory $ciRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $ciRoot 'test-results\ci-web.log') -RedirectStandardError (Join-Path $ciRoot 'test-results\ci-web-errors.log')
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:8153/api/runtime'; break }
        catch { Start-Sleep -Milliseconds 250 }
    }
    & npm run coverage
    if ($LASTEXITCODE) { throw 'Falló la suite o la cobertura de funciones de la aplicación.' }
    & npm run test:legacy
    if ($LASTEXITCODE) { throw 'Falló la compatibilidad de los materiales existentes.' }
    & npm audit --omit=dev --audit-level=high
    if ($LASTEXITCODE) { throw 'La auditoría de dependencias de producción detectó un riesgo pendiente.' }
} finally {
    foreach ($owned in @($ciWeb, $ciChain)) {
        if ($owned) {
            $live = Get-CimInstance Win32_Process -Filter "ProcessId=$($owned.Id)" -ErrorAction SilentlyContinue
            if ($live -and $live.CommandLine.Contains($ciRoot)) { Stop-Process -Id $owned.Id -ErrorAction SilentlyContinue }
        }
    }
    Remove-Item Env:GUIA_ADMIN_USER, Env:GUIA_ADMIN_PASSWORD, Env:GUIA_DB_USER, Env:GUIA_DB_PASSWORD -ErrorAction SilentlyContinue
    Pop-Location
}
