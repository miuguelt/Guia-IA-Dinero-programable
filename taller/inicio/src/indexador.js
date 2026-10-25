// Etapa 5: indexador de eventos.
// Lee los logs inmutables emitidos por el contrato y actualiza la proyección.
// Permite sincronización continua y reconstrucción total del estado desde cero.
const TIPOS_EVENTO = ['GarantiaDepositada', 'PagoAutorizado', 'PagoRetirado'];

/**
 * Transforma un log crudo de la red en un DTO normalizado para la proyección.
 */
function aEvento(log) {
  const tipo = log.fragment.name;
  return {
    txHash: log.transactionHash,
    logIndex: log.index,
    bloque: log.blockNumber,
    tipo,
    idLote: tipo === 'PagoAutorizado' ? log.args.idLote.toString() : null,
    cuenta: tipo === 'GarantiaDepositada' ? log.args.depositante : log.args.productor,
    // Los montos en wei se manipulan como cadenas para no perder precisión en JavaScript
    montoWei: log.args.monto.toString(),
  };
}

/**
 * Filtra y recopila los logs de eventos emitidos desde un bloque determinado.
 */
async function leerEventos(contrato, desdeBloque = 0) {
  const logs = [];
  for (const tipo of TIPOS_EVENTO) {
    logs.push(...await contrato.queryFilter(contrato.filters[tipo](), desdeBloque));
  }
  return logs.map(aEvento).sort((a, b) => a.bloque - b.bloque || a.logIndex - b.logIndex);
}

/**
 * Lee eventos y los inserta en el repositorio (memoria o PostgreSQL).
 * Devuelve cuántos eventos se leyeron y cuántos fueron efectivamente nuevos.
 */
async function sincronizar({ contrato, repositorio, desdeBloque = 0 }) {
  const eventos = await leerEventos(contrato, desdeBloque);
  let nuevos = 0;
  for (const evento of eventos) {
    if (await repositorio.guardarEvento(evento)) nuevos += 1;
  }
  return { leidos: eventos.length, nuevos };
}

/**
 * Demuestra la resiliencia del modelo CQRS:
 * Si la base de datos se borra o corrompe, se reconstruye íntegramente
 * a partir de la fuente canónica de verdad (la blockchain).
 */
async function reconstruir({ contrato, repositorio }) {
  await repositorio.vaciar();
  return sincronizar({ contrato, repositorio, desdeBloque: 0 });
}

module.exports = { TIPOS_EVENTO, aEvento, leerEventos, sincronizar, reconstruir };
