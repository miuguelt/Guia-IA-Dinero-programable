// Etapa 5 (nivel mínimo): proyección en memoria.
// Simula la tabla SQL utilizando una clave compuesta única (${txHash}:${logIndex})
// para asegurar que ningún evento se procese dos veces (idempotencia).
class RepositorioMemoria {
  constructor() {
    this.eventos = new Map();
  }

  /**
   * Guarda un evento si no existía previamente.
   * @param {Object} evento 
   * @returns {Promise<boolean>} true si se insertó, false si ya existía.
   */
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
