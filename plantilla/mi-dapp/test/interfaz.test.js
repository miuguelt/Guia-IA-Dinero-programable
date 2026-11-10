// Pruebas de la interfaz: el HTML real en jsdom, conectado a la API real y al contrato real.
const { expect } = require('chai');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const hre = require('hardhat');
const { levantarApi } = require('./apoyo');

const CARPETA = path.join(__dirname, '..', 'frontend');
const HTML = fs.readFileSync(path.join(CARPETA, 'index.html'), 'utf8');

/** Billetera de práctica: responde como la del navegador y firma con una cuenta de Hardhat. */
function billeteraDePractica(cuenta, { chainId = 31337 } = {}) {
  return {
    async request({ method, params }) {
      if (method === 'eth_requestAccounts') return [cuenta];
      if (method === 'eth_chainId') return '0x' + chainId.toString(16);
      return hre.network.provider.send(method, params);
    },
  };
}

describe('Interfaz web', () => {
  let app, modulo, documento, estado, interfaz;

  async function abrir(billetera) {
    documento = new JSDOM(HTML).window.document;
    estado = documento.getElementById('estado');
    interfaz = modulo.iniciarInterfaz({ documento, pedir: app.pedir, billetera });
    await interfaz.cargar();
  }

  /** Espera a que termine la operación que inició un clic o un envío de formulario. */
  async function alTerminar() {
    for (let intento = 0; intento < 400 && estado.dataset.estado === 'ejecucion'; intento++) {
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    expect(estado.dataset.estado).to.not.equal('ejecucion');
  }

  function escribirFormulario(nombre, precio) {
    documento.getElementById('nombre').value = nombre;
    documento.getElementById('precio').value = precio;
  }

  const filas = () => [...documento.querySelectorAll('#lista tr')].map(fila => [...fila.children].slice(0, 5).map(celda => celda.textContent));

  before(async () => { modulo = await import(pathToFileURL(path.join(CARPETA, 'app.js')).href); });
  beforeEach(async () => { app = await levantarApi(); });
  afterEach(async () => { await app.cerrar(); });

  it('sin productos muestra el estado sin datos y qué hacer', async () => {
    await abrir();
    expect(estado.dataset.estado).to.equal('sin-datos');
    expect(estado.textContent).to.match(/Crea el primero/);
    expect(filas()).to.deep.equal([]);
  });

  it('el formulario crea con la API y anuncia el resultado solo con el recibo', async () => {
    await abrir();
    escribirFormulario('Café', '12000');
    const envio = new documento.defaultView.Event('submit', { cancelable: true });
    documento.getElementById('formulario').dispatchEvent(envio);
    expect(envio.defaultPrevented).to.equal(true);
    expect(estado.dataset.estado).to.equal('ejecucion');
    await alTerminar();
    expect(estado.dataset.estado).to.equal('confirmado');
    expect(estado.textContent).to.match(/Producto creado\. Bloque \d+, transacción 0x[0-9a-f]{64}\./);
    expect(filas()).to.deep.equal([['1', 'Café', '$ 12000', app.cuentaApi, 'Activo']]);
  });

  it('los botones de la fila cambian el precio y desactivan el producto', async () => {
    await app.llamar('POST', '/api/productos', { nombre: 'Café', precio: 12000 });
    await abrir();
    expect(estado.textContent).to.equal('Lista al día: 1 producto(s).');
    const [precio, cambiar] = documento.querySelectorAll('#lista input, #lista button');
    expect(precio.getAttribute('aria-label')).to.equal('Nuevo precio de Café');
    precio.value = ' 13500 ';
    cambiar.click();
    await alTerminar();
    expect(estado.textContent).to.match(/^Precio actualizado\./);
    expect(filas()[0][2]).to.equal('$ 13500');

    documento.querySelectorAll('#lista button')[1].click();
    await alTerminar();
    expect(estado.textContent).to.match(/^Producto desactivado\./);
    expect(filas()[0][4]).to.equal('Desactivado');
    expect(documento.querySelector('#lista button')).to.equal(null);
    expect(documento.querySelector('#lista td:last-child').textContent).to.match(/su historial se conserva/);
  });

  it('muestra el mensaje de la API cuando la entrada es inválida y no cambia la lista', async () => {
    await abrir();
    escribirFormulario('Café', 'doce');
    await interfaz.crearConApi();
    expect(estado.dataset.estado).to.equal('error');
    expect(estado.textContent).to.match(/precio debe ser un entero/);
    expect(filas()).to.deep.equal([]);
  });

  it('un nombre con etiquetas se muestra como texto y no como HTML', async () => {
    await app.llamar('POST', '/api/productos', { nombre: '<img src=x onerror=alert(1)>', precio: 1 });
    await abrir();
    expect(filas()[0][1]).to.equal('<img src=x onerror=alert(1)>');
    expect(documento.querySelector('#lista img')).to.equal(null);
  });

  it('con la billetera el producto queda a nombre del usuario y el estado es pendiente hasta actualizar', async () => {
    const [, usuaria] = await hre.ethers.getSigners();
    await abrir(billeteraDePractica(usuaria.address));
    escribirFormulario('Miel', '20000');
    documento.getElementById('crear-billetera').click();
    await alTerminar();
    expect(estado.dataset.estado).to.equal('pendiente');
    expect(estado.textContent).to.match(/Transacción enviada \(0x[0-9a-f]{64}\)\. Cuando la red la confirme, pulsa «Actualizar lista»\./);

    documento.getElementById('actualizar').click();
    await alTerminar();
    expect(filas()).to.deep.equal([['1', 'Miel', '$ 20000', usuaria.address, 'Activo']]);

    await interfaz.cambiarPrecio('1', '1');
    expect(estado.dataset.estado).to.equal('error');
    expect(estado.textContent).to.equal('Solo la cuenta que creó el producto puede modificarlo.');
  });

  it('explica cómo seguir si no hay billetera o si está en otra red', async () => {
    await abrir();
    escribirFormulario('Miel', '20000');
    await interfaz.crearConBilletera();
    expect(estado.dataset.estado).to.equal('error');
    expect(estado.textContent).to.match(/No se encontró una billetera/);

    const [, usuaria] = await hre.ethers.getSigners();
    await abrir(billeteraDePractica(usuaria.address, { chainId: 1 }));
    escribirFormulario('Miel', '20000');
    await interfaz.crearConBilletera();
    expect(estado.textContent).to.equal('Tu billetera está en la red 1 y el contrato en la red 31337. Cambia de red y vuelve a intentar.');
    expect((await app.llamar('GET', '/api/productos')).datos).to.deep.equal([]);
  });

  it('usa un mensaje propio si la API falla sin explicar el motivo', async () => {
    const pedir = async () => ({ ok: false, json: async () => ({}) });
    await expect(modulo.pedirJson(pedir, '/api/productos')).to.be.rejectedWith('La API no pudo completar la operación.');
  });
});
