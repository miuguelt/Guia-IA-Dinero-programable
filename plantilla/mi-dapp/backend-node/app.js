// API REST sobre el contrato. Cada ruta del CRUD que ya conoces llama a una función del contrato:
//   POST   /api/productos      → crear()            (transacción: cuesta gas, la firma la API)
//   GET    /api/productos      → proyección         (lectura rápida desde los eventos indexados)
//   GET    /api/productos/:id  → obtener()          (lectura directa del contrato, sin gas)
//   PATCH  /api/productos/:id  → actualizarPrecio() (transacción)
//   DELETE /api/productos/:id  → desactivar()       (transacción; no borra, marca inactivo)
const express = require('express');
const { sincronizar, proyectarProductos } = require('./indexador');

// Cada error del contrato se traduce a un código HTTP y a un mensaje que la interfaz puede mostrar.
const ERRORES_CONTRATO = {
  NombreVacio: [400, 'El nombre no puede estar vacío.'],
  ProductoInexistente: [404, 'Ese producto no existe.'],
  SoloResponsable: [403, 'Solo la cuenta que creó el producto puede modificarlo.'],
  ProductoInactivo: [409, 'El producto está desactivado y ya no se modifica.'],
};

class ErrorEntrada extends Error {}

function leerId(valor) {
  if (!/^[1-9]\d{0,29}$/.test(String(valor))) throw new ErrorEntrada('El id debe ser un entero positivo.');
  return BigInt(valor);
}

function leerPrecio(valor) {
  const valido = typeof valor === 'number' ? Number.isSafeInteger(valor) && valor >= 0 : typeof valor === 'string' && /^\d{1,30}$/.test(valor);
  if (!valido) throw new ErrorEntrada('El precio debe ser un entero mayor o igual a cero, sin decimales.');
  return BigInt(valor);
}

function leerNombre(valor) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > 80) {
    throw new ErrorEntrada('El nombre es obligatorio y admite hasta 80 caracteres.');
  }
  return valor.trim();
}

/** Busca el nombre del error personalizado con el que el contrato rechazó la operación. */
function nombreRevert(contrato, error) {
  if (error?.revert?.name) return error.revert.name;
  const datos = [error?.data, error?.error?.data, error?.info?.error?.data].find(dato => typeof dato === 'string' && dato.length >= 10);
  if (!datos) return null;
  try { return contrato.interface.parseError(datos)?.name ?? null; }
  catch { return null; }
}

function traducirError(contrato, error) {
  if (error instanceof ErrorEntrada) return { estado: 400, mensaje: error.message };
  if (error?.type === 'entity.parse.failed') return { estado: 400, mensaje: 'El cuerpo de la petición debe ser JSON válido.' };
  const conocido = ERRORES_CONTRATO[nombreRevert(contrato, error)];
  if (conocido) return { estado: conocido[0], mensaje: conocido[1] };
  return { estado: 502, mensaje: 'La red no respondió o rechazó la operación. Revisa el nodo y vuelve a intentar.' };
}

function crearApp({ contrato, repositorio, despliegue, carpetaWeb }) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  let desdeBloque = despliegue.bloque ?? 0;

  // Trae los eventos nuevos a la proyección. Volver a leer el último bloque no duplica nada.
  async function actualizarProyeccion() {
    const resultado = await sincronizar({ contrato, repositorio, desdeBloque });
    desdeBloque = resultado.hastaBloque;
    return resultado;
  }

  // Una transacción no está hecha al enviarla: se responde solo cuando la red entrega el recibo.
  async function confirmar(envio) {
    const transaccion = await envio;
    const recibo = await transaccion.wait();
    await actualizarProyeccion();
    return recibo;
  }

  app.get('/api/salud', async (_req, res) => {
    res.json({ contrato: despliegue.direccion, chainId: despliegue.chainId, cuentaApi: await contrato.runner.getAddress() });
  });

  app.get('/api/productos', async (_req, res) => {
    await actualizarProyeccion();
    res.json(proyectarProductos(await repositorio.listarEventos()));
  });

  app.get('/api/eventos', async (_req, res) => {
    await actualizarProyeccion();
    res.json(await repositorio.listarEventos());
  });

  app.get('/api/productos/:id', async (req, res) => {
    const id = leerId(req.params.id);
    const producto = await contrato.obtener(id);
    res.json({ id: id.toString(), nombre: producto.nombre, precio: producto.precio.toString(), responsable: producto.responsable, activo: producto.activo });
  });

  app.post('/api/productos', async (req, res) => {
    const recibo = await confirmar(contrato.crear(leerNombre(req.body?.nombre), leerPrecio(req.body?.precio)));
    const id = contrato.interface.parseLog(recibo.logs[0]).args.id.toString();
    res.status(201).json({ id, txHash: recibo.hash, bloque: recibo.blockNumber });
  });

  app.patch('/api/productos/:id', async (req, res) => {
    const recibo = await confirmar(contrato.actualizarPrecio(leerId(req.params.id), leerPrecio(req.body?.precio)));
    res.json({ id: req.params.id, txHash: recibo.hash, bloque: recibo.blockNumber });
  });

  app.delete('/api/productos/:id', async (req, res) => {
    const recibo = await confirmar(contrato.desactivar(leerId(req.params.id)));
    res.json({ id: req.params.id, txHash: recibo.hash, bloque: recibo.blockNumber });
  });

  // Para que el usuario firme con su propia billetera, la API solo prepara la transacción:
  // a qué contrato va y qué función llama. No la firma ni la envía.
  app.post('/api/transacciones/crear', (req, res) => {
    const datos = contrato.interface.encodeFunctionData('crear', [leerNombre(req.body?.nombre), leerPrecio(req.body?.precio)]);
    res.json({ to: despliegue.direccion, data: datos, chainId: despliegue.chainId });
  });

  app.use(express.static(carpetaWeb));

  app.use((error, _req, res, _next) => {
    const { estado, mensaje } = traducirError(contrato, error);
    res.status(estado).json({ error: mensaje });
  });

  return app;
}

module.exports = { ERRORES_CONTRATO, ErrorEntrada, leerId, leerPrecio, leerNombre, nombreRevert, traducirError, crearApp };
