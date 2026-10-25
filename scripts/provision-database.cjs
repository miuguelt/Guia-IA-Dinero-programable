const { Client } = require('pg');

async function provisionDatabase(env = process.env) {
  for (const name of ['GUIA_ADMIN_USER', 'GUIA_ADMIN_PASSWORD', 'GUIA_DB_USER', 'GUIA_DB_PASSWORD']) {
    if (!env[name]) throw new Error(`Falta la variable segura ${name}.`);
  }
  if (env.GUIA_DB_USER !== 'guia_dinero_programable') throw new Error('El rol solicitado no pertenece a esta guía.');
  const admin = new Client({ host: env.GUIA_DB_HOST || '127.0.0.1', port: Number(env.GUIA_DB_PORT || 5434), database: 'postgres',
    user: env.GUIA_ADMIN_USER, password: env.GUIA_ADMIN_PASSWORD, connectionTimeoutMillis: 5000 });
  await admin.connect();
  try {
    const roles = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [env.GUIA_DB_USER]);
    if (!roles.rowCount) {
      const quoted = await admin.query('SELECT quote_literal($1) AS password', [env.GUIA_DB_PASSWORD]);
      await admin.query(`CREATE ROLE guia_dinero_programable LOGIN PASSWORD ${quoted.rows[0].password} NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    }
    const database = await admin.query('SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1', ['guia_dinero_programable']);
    if (!database.rowCount) await admin.query('CREATE DATABASE guia_dinero_programable OWNER guia_dinero_programable');
    else if (database.rows[0].owner !== env.GUIA_DB_USER) throw new Error('La base existente tiene otro propietario; no se modificó.');
    return { database: 'guia_dinero_programable', role: 'guia_dinero_programable' };
  } finally { await admin.end(); }
}

async function runProvisionCli({ env = process.env, operator = process, logger = console } = {}) {
  try { await provisionDatabase(env); logger.log('Base exclusiva de la guía preparada.'); return true; }
  catch { logger.error('No se pudo preparar la base. Revisa permisos y credenciales de PostgreSQL en Windows.'); operator.exitCode = 1; return false; }
}

if (require.main === module) void runProvisionCli();

module.exports = { provisionDatabase, runProvisionCli };
