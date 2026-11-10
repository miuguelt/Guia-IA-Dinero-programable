// Las tres piezas que cualquier aplicación necesita para hablar con un contrato:
// la URL del nodo (RPC), la dirección del contrato y su ABI.
const fs = require('node:fs');
const { JsonRpcProvider, FetchRequest, Wallet, Contract } = require('ethers');

/** Lee despliegue.json, el archivo que escribe `npm run desplegar`. */
function cargarDespliegue(ruta) {
  if (!fs.existsSync(ruta)) throw new Error('No existe despliegue.json. Enciende el nodo y ejecuta npm run desplegar.');
  const despliegue = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  for (const campo of ['direccion', 'abi', 'chainId']) {
    if (!despliegue[campo]) throw new Error(`despliegue.json no tiene «${campo}». Vuelve a desplegar.`);
  }
  return despliegue;
}

/**
 * Un nodo publicado suele pedir usuario y contraseña: https://usuario:clave@rpc.tudominio.com.
 * Se separan de la URL y viajan en la cabecera Authorization. Sin HTTPS solo se aceptan en tu propio equipo.
 */
function peticionRpc(rpcUrl) {
  const url = new URL(rpcUrl);
  if (!url.username) return rpcUrl;
  const usuario = decodeURIComponent(url.username);
  const clave = decodeURIComponent(url.password);
  url.username = '';
  url.password = '';
  const peticion = new FetchRequest(url.href);
  peticion.allowInsecureAuthentication = ['127.0.0.1', 'localhost'].includes(url.hostname);
  peticion.setCredentials(usuario, clave);
  return peticion;
}

/** Conecta con el nodo y comprueba que es la red y el contrato esperados antes de aceptar peticiones. */
async function conectar({ despliegue, rpcUrl, clavePrivada }) {
  // cacheTimeout -1: ethers reutiliza respuestas idénticas durante 250 ms. Con dos transacciones
  // seguidas, la segunda leería el mismo nonce que la primera y la red la rechazaría.
  const proveedor = new JsonRpcProvider(peticionRpc(rpcUrl), undefined, { cacheTimeout: -1 });
  try {
    const red = await proveedor.getNetwork();
    if (red.chainId !== BigInt(despliegue.chainId)) {
      throw new Error(`El nodo respondió con la red ${red.chainId} y el despliegue es de la red ${despliegue.chainId}. Revisa RPC_URL o vuelve a desplegar.`);
    }
    if (await proveedor.getCode(despliegue.direccion) === '0x') {
      throw new Error('No hay contrato en la dirección de despliegue.json. Si reiniciaste el nodo, vuelve a desplegar.');
    }
    const firmante = new Wallet(clavePrivada, proveedor);
    return { proveedor, firmante, contrato: new Contract(despliegue.direccion, despliegue.abi, firmante) };
  } catch (error) {
    proveedor.destroy();
    throw error;
  }
}

module.exports = { cargarDespliegue, peticionRpc, conectar };
