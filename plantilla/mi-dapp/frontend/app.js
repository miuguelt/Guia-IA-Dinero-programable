// Interfaz del registro de productos. Lee desde la API y ofrece dos formas de escribir:
// que firme la API (no necesitas billetera) o que firmes tú con la billetera del navegador.

/** Llama a la API y devuelve el JSON. Si la API responde con error, usa su mensaje. */
export async function pedirJson(pedir, ruta, { metodo = 'GET', cuerpo } = {}) {
  const opciones = { method: metodo };
  if (cuerpo !== undefined) {
    opciones.headers = { 'content-type': 'application/json' };
    opciones.body = JSON.stringify(cuerpo);
  }
  const respuesta = await pedir(ruta, opciones);
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'La API no pudo completar la operación.');
  return datos;
}

/** Estados de una operación: sin-datos, ejecucion, confirmado, pendiente y error. */
export function mostrarEstado(elemento, estado, mensaje) {
  elemento.dataset.estado = estado;
  elemento.textContent = mensaje;
}

function celda(documento, texto, clase) {
  const td = documento.createElement('td');
  td.textContent = texto;
  if (clase) td.className = clase;
  return td;
}

function boton(documento, texto, alPulsar) {
  const elemento = documento.createElement('button');
  elemento.type = 'button';
  elemento.className = 'secundario';
  elemento.textContent = texto;
  elemento.addEventListener('click', alPulsar);
  return elemento;
}

/** Construye una fila con textContent: lo que escriba un usuario nunca se interpreta como HTML. */
export function crearFila(documento, producto, { alCambiarPrecio, alDesactivar }) {
  const fila = documento.createElement('tr');
  fila.dataset.id = producto.id;
  fila.append(
    celda(documento, producto.id),
    celda(documento, producto.nombre),
    celda(documento, `$ ${producto.precio}`),
    celda(documento, producto.responsable, 'direccion'),
    celda(documento, producto.activo ? 'Activo' : 'Desactivado'),
  );
  const acciones = documento.createElement('td');
  if (producto.activo) {
    const grupo = documento.createElement('div');
    grupo.className = 'acciones-fila';
    const precio = documento.createElement('input');
    precio.inputMode = 'numeric';
    precio.setAttribute('aria-label', `Nuevo precio de ${producto.nombre}`);
    grupo.append(
      precio,
      boton(documento, 'Cambiar precio', () => alCambiarPrecio(producto.id, precio.value.trim())),
      boton(documento, 'Desactivar', () => alDesactivar(producto.id)),
    );
    acciones.append(grupo);
  } else {
    acciones.textContent = 'Sin acciones: su historial se conserva.';
  }
  fila.append(acciones);
  return fila;
}

export function iniciarInterfaz({ documento, pedir, billetera }) {
  const estado = documento.getElementById('estado');
  const lista = documento.getElementById('lista');
  const formulario = documento.getElementById('formulario');

  function datosFormulario() {
    return { nombre: formulario.elements.nombre.value.trim(), precio: formulario.elements.precio.value.trim() };
  }

  // Ejecuta una operación mostrando su estado. Un error nunca se oculta ni se convierte en éxito.
  async function intentar(mensajeEnCurso, operacion) {
    mostrarEstado(estado, 'ejecucion', mensajeEnCurso);
    try { await operacion(); }
    catch (error) { mostrarEstado(estado, 'error', error.message); }
  }

  async function pintarLista() {
    const productos = await pedirJson(pedir, '/api/productos');
    lista.replaceChildren(...productos.map(producto => crearFila(documento, producto, { alCambiarPrecio: cambiarPrecio, alDesactivar: desactivar })));
    return productos;
  }

  function cargar() {
    return intentar('Consultando los productos…', async () => {
      const productos = await pintarLista();
      if (productos.length) mostrarEstado(estado, 'confirmado', `Lista al día: ${productos.length} producto(s).`);
      else mostrarEstado(estado, 'sin-datos', 'Todavía no hay productos. Crea el primero con el formulario.');
    });
  }

  // Escribe a través de la API y espera el recibo antes de anunciar el resultado.
  function escribirConApi(mensajeEnCurso, ruta, opciones, mensajeFinal) {
    return intentar(mensajeEnCurso, async () => {
      const recibo = await pedirJson(pedir, ruta, opciones);
      await pintarLista();
      mostrarEstado(estado, 'confirmado', `${mensajeFinal} Bloque ${recibo.bloque}, transacción ${recibo.txHash}.`);
    });
  }

  function crearConApi() {
    return escribirConApi('La API está enviando la transacción…', '/api/productos', { metodo: 'POST', cuerpo: datosFormulario() }, 'Producto creado.');
  }

  function cambiarPrecio(id, precio) {
    return escribirConApi('La API está actualizando el precio…', `/api/productos/${id}`, { metodo: 'PATCH', cuerpo: { precio } }, 'Precio actualizado.');
  }

  function desactivar(id) {
    return escribirConApi('La API está desactivando el producto…', `/api/productos/${id}`, { metodo: 'DELETE' }, 'Producto desactivado.');
  }

  // La API prepara la transacción y la billetera del usuario la firma y la envía.
  function crearConBilletera() {
    return intentar('Preparando la transacción para tu billetera…', async () => {
      if (!billetera) throw new Error('No se encontró una billetera en este navegador. Instala una o usa «Crear con la API».');
      const preparada = await pedirJson(pedir, '/api/transacciones/crear', { metodo: 'POST', cuerpo: datosFormulario() });
      const [cuenta] = await billetera.request({ method: 'eth_requestAccounts' });
      const red = Number(await billetera.request({ method: 'eth_chainId' }));
      if (red !== preparada.chainId) {
        throw new Error(`Tu billetera está en la red ${red} y el contrato en la red ${preparada.chainId}. Cambia de red y vuelve a intentar.`);
      }
      mostrarEstado(estado, 'ejecucion', 'Confirma la transacción en tu billetera…');
      const hash = await billetera.request({ method: 'eth_sendTransaction', params: [{ from: cuenta, to: preparada.to, data: preparada.data }] });
      mostrarEstado(estado, 'pendiente', `Transacción enviada (${hash}). Cuando la red la confirme, pulsa «Actualizar lista».`);
    });
  }

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    return crearConApi();
  });
  documento.getElementById('crear-billetera').addEventListener('click', crearConBilletera);
  documento.getElementById('actualizar').addEventListener('click', cargar);

  return { cargar, crearConApi, crearConBilletera, cambiarPrecio, desactivar };
}

if (typeof document !== 'undefined') {
  iniciarInterfaz({ documento: document, pedir: globalThis.fetch.bind(globalThis), billetera: globalThis.ethereum }).cargar();
}
