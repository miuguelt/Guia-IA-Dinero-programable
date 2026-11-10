// Apoyo de las pruebas: levanta la API real contra la red de Hardhat que corre dentro de la prueba.
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const hre = require('hardhat');
const { desplegar } = require('../scripts/desplegar');
const { iniciar } = require('../backend-node/servidor');

/** Expone la red en memoria de Hardhat por HTTP, igual que `npm run nodo`, en un puerto libre. */
async function puenteRpc({ autorizacion } = {}) {
  async function responder({ id, method, params }) {
    try { return { jsonrpc: '2.0', id, result: await hre.network.provider.send(method, params ?? []) }; }
    catch (error) { return { jsonrpc: '2.0', id, error: { code: error.code ?? -32000, message: error.message, data: error.data } }; }
  }
  const servidor = http.createServer(async (peticion, respuesta) => {
    let cuerpo = '';
    for await (const trozo of peticion) cuerpo += trozo;
    if (autorizacion && peticion.headers.authorization !== autorizacion) {
      respuesta.statusCode = 401;
      return respuesta.end('401 Unauthorized');
    }
    const llamada = JSON.parse(cuerpo);
    const salida = Array.isArray(llamada) ? await Promise.all(llamada.map(responder)) : await responder(llamada);
    respuesta.setHeader('content-type', 'application/json');
    respuesta.end(JSON.stringify(salida));
  });
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${servidor.address().port}`,
    cerrar: () => { servidor.closeAllConnections(); return new Promise(resolve => servidor.close(resolve)); },
  };
}

function carpetaTemporal() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mi-dapp-'));
}

/** Crea una cuenta nueva para la API y le envía saldo de práctica: ninguna clave queda escrita en el código. */
async function cuentaConSaldo() {
  const cuenta = hre.ethers.Wallet.createRandom();
  const [origen] = await hre.ethers.getSigners();
  await (await origen.sendTransaction({ to: cuenta.address, value: hre.ethers.parseEther('10') })).wait();
  return cuenta;
}

/** Despliega el contrato, enciende la API y devuelve cómo llamarla y cómo apagar todo. */
async function levantarApi(entornoExtra = {}) {
  const carpeta = carpetaTemporal();
  const archivo = path.join(carpeta, 'despliegue.json');
  const despliegue = await desplegar({ hre, destino: archivo });
  const puente = await puenteRpc();
  const cuenta = await cuentaConSaldo();
  const entorno = { RPC_URL: puente.url, CLAVE_PRIVADA_API: cuenta.privateKey, DESPLIEGUE: archivo, PUERTO: '0', ...entornoExtra };
  const api = await iniciar(entorno);
  const base = `http://127.0.0.1:${api.puerto}`;
  return {
    api, base, despliegue, entorno, cuentaApi: cuenta.address, rpcUrl: puente.url,
    pedir: (ruta, opciones) => fetch(base + ruta, opciones),
    async llamar(metodo, ruta, cuerpo) {
      const respuesta = await fetch(base + ruta, {
        method: metodo,
        headers: cuerpo === undefined ? undefined : { 'content-type': 'application/json' },
        body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
      });
      return { estado: respuesta.status, datos: await respuesta.json() };
    },
    async cerrar() {
      await api.cerrar();
      await puente.cerrar();
      fs.rmSync(carpeta, { recursive: true, force: true });
    },
  };
}

module.exports = { puenteRpc, carpetaTemporal, cuentaConSaldo, levantarApi };
