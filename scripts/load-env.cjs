const { execFileSync } = require('node:child_process');
const path = require('node:path');

function ensureCredentials() {
  if (process.env.GUIA_DB_USER && process.env.GUIA_DB_PASSWORD && process.env.GUIA_ADMIN_USER) {
    return;
  }
  try {
    const script = path.resolve(__dirname, 'guide-credentials.ps1');
    const psCommand = [
      `. '${script.replace(/'/g, "''")}';`,
      'Import-GuideCredentials;',
      'Import-GuideAdminCredentials;',
      '@($env:GUIA_DB_USER, $env:GUIA_DB_PASSWORD, $env:GUIA_ADMIN_USER, $env:GUIA_ADMIN_PASSWORD) -join ":::"'
    ].join(' ');

    const out = execFileSync('pwsh', ['-NoProfile', '-Command', psCommand], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000
    }).trim();

    const [user, pass, adminUser, adminPass] = out.split(':::');
    if (user && !process.env.GUIA_DB_USER) process.env.GUIA_DB_USER = user;
    if (pass && !process.env.GUIA_DB_PASSWORD) process.env.GUIA_DB_PASSWORD = pass;
    if (adminUser && !process.env.GUIA_ADMIN_USER) process.env.GUIA_ADMIN_USER = adminUser;
    if (adminPass && !process.env.GUIA_ADMIN_PASSWORD) process.env.GUIA_ADMIN_PASSWORD = adminPass;
    if (!process.env.GUIA_DB_HOST) process.env.GUIA_DB_HOST = '127.0.0.1';
    if (!process.env.GUIA_DB_PORT) process.env.GUIA_DB_PORT = '5434';
  } catch {
    // Si no está disponible pwsh o las credenciales, continúa sin alterar process.env
  }
}

ensureCredentials();

module.exports = { ensureCredentials };
