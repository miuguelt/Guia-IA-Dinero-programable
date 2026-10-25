param([Parameter(Mandatory)][string]$ModulePath, [Parameter(Mandatory)][string]$GuideRoot)
$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$syntax = [Management.Automation.Language.Parser]::ParseFile($ModulePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'El módulo de credenciales contiene errores de sintaxis.' }
$functions = @($syntax.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $true))
$global:GuideCredentialFunctionHits = [Collections.Generic.HashSet[string]]::new()
$breakpoints = @()
$assertions = [Collections.Generic.List[string]]::new()
$credentialName = 'GUIA_TEST_' + [Guid]::NewGuid().ToString('N').ToUpperInvariant()
$credentialTarget = 'DevBrain/' + $credentialName
$localPrefix = 'GuiaDineroTest' + [Guid]::NewGuid().ToString('N').ToUpperInvariant()
$localNames = @('DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'PROBE')
$variableNames = @('GUIA_DB_USER', 'GUIA_DB_PASSWORD', 'GUIA_DB_HOST', 'GUIA_DB_PORT', 'GUIA_ADMIN_USER', 'GUIA_ADMIN_PASSWORD',
    'GUIA_CREDENTIAL_PREFIX', 'GUIA_TEST_PROVISION_RECORD', 'GUIA_TEST_PROVISION_EXIT')
$original = @{}
foreach ($name in $variableNames) { $original[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$listener = $null
$workDirectory = $null

Add-Type @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class GuideCredentialTestProbe {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct Credential {
        public int Flags; public int Type; public string TargetName; public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
        public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
    }
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool CredRead(string target, int type, int flags, out IntPtr pointer);
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool CredDelete(string target, int type, int flags);
    [DllImport("advapi32.dll")] static extern void CredFree(IntPtr pointer);
    static void CheckScope(string target) {
        if (!System.Text.RegularExpressions.Regex.IsMatch(target,@"^(DevBrain/GUIA_TEST_[A-F0-9]{32}|GuiaDineroTest[A-F0-9]{32}/(DB_USER|DB_PASSWORD|DB_HOST|DB_PORT|PROBE))$"))
            throw new InvalidOperationException("El destino no pertenece a esta prueba.");
    }
    public static string Read(string target) {
        CheckScope(target);
        IntPtr pointer;
        if (!CredRead(target,1,0,out pointer)) {
            int error=Marshal.GetLastWin32Error();
            if (error==1168) return null;
            throw new Win32Exception(error);
        }
        try {
            Credential value=Marshal.PtrToStructure<Credential>(pointer);
            return Marshal.PtrToStringUni(value.CredentialBlob,value.CredentialBlobSize/2);
        } finally { CredFree(pointer); }
    }
    public static void Delete(string target) {
        CheckScope(target);
        if (!CredDelete(target,1,0) && Marshal.GetLastWin32Error()!=1168)
            throw new Win32Exception(Marshal.GetLastWin32Error());
    }
}
'@

# Read-Host simulado: las funciones del módulo lo resuelven antes que el cmdlet y la prueba registra cada solicitud.
$global:GuideReadHostAnswers = [Collections.Generic.Queue[string]]::new()
$global:GuideReadHostPrompts = [Collections.Generic.List[string]]::new()
function global:Read-Host {
    param([string]$Prompt, [switch]$AsSecureString)
    $global:GuideReadHostPrompts.Add($(if ($AsSecureString) { "$Prompt|oculto" } else { $Prompt }))
    if (-not $global:GuideReadHostAnswers.Count) { throw 'La prueba no preparó una respuesta para Read-Host.' }
    $answer = $global:GuideReadHostAnswers.Dequeue()
    if ($AsSecureString) { ConvertTo-SecureString -String $answer -AsPlainText -Force } else { $answer }
}
function Set-Answers { param([string[]]$Values) $global:GuideReadHostAnswers.Clear(); $global:GuideReadHostPrompts.Clear(); foreach ($item in $Values) { $global:GuideReadHostAnswers.Enqueue($item) } }
function Clear-GuideEnvironment { foreach ($name in 'GUIA_DB_USER', 'GUIA_DB_PASSWORD', 'GUIA_DB_HOST', 'GUIA_DB_PORT', 'GUIA_ADMIN_USER', 'GUIA_ADMIN_PASSWORD') { Remove-Item "Env:$name" -ErrorAction SilentlyContinue } }
function Get-Hash { param([string]$Value) [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Value))).ToLowerInvariant() }
function Read-Local { param([string]$Name) [GuideCredentialTestProbe]::Read("$localPrefix/$Name") }
function Assert-Throws { param([scriptblock]$Action, [string]$Expected, [string]$Failure)
    $message = $null
    try { & $Action | Out-Null } catch { $message = $_.Exception.Message }
    if (-not $message -or -not $message.Contains($Expected)) { throw "$Failure Mensaje observado: $message" }
}
function Get-ClosedPort { $probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0); $probe.Start(); $port = $probe.LocalEndpoint.Port; $probe.Stop(); $port }

