// Indexador: copia los eventos del contrato a una proyección de lectura.
// La cadena es la fuente de verdad; la proyección se puede borrar y reconstruir.
const TIPOS_EVENTO = ['ProductoCreado', 'PrecioActualizado', 'ProductoDesactivado'];

/** Convierte un log de la red en un registro plano. Los números viajan como texto para no perder precisión. */
function aEvento(log) {
  const tipo = log.fragment.name;
  const base = { txHash: log.transactionHash, logIndex: log.index, bloque: log.blockNumber, tipo, idProducto: log.args.id.toString() };
  if (tipo === 'ProductoCreado') return { ...base, cuenta: log.args.responsable, nombre: log.args.nombre, precio: log.args.precio.toString() };
  if (tipo === 'PrecioActualizado') return { ...base, cuenta: null, nombre: null, precio: log.args.precioNuevo.toString() };
  return { ...base, cuenta: log.args.responsable, nombre: null, precio: null };
}

function enOrden(a, b) {
  return a.bloque - b.bloque || a.logIndex - b.logIndex;
}

async function leerEventos(contrato, desdeBloque = 0) {
  const logs = [];
  for (const tipo of TIPOS_EVENTO) logs.push(...await contrato.queryFilter(contrato.filters[tipo](), desdeBloque));
  return logs.map(aEvento).sort(enOrden);
}

/** Lee eventos desde un bloque y guarda solo los nuevos. Repetirlo no duplica nada. */
async function sincronizar({ contrato, repositorio, desdeBloque = 0 }) {
  const eventos = await leerEventos(contrato, desdeBloque);
  let nuevos = 0;
  for (const evento of eventos) {
    if (await repositorio.guardarEvento(evento)) nuevos += 1;
  }
  return { leidos: eventos.length, nuevos, hastaBloque: eventos.length ? eventos.at(-1).bloque : desdeBloque };
}

async function reconstruir({ contrato, repositorio }) {
  await repositorio.vaciar();
  return sincronizar({ contrato, repositorio, desdeBloque: 0 });
}

/** Arma la lista actual de productos recorriendo los eventos en orden, como un SELECT sobre el historial. */
function proyectarProductos(eventos) {
  const productos = new Map();
  for (const evento of [...eventos].sort(enOrden)) {
    if (evento.tipo === 'ProductoCreado') {
      productos.set(evento.idProducto, { id: evento.idProducto, nombre: evento.nombre, precio: evento.precio, responsable: evento.cuenta, activo: true, cambios: 1 });
      continue;
    }
    const producto = productos.get(evento.idProducto);
    if (!producto) continue;
    if (evento.tipo === 'PrecioActualizado') producto.precio = evento.precio;
    else producto.activo = false;
    producto.cambios += 1;
  }
  return [...productos.values()];
}

module.exports = { TIPOS_EVENTO, aEvento, leerEventos, sincronizar, reconstruir, proyectarProductos };
