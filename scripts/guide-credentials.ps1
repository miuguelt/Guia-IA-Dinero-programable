#Requires -Version 7.0
$guideWorkspace = $PSScriptRoot
while ($guideWorkspace -and -not (Test-Path -LiteralPath (Join-Path $guideWorkspace 'AI-SESSION-BRIEF.md'))) {
    $guideWorkspace = Split-Path -Parent $guideWorkspace
}
if ($guideWorkspace) { . (Join-Path $guideWorkspace '_infrastructure\devbraind\scripts\Get-DevBrainSecret.ps1') }

function Use-GuideCredentialStore {
    if ('GuideCredentialStore' -as [type]) { return }
    Add-Type @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class GuideCredentialStore {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct Credential {
        public int Flags; public int Type; public string TargetName; public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
        public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
    }
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool CredWrite(ref Credential credential, int flags);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool CredRead(string target, int type, int flags, out IntPtr pointer);
    [DllImport("advapi32.dll")] static extern void CredFree(IntPtr pointer);
    public static void Save(string target, string userName, string value) {
        var pointer = Marshal.StringToCoTaskMemUni(value);
        try {
            var credential = new Credential { Type=1, TargetName=target, UserName=userName,
                CredentialBlobSize=value.Length*2, CredentialBlob=pointer, Persist=2 };
            if (!CredWrite(ref credential, 0)) throw new InvalidOperationException("No se pudo guardar la credencial de la guía.");
        } finally { Marshal.ZeroFreeCoTaskMemUnicode(pointer); }
    }
    public static string Read(string target) {
        IntPtr pointer;
        if (!CredRead(target, 1, 0, out pointer)) {
            int error = Marshal.GetLastWin32Error();
            if (error == 1168) return null;
            throw new Win32Exception(error, "No se pudo leer la credencial de la guía.");
        }
        try {
            Credential value = Marshal.PtrToStructure<Credential>(pointer);
            return Marshal.PtrToStringUni(value.CredentialBlob, value.CredentialBlobSize / 2);
        } finally { CredFree(pointer); }
    }
}
'@
}

function Get-GuideCredentialTarget {
    param([Parameter(Mandatory)][string]$Name)
    # GUIA_CREDENTIAL_PREFIX solo existe para que las pruebas usen destinos efímeros propios.
    $prefix = if ($env:GUIA_CREDENTIAL_PREFIX) { $env:GUIA_CREDENTIAL_PREFIX } else { 'GuiaDinero' }
    if ($prefix -notmatch '^GuiaDinero[A-Za-z0-9_-]*$') { throw 'El prefijo de credenciales no pertenece a esta guía.' }
    "$prefix/$Name"
}

function Save-GuideCredential {
    param([string]$Name, [string]$Value, [switch]$Local)
    Use-GuideCredentialStore
    if ($Local) { [GuideCredentialStore]::Save((Get-GuideCredentialTarget -Name $Name), 'GuiaDinero', $Value) }
    else { [GuideCredentialStore]::Save("DevBrain/$Name", 'DevBrainSystem', $Value) }
}

function Read-GuideCredential {
    param([Parameter(Mandatory)][string]$Name)
    Use-GuideCredentialStore
    [GuideCredentialStore]::Read((Get-GuideCredentialTarget -Name $Name))
}

function Read-GuideSetting {
    param([Parameter(Mandatory)][string]$Prompt, [string]$Default, [switch]$Secret)
    if ($Secret) {
        $value = [Net.NetworkCredential]::new('', (Read-Host -Prompt $Prompt -AsSecureString)).Password
    } else {
        $label = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
        $value = "$(Read-Host -Prompt $label)".Trim()
    }
    if (-not $value) { $value = $Default }
    if (-not $value) { throw "Falta un dato obligatorio: $Prompt." }
    $value
}

function Test-GuideDatabaseConnection {
    param([Parameter(Mandatory)][string]$Server, [Parameter(Mandatory)][int]$Port, [int]$TimeoutMilliseconds = 3000)
    $client = [Net.Sockets.TcpClient]::new()
    try { $client.ConnectAsync($Server, $Port).Wait($TimeoutMilliseconds) }
    catch { $false }
    finally { $client.Dispose() }
}