try {
    foreach ($function in $functions) {
        $line = $function.Body.EndBlock.Statements[0].Extent.StartLineNumber
        $action = [scriptblock]::Create("[void]`$global:GuideCredentialFunctionHits.Add('$($function.Name)')")
        $breakpoints += Set-PSBreakpoint -Script $ModulePath -Line $line -Action $action
    }
    . $ModulePath
    $hasWorkspace = [bool]$guideWorkspace
    $devBrainWorkspace = $guideWorkspace
    $env:GUIA_CREDENTIAL_PREFIX = $localPrefix

    # Primitivas del nivel completo: destinos propios, lectura nativa, solicitudes y conectividad.
    if ((Get-GuideCredentialTarget -Name 'DB_USER') -cne "$localPrefix/DB_USER") { throw 'El destino local no usa el prefijo de la guía.' }
    $env:GUIA_CREDENTIAL_PREFIX = 'DevBrain'
    Assert-Throws { Get-GuideCredentialTarget -Name 'DB_USER' } 'no pertenece a esta guía' 'Un prefijo ajeno no fue rechazado.'
    $env:GUIA_CREDENTIAL_PREFIX = $localPrefix
    $assertions.Add('Los destinos locales quedan limitados al prefijo GuiaDinero y rechazan prefijos ajenos.')

    Set-Answers @('', '  db.aula.local ', 'Clave con espacio ', '')
    if ((Read-GuideSetting -Prompt 'Servidor' -Default '127.0.0.1') -cne '127.0.0.1') { throw 'Una respuesta vacía no usó el valor predeterminado.' }
    if ((Read-GuideSetting -Prompt 'Servidor' -Default '127.0.0.1') -cne 'db.aula.local') { throw 'La respuesta visible no se normalizó.' }
    if ((Read-GuideSetting -Prompt 'Clave' -Secret) -cne 'Clave con espacio ') { throw 'La respuesta oculta cambió su contenido.' }
    Assert-Throws { Read-GuideSetting -Prompt 'Usuario' } 'Falta un dato obligatorio' 'Un dato obligatorio vacío fue aceptado.'
    if (($global:GuideReadHostPrompts -join ';') -cne 'Servidor [127.0.0.1];Servidor [127.0.0.1];Clave|oculto;Usuario') { throw 'Las solicitudes no muestran el valor predeterminado o no ocultan la clave.' }
    $assertions.Add('Las solicitudes muestran valores predeterminados, ocultan la clave con SecureString y exigen datos obligatorios.')

    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $openPort = $listener.LocalEndpoint.Port
    $closedPort = Get-ClosedPort
    if (-not (Test-GuideDatabaseConnection -Server '127.0.0.1' -Port $openPort)) { throw 'No se detectó un puerto que sí escucha.' }
    if (Test-GuideDatabaseConnection -Server '127.0.0.1' -Port $closedPort -TimeoutMilliseconds 1500) { throw 'Un puerto cerrado se reportó disponible.' }
    $assertions.Add('La comprobación de PostgreSQL distingue un puerto que escucha de uno cerrado.')

    $value = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    $credentialManager = 'verified'
    try {
        Save-GuideCredential -Name $credentialName -Value $value
        $observed = [GuideCredentialTestProbe]::Read($credentialTarget)
        if ($observed -cne $value) { throw 'El valor recuperado del almacén de Windows no coincide con el valor generado.' }
        [GuideCredentialTestProbe]::Delete($credentialTarget)
        if ($null -ne [GuideCredentialTestProbe]::Read($credentialTarget)) { throw 'La credencial de prueba no se eliminó.' }
        Save-GuideCredential -Local -Name 'PROBE' -Value $value
        if ((Read-GuideCredential -Name 'PROBE') -cne $value -or (Read-Local 'PROBE') -cne $value) { throw 'El lector nativo no recuperó la credencial local.' }
        [GuideCredentialTestProbe]::Delete("$localPrefix/PROBE")
        if ($null -ne (Read-GuideCredential -Name 'PROBE')) { throw 'El lector nativo devolvió una credencial eliminada.' }
        $assertions.Add('Guardar, leer y eliminar credenciales efímeras DevBrain y locales produce efectos reales en Windows.')
    } catch {
        if ($hasWorkspace -or -not $_.Exception.Message.Contains('No se pudo guardar la credencial')) { throw }
        $credentialManager = 'accessRejected'
        $assertions.Add('Windows rechazó explícitamente la escritura de la credencial en el ejecutor sin sesión habilitada.')
    }

    # Nivel completo sin DevBrain: se ejecuta en ambos modos anulando el workspace detectado.
    $guideWorkspace = $null
    $workDirectory = Join-Path ([IO.Path]::GetTempPath()) ('guide-local-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $workDirectory | Out-Null
    $provisioner = Join-Path $workDirectory 'provision.cjs'
    Set-Content -LiteralPath $provisioner -Encoding utf8 -Value @'
const fs=require('node:fs');const crypto=require('node:crypto');const e=process.env;
const hash=v=>v?crypto.createHash('sha256').update(v,'utf8').digest('hex'):null;
fs.writeFileSync(e.GUIA_TEST_PROVISION_RECORD,JSON.stringify({host:e.GUIA_DB_HOST,port:e.GUIA_DB_PORT,adminUser:e.GUIA_ADMIN_USER,adminPassword:hash(e.GUIA_ADMIN_PASSWORD),dbUser:e.GUIA_DB_USER,dbPassword:hash(e.GUIA_DB_PASSWORD)}));
process.exitCode=Number(e.GUIA_TEST_PROVISION_EXIT||0);
'@
    $record = Join-Path $workDirectory 'record.json'
    $env:GUIA_TEST_PROVISION_RECORD = $record
    Clear-GuideEnvironment
    Assert-Throws { Import-GuideCredentials } 'start-windows.ps1 -InitializeDatabase' 'La importación sin credenciales locales no indicó cómo prepararlas.'
    $assertions.Add('Sin credenciales locales guardadas, el lanzador indica el comando de preparación.')

    $localLevel = 'accessRejected'
    if ($credentialManager -eq 'verified') {
        $adminSecret = 'Adm1n ' + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(18))
        Set-Answers @('', "$openPort", 'postgres_aprendiz', $adminSecret)
        $output = Initialize-GuideDatabase -ProvisionScript $provisioner *>&1 | Out-String
        $observedRecord = Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
        $storedPassword = Read-Local 'DB_PASSWORD'
        if ($observedRecord.host -cne '127.0.0.1' -or $observedRecord.port -cne "$openPort" -or $observedRecord.adminUser -cne 'postgres_aprendiz' -or $observedRecord.adminPassword -cne (Get-Hash $adminSecret) -or $observedRecord.dbUser -cne 'guia_dinero_programable') {
            throw 'El aprovisionamiento no recibió el servidor, el puerto o las credenciales administrativas respondidas.'
        }
        if (-not $storedPassword -or $storedPassword.Length -ne 64 -or $observedRecord.dbPassword -cne (Get-Hash $storedPassword)) { throw 'La clave generada del rol no coincide con la guardada.' }
        if ((Read-Local 'DB_USER') -cne 'guia_dinero_programable' -or (Read-Local 'DB_HOST') -cne '127.0.0.1' -or (Read-Local 'DB_PORT') -cne "$openPort") { throw 'Credential Manager no conserva el usuario, el servidor o el puerto de la guía.' }
        if ($env:GUIA_ADMIN_USER -or $env:GUIA_ADMIN_PASSWORD) { throw 'La preparación local conservó credenciales administrativas en el proceso.' }
        if (($global:GuideReadHostPrompts -join ';') -cne 'Servidor de PostgreSQL [127.0.0.1];Puerto de PostgreSQL [5432];Usuario administrador de PostgreSQL [postgres];Contraseña del administrador de PostgreSQL|oculto') { throw 'La preparación no solicitó los datos esperados con sus valores predeterminados.' }
        if ($global:GuideReadHostAnswers.Count) { throw 'La preparación no consumió todas las respuestas.' }
        foreach ($secret in $adminSecret, $storedPassword) { if ($output.Contains($secret) -or ($global:GuideReadHostPrompts -join ';').Contains($secret)) { throw 'La preparación imprimió una clave.' } }
        $assertions.Add('La preparación local pide servidor, puerto 5432 y administrador, genera la clave del rol y guarda cuatro destinos GuiaDinero sin imprimir claves.')

        Clear-GuideEnvironment
        Import-GuideCredentials
        if ($env:GUIA_DB_USER -cne 'guia_dinero_programable' -or $env:GUIA_DB_PASSWORD -cne $storedPassword -or $env:GUIA_DB_HOST -cne '127.0.0.1' -or $env:GUIA_DB_PORT -cne "$openPort") { throw 'La importación local no cargó usuario, clave, servidor y puerto.' }
        $env:GUIA_DB_PORT = '6543'
        Remove-Item Env:GUIA_DB_PASSWORD
        Import-GuideCredentials
        if ($env:GUIA_DB_PORT -cne '6543') { throw 'La importación local reemplazó un puerto definido por el entorno.' }
        Import-GuideCredentials
        if ($env:GUIA_DB_PASSWORD -cne $storedPassword) { throw 'La importación local reemplazó el entorno seguro existente.' }
        $assertions.Add('La aplicación carga desde Credential Manager usuario, clave, servidor y puerto, y respeta el entorno ya definido.')

        Clear-GuideEnvironment
        Set-Answers @('', $adminSecret)
        Import-GuideAdminCredentials
        Import-GuideAdminCredentials
        if ($env:GUIA_ADMIN_USER -cne 'postgres' -or $env:GUIA_ADMIN_PASSWORD -cne $adminSecret -or $global:GuideReadHostPrompts.Count -ne 2) { throw 'La importación administrativa local no pidió una sola vez usuario y clave.' }
        if ($null -ne (Read-GuideCredential -Name 'ADMIN_USER') -or $null -ne (Read-GuideCredential -Name 'ADMIN_PASSWORD')) { throw 'Las credenciales administrativas se guardaron.' }
        $assertions.Add('La importación administrativa local pide usuario y clave una sola vez y no los guarda.')

        Clear-GuideEnvironment
        Set-Answers @('', '', 'postgres', $adminSecret)
        Initialize-GuideDatabase -ProvisionScript $provisioner | Out-Null
        $observedRecord = Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
        if ((Read-Local 'DB_PASSWORD') -cne $storedPassword -or $observedRecord.dbPassword -cne (Get-Hash $storedPassword) -or $observedRecord.port -cne "$openPort") { throw 'La preparación repetida no reutilizó la clave, el servidor y el puerto guardados.' }
        $assertions.Add('La preparación repetida es idempotente: reutiliza la clave del rol y propone el servidor y el puerto guardados.')

        Clear-GuideEnvironment
        Remove-Item -LiteralPath $record
        $env:GUIA_TEST_PROVISION_EXIT = '1'
        $env:GUIA_DB_HOST = '127.0.0.1'; $env:GUIA_DB_PORT = "$openPort"; $env:GUIA_ADMIN_USER = 'postgres'; $env:GUIA_ADMIN_PASSWORD = $adminSecret
        Set-Answers @()
        Assert-Throws { Initialize-GuideDatabase -ProvisionScript $provisioner } 'No se pudo preparar la base exclusiva' 'Un aprovisionamiento fallido no se informó.'
        Remove-Item Env:GUIA_TEST_PROVISION_EXIT
        if (-not (Test-Path -LiteralPath $record) -or $env:GUIA_ADMIN_USER -or $env:GUIA_ADMIN_PASSWORD) { throw 'El fallo no usó las respuestas inyectadas o conservó credenciales administrativas.' }
        $assertions.Add('Las respuestas se pueden inyectar por entorno y un aprovisionamiento fallido limpia las credenciales administrativas.')
        $localLevel = 'verified'
    }

    Clear-GuideEnvironment
    $env:GUIA_DB_HOST = '127.0.0.1'; $env:GUIA_DB_PORT = '70000'
    Assert-Throws { Initialize-GuideDatabase -ProvisionScript $provisioner } 'entre 1 y 65535' 'Un puerto inválido fue aceptado.'
    $env:GUIA_DB_PORT = "$closedPort"
    Set-Answers @('postgres', 'no-se-usa')
    Assert-Throws { Initialize-GuideDatabase -ProvisionScript $provisioner } "PostgreSQL no responde en 127.0.0.1:$closedPort" 'Un PostgreSQL inaccesible no se informó con servidor y puerto.'
    if ($global:GuideReadHostPrompts.Count) { throw 'La preparación pidió la clave administrativa antes de comprobar PostgreSQL.' }
    $assertions.Add('La preparación valida el puerto y detecta PostgreSQL inaccesible antes de pedir la clave administrativa.')
    $guideWorkspace = $devBrainWorkspace
    foreach ($name in 'GUIA_DB_USER', 'GUIA_DB_PASSWORD', 'GUIA_DB_HOST', 'GUIA_DB_PORT', 'GUIA_ADMIN_USER', 'GUIA_ADMIN_PASSWORD') { [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process') }

    $databaseMode = 'localOnly'
    if ($hasWorkspace) {
        Import-GuideCredentials
        if (-not $env:GUIA_DB_USER -or -not $env:GUIA_DB_PASSWORD) { throw 'La importación no proporcionó las credenciales de la aplicación.' }
        $applicationUser = $env:GUIA_DB_USER
        $applicationPassword = $env:GUIA_DB_PASSWORD
        Import-GuideCredentials
        if ($env:GUIA_DB_USER -cne $applicationUser -or $env:GUIA_DB_PASSWORD -cne $applicationPassword) { throw 'La importación reemplazó el entorno seguro existente.' }
        $assertions.Add('La aplicación recibe credenciales de DevBrain y conserva el entorno ya configurado.')
        Import-GuideAdminCredentials
        if (-not $env:GUIA_ADMIN_USER -or -not $env:GUIA_ADMIN_PASSWORD) { throw 'La importación no proporcionó las credenciales administrativas.' }
        $administrativeUser = $env:GUIA_ADMIN_USER
        $administrativePassword = $env:GUIA_ADMIN_PASSWORD
        Import-GuideAdminCredentials
        if ($env:GUIA_ADMIN_USER -cne $administrativeUser -or $env:GUIA_ADMIN_PASSWORD -cne $administrativePassword) { throw 'La importación administrativa reemplazó el entorno configurado.' }
        $assertions.Add('La preparación recibe credenciales administrativas de DevBrain sin reemplazar las existentes.')

        Initialize-GuideDatabase | Out-Null
        if ($env:GUIA_ADMIN_USER -or $env:GUIA_ADMIN_PASSWORD) { throw 'La preparación conservó credenciales administrativas en el proceso.' }
        if ($env:GUIA_DB_USER -cne $applicationUser -or $env:GUIA_DB_PASSWORD -cne $applicationPassword) { throw 'La preparación idempotente cambió las credenciales existentes.' }
        $verificationCode = @'
const {Client}=require('pg');
const client=new Client({host:'127.0.0.1',port:5434,database:'guia_dinero_programable',user:process.env.GUIA_DB_USER,password:process.env.GUIA_DB_PASSWORD});
(async()=>{try{await client.connect();const result=await client.query('SELECT current_database() AS database,current_user AS role,rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');console.log(JSON.stringify(result.rows[0]));}finally{await client.end();}})().catch(()=>{console.error('No se pudo verificar la base exclusiva.');process.exitCode=1;});
'@
        Push-Location $GuideRoot
        try { $verification = & node -e $verificationCode; if ($LASTEXITCODE) { throw 'Falló la verificación de privilegios de la aplicación.' } }
        finally { Pop-Location }
        $database = ($verification -join "`n") | ConvertFrom-Json
        if ($database.database -ne 'guia_dinero_programable' -or $database.role -ne 'guia_dinero_programable' -or $database.rolsuper -or $database.rolcreatedb -or $database.rolcreaterole) {
            throw 'La base o los privilegios no están limitados a esta guía.'
        }
        $databaseMode = 'idempotent'
        $assertions.Add('La preparación DevBrain idempotente conserva la base y el rol exclusivo sin privilegios administrativos.')
    }

    $names = @($functions.Name | Sort-Object -Unique)
    $missing = @($names | Where-Object { -not $global:GuideCredentialFunctionHits.Contains($_) })
    if ($missing.Count) { throw "Faltan funciones por verificar: $($missing -join ', ')." }
    $report = @{ source=$ModulePath; metric='Funciones PowerShell por AST y entradas observadas con breakpoints nativos'; functions=$names; covered=@($global:GuideCredentialFunctionHits | Sort-Object); missing=$missing; functionCoverage=100 * ($names.Count-$missing.Count)/$names.Count; assertions=@($assertions); credentialManager=$credentialManager; localLevel=$localLevel; database=$databaseMode }
    $report | ConvertTo-Json -Depth 5 -Compress
} finally {
    try { [GuideCredentialTestProbe]::Delete($credentialTarget) } catch { if ($hasWorkspace) { throw } }
    foreach ($name in $localNames) { try { [GuideCredentialTestProbe]::Delete("$localPrefix/$name") } catch { if ($hasWorkspace) { throw } } }
    if ($listener) { $listener.Stop() }
    if ($workDirectory -and $workDirectory.StartsWith([IO.Path]::GetTempPath())) { Remove-Item -LiteralPath $workDirectory -Recurse -Force -ErrorAction SilentlyContinue }
    $breakpoints | Remove-PSBreakpoint
    Remove-Item Function:\Read-Host -ErrorAction SilentlyContinue
    Remove-Variable -Name GuideCredentialFunctionHits, GuideReadHostAnswers, GuideReadHostPrompts -Scope Global -ErrorAction SilentlyContinue
    foreach ($name in $variableNames) { [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process') }
    $value = $null
    $observed = $null
    $storedPassword = $null
    $adminSecret = $null
    $applicationPassword = $null
    $administrativePassword = $null
}
