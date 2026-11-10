// Proyección en memoria (nivel mínimo): sirve para aprender sin instalar PostgreSQL.
// Se pierde al apagar la API y se reconstruye sola desde los eventos de la cadena.
class RepositorioMemoria {
  constructor() {
    this.eventos = new Map();
  }

  /** Devuelve true si el evento era nuevo y false si ya estaba guardado. */
  async guardarEvento(evento) {
    const clave = `${evento.txHash}:${evento.logIndex}`;
    if (this.eventos.has(clave)) return false;
    this.eventos.set(clave, { ...evento });
    return true;
  }

  async listarEventos() {
    return [...this.eventos.values()].sort((a, b) => a.bloque - b.bloque || a.logIndex - b.logIndex);
  }

  async vaciar() {
    this.eventos.clear();
  }
}

module.exports = { RepositorioMemoria };
