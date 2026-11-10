// Punto de entrada de la API. Toda la configuración llega por variables de entorno:
//   RPC_URL            URL del nodo (http://127.0.0.1:8545 en local)
//   CLAVE_PRIVADA_API  clave de la cuenta con la que la API firma; nunca se escribe en el código
//   DATABASE_URL       opcional; sin ella la proyección vive en memoria
//   PUERTO             opcional; 3000 por defecto
const path = require('node:path');
const { cargarDespliegue, conectar } = require('./contrato');
const { crearApp } = require('./app');
const { RepositorioMemoria } = require('./repositorio-memoria');
const { crearPoolDesdeEntorno, RepositorioPostgres } = require('./repositorio-postgres');

const RAIZ = path.join(__dirname, '..');

async function iniciar(entorno = process.env) {
  for (const nombre of ['RPC_URL', 'CLAVE_PRIVADA_API']) {
    if (!entorno[nombre]) throw new Error(`Define la variable ${nombre} antes de iniciar la API.`);
  }
  const despliegue = cargarDespliegue(entorno.DESPLIEGUE || path.join(RAIZ, 'despliegue.json'));
  const { proveedor, contrato } = await conectar({ despliegue, rpcUrl: entorno.RPC_URL, clavePrivada: entorno.CLAVE_PRIVADA_API });
  const pool = entorno.DATABASE_URL ? crearPoolDesdeEntorno(entorno) : null;
  const repositorio = pool ? new RepositorioPostgres(pool) : new RepositorioMemoria();
  if (pool) await repositorio.preparar();

  const app = crearApp({ contrato, repositorio, despliegue, carpetaWeb: path.join(RAIZ, 'frontend') });
  const servidor = await new Promise(resolve => {
    const escucha = app.listen(Number(entorno.PUERTO ?? 3000), () => resolve(escucha));
  });

  async function cerrar() {
    servidor.closeAllConnections();
    await new Promise(resolve => servidor.close(resolve));
    proveedor.destroy();
    if (pool) await pool.end();
  }

  return { puerto: servidor.address().port, almacenamiento: pool ? 'PostgreSQL' : 'memoria', repositorio, contrato, cerrar };
}

async function ejecutar({ entorno = process.env, registro = console, proceso = process } = {}) {
  try {
    const api = await iniciar(entorno);
    registro.log(`API lista en http://localhost:${api.puerto} · proyección en ${api.almacenamiento}.`);
    return api;
  } catch (error) {
    registro.error(error.message);
    proceso.exitCode = 1;
    return null;
  }
}

if (require.main === module) void ejecutar();

module.exports = { iniciar, ejecutar };