function Import-GuideCredentials {
    if ($env:GUIA_DB_USER -and $env:GUIA_DB_PASSWORD) { return }
    if ($guideWorkspace) {
        $env:GUIA_DB_USER = Get-DevBrainSecret -Name 'GUIA_DINERO_DB_USER'
        $env:GUIA_DB_PASSWORD = Get-DevBrainSecret -Name 'GUIA_DINERO_DB_PASSWORD'
        return
    }
    $user = Read-GuideCredential -Name 'DB_USER'
    $password = Read-GuideCredential -Name 'DB_PASSWORD'
    if (-not $user -or -not $password) {
        throw 'No hay credenciales guardadas de la guía. Ejecuta .\start-windows.ps1 -InitializeDatabase para preparar tu PostgreSQL.'
    }
    $env:GUIA_DB_USER = $user
    $env:GUIA_DB_PASSWORD = $password
    if (-not $env:GUIA_DB_HOST) { $env:GUIA_DB_HOST = (Read-GuideCredential -Name 'DB_HOST') ?? '127.0.0.1' }
    if (-not $env:GUIA_DB_PORT) { $env:GUIA_DB_PORT = (Read-GuideCredential -Name 'DB_PORT') ?? '5432' }
}

function Import-GuideAdminCredentials {
    if ($env:GUIA_ADMIN_USER -and $env:GUIA_ADMIN_PASSWORD) { return }
    if ($guideWorkspace) {
        $env:GUIA_ADMIN_USER = Get-DevBrainSecret -Name 'PG_USER'
        $env:GUIA_ADMIN_PASSWORD = Get-DevBrainSecret -Name 'PG_PASSWORD'
        return
    }
    # La clave administrativa se pide en cada preparación y nunca se guarda.
    $env:GUIA_ADMIN_USER = Read-GuideSetting -Prompt 'Usuario administrador de PostgreSQL' -Default 'postgres'
    $env:GUIA_ADMIN_PASSWORD = Read-GuideSetting -Prompt 'Contraseña del administrador de PostgreSQL' -Secret
}

function Initialize-GuideDatabase {
    param([string]$ProvisionScript = (Join-Path $PSScriptRoot 'provision-database.cjs'))
    if ($guideWorkspace) {
        $env:GUIA_ADMIN_USER = Get-DevBrainSecret -Name 'PG_USER'
        $env:GUIA_ADMIN_PASSWORD = Get-DevBrainSecret -Name 'PG_PASSWORD'
        $env:GUIA_DB_USER = 'guia_dinero_programable'
        try { $env:GUIA_DB_PASSWORD = Get-DevBrainSecret -Name 'GUIA_DINERO_DB_PASSWORD' }
        catch { $env:GUIA_DB_PASSWORD = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48)) }
        try {
            & node $ProvisionScript
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la base exclusiva de la guía.' }
            Save-GuideCredential -Name 'GUIA_DINERO_DB_USER' -Value $env:GUIA_DB_USER
            Save-GuideCredential -Name 'GUIA_DINERO_DB_PASSWORD' -Value $env:GUIA_DB_PASSWORD
        } finally {
            Remove-Item Env:GUIA_ADMIN_USER, Env:GUIA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
        }
        return
    }
    try {
        if (-not $env:GUIA_DB_HOST) {
            $env:GUIA_DB_HOST = Read-GuideSetting -Prompt 'Servidor de PostgreSQL' -Default ((Read-GuideCredential -Name 'DB_HOST') ?? '127.0.0.1')
        }
        if (-not $env:GUIA_DB_PORT) {
            $env:GUIA_DB_PORT = Read-GuideSetting -Prompt 'Puerto de PostgreSQL' -Default ((Read-GuideCredential -Name 'DB_PORT') ?? '5432')
        }
        $port = 0
        if (-not [int]::TryParse($env:GUIA_DB_PORT, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
            throw 'El puerto de PostgreSQL debe ser un número entre 1 y 65535.'
        }
        if (-not (Test-GuideDatabaseConnection -Server $env:GUIA_DB_HOST -Port $port)) {
            throw "PostgreSQL no responde en $($env:GUIA_DB_HOST):$port. Inicia el servicio de PostgreSQL en Windows o corrige el servidor y el puerto, y vuelve a ejecutar la preparación."
        }
        Import-GuideAdminCredentials
        $env:GUIA_DB_USER = 'guia_dinero_programable'
        $env:GUIA_DB_PASSWORD = (Read-GuideCredential -Name 'DB_PASSWORD') ?? [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
        & node $ProvisionScript
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la base exclusiva de la guía. Revisa el usuario y la contraseña del administrador de PostgreSQL.' }
        Save-GuideCredential -Local -Name 'DB_USER' -Value $env:GUIA_DB_USER
        Save-GuideCredential -Local -Name 'DB_PASSWORD' -Value $env:GUIA_DB_PASSWORD
        Save-GuideCredential -Local -Name 'DB_HOST' -Value $env:GUIA_DB_HOST
        Save-GuideCredential -Local -Name 'DB_PORT' -Value "$port"
    } finally {
        Remove-Item Env:GUIA_ADMIN_USER, Env:GUIA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    }
}
