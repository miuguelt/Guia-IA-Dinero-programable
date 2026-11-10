// Proyección en PostgreSQL (nivel completo): la base responde consultas rápidas
// y la cadena conserva la verdad. La conexión llega solo por variables de entorno.
const fs = require('node:fs');
const path = require('node:path');

const ESQUEMA_SQL = fs.readFileSync(path.join(__dirname, '..', 'sql', '001_eventos_productos.sql'), 'utf8');

function crearPoolDesdeEntorno(entorno = process.env) {
  if (!entorno.DATABASE_URL) throw new Error('Define DATABASE_URL para usar PostgreSQL.');
  const { Pool } = require('pg');
  const opciones = { connectionString: entorno.DATABASE_URL };
  if (entorno.DATABASE_SCHEMA) {
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(entorno.DATABASE_SCHEMA)) {
      throw new Error('DATABASE_SCHEMA solo admite minúsculas, números y guion bajo.');
    }
    opciones.options = `-c search_path=${entorno.DATABASE_SCHEMA}`;
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

  /** ON CONFLICT DO NOTHING: si el evento ya estaba, la base lo ignora sin error. */
  async guardarEvento(evento) {
    const resultado = await this.pool.query(
      `INSERT INTO eventos_productos (tx_hash, log_index, bloque, tipo, id_producto, cuenta, nombre, precio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [evento.txHash, evento.logIndex, evento.bloque, evento.tipo, evento.idProducto, evento.cuenta, evento.nombre, evento.precio],
    );
    return resultado.rowCount === 1;
  }

  async listarEventos() {
    const { rows } = await this.pool.query(
      `SELECT tx_hash, log_index, bloque, tipo, id_producto, cuenta, nombre, precio
       FROM eventos_productos ORDER BY bloque, log_index`,
    );
    return rows.map(fila => ({
      txHash: fila.tx_hash,
      logIndex: fila.log_index,
      bloque: Number(fila.bloque),
      tipo: fila.tipo,
      idProducto: fila.id_producto,
      cuenta: fila.cuenta,
      nombre: fila.nombre,
      precio: fila.precio,
    }));
  }

  async vaciar() {
    await this.pool.query('TRUNCATE eventos_productos');
  }
}

module.exports = { ESQUEMA_SQL, crearPoolDesdeEntorno, RepositorioPostgres };
