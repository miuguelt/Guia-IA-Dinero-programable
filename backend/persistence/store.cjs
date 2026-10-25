const { Pool } = require('pg');
const { schema } = require('./schema.cjs');
const { createEventStore } = require('./event-store.cjs');
const { createCredentialStore } = require('./credential-store.cjs');

function ensureLocalCredentials() {
  if (process.env.GUIA_DB_USER && process.env.GUIA_DB_PASSWORD) return;
  try {
    const { ensureCredentials } = require('../../scripts/load-env.cjs');
    ensureCredentials();
  } catch {}
}

function createStore(config = {}) {
  ensureLocalCredentials();
  const pool = config.pool || new Pool({
    host: process.env.GUIA_DB_HOST || '127.0.0.1', port: Number(process.env.GUIA_DB_PORT || 5434),
    database: 'guia_dinero_programable', user: process.env.GUIA_DB_USER,
    password: process.env.GUIA_DB_PASSWORD, connectionTimeoutMillis: 1500, max: 4, ...config
  });
  async function initialize() {
    const { rows } = await pool.query('SELECT current_database() AS name');
    if (rows[0].name !== 'guia_dinero_programable') throw Object.assign(new Error('Usa la base exclusiva guia_dinero_programable antes de inicializar las tablas.'), { code: 'DATABASE_SCOPE' });
    await pool.query(schema);
    return { initialized: true, database: rows[0].name };
  }
  async function health() {
    try {
      const { rows } = await pool.query('SELECT current_database() AS name');
      return { connected: rows[0].name === 'guia_dinero_programable', database: rows[0].name };
    } catch {
      return { connected: false, code: 'DATABASE_UNAVAILABLE', message: 'Verifica PostgreSQL en 5434 y las variables GUIA_DB_USER y GUIA_DB_PASSWORD.' };
    }
  }
  async function close() { await pool.end(); }
  return { initialize, health, ...createEventStore(pool), ...createCredentialStore(pool), close };
}
module.exports = { createStore };
