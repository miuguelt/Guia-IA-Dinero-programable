// Etapa 5 (nivel completo): proyección en PostgreSQL.
// La base de datos relacional actúa como vista de lectura (CQRS) alimentada por eventos.
// La conexión se obtiene exclusivamente de variables de entorno de forma segura.
const fs = require('node:fs');
const path = require('node:path');

const ESQUEMA_SQL = fs.readFileSync(path.join(__dirname, '..', 'sql', '001_proyeccion.sql'), 'utf8');

function crearPoolDesdeEntorno(entorno = process.env) {
  if (!entorno.TALLER_DATABASE_URL) {
    throw new Error('Define TALLER_DATABASE_URL para usar PostgreSQL (nivel completo).');
  }
  const { Pool } = require('pg');
  const opciones = { connectionString: entorno.TALLER_DATABASE_URL };
  if (entorno.TALLER_DATABASE_SCHEMA) {
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(entorno.TALLER_DATABASE_SCHEMA)) {
      throw new Error('TALLER_DATABASE_SCHEMA solo admite minúsculas, números y guion bajo.');
    }
    opciones.options = `-c search_path=${entorno.TALLER_DATABASE_SCHEMA}`;
  }
  return new Pool(opciones);
}

class RepositorioPostgres {
  constructor(pool) {
    this.pool = pool;
  }

  async preparar() {
    await this.pool.query(ESQUEMA_SQL);
  }

  /**
   * Inserta el evento en PostgreSQL usando ON CONFLICT DO NOTHING.
   * Si la transacción y el índice ya fueron registrados, la base de datos lo ignora pacíficamente.
   */
  async guardarEvento(evento) {
    const resultado = await this.pool.query(
      `INSERT INTO eventos_agropay (tx_hash, log_index, bloque, tipo, id_lote, cuenta, monto_wei)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [evento.txHash, evento.logIndex, evento.bloque, evento.tipo, evento.idLote, evento.cuenta, evento.montoWei],
    );
    return resultado.rowCount === 1;
  }

  async listarEventos() {
    const { rows } = await this.pool.query(
      `SELECT tx_hash, log_index, bloque, tipo, id_lote, cuenta, monto_wei
       FROM eventos_agropay ORDER BY bloque, log_index`,
    );
    return rows.map(fila => ({
      txHash: fila.tx_hash,
      logIndex: fila.log_index,
      bloque: Number(fila.bloque),
      tipo: fila.tipo,
      idLote: fila.id_lote,
      cuenta: fila.cuenta,
      montoWei: fila.monto_wei,
    }));
  }

  async vaciar() {
    await this.pool.query('TRUNCATE eventos_agropay');
  }
}

module.exports = { ESQUEMA_SQL, crearPoolDesdeEntorno, RepositorioPostgres };
