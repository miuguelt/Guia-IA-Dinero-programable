// Comprueba desde el equipo a qué nodo EVM se conecta el aprendiz: el local del aula o el Anvil de Coolify.
// Uso: npm run red:verificar -- --red local | --red vps
const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveVpsConfig } = require('../backend/chain/vps-sync.cjs');
const { nodeType } = require('../backend/chain/blocks.cjs');

const ROOT = path.resolve(__dirname, '..');
const BLOCK_WAIT_MS = 4500;

function resolveTarget(red, env = process.env) {
  if (red === 'local') {
    return { red, label: 'Nodo local', article: 'el nodo local', rpcUrl: 'http://127.0.0.1:8545', maskedUrl: 'http://127.0.0.1:8545', chainId: 31337, hasAuth: false,
      expectedClient: 'Hardhat', manifestPath: path.join(ROOT, 'artifacts/deployment.json') };
  }
  if (red === 'vps') {
    const config = resolveVpsConfig(env);
    return { red, label: 'Anvil en Coolify', article: 'el Anvil de Coolify', rpcUrl: config.rpcUrl, maskedUrl: config.maskedUrl, chainId: config.chainId, hasAuth: config.hasAuth,
      expectedClient: 'Anvil (Foundry)', manifestPath: path.join(ROOT, 'artifacts/deployment.vps.json') };
  }
  throw new Error('Usa --red local o --red vps.');
}

// fetch rechaza URLs con usuario y contraseña: las credenciales viajan en la cabecera Authorization.
async function rpcCall(fetchImpl, rpcUrl, method, params = [], { withoutCredentials = false } = {}) {
  const url = new URL(rpcUrl);
  const headers = { 'content-type': 'application/json' };
  if (url.username && !withoutCredentials) {
    headers.authorization = 'Basic ' + Buffer.from(`${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`).toString('base64');
  }
  url.username = '';
  url.password = '';
  const response = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Object.assign(new Error(`El nodo respondió HTTP ${response.status}.`), { status: response.status });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

const check = (id, title, state, detail, action = '') => ({ id, title, state, detail, action });

function connectionFailure(target, error) {
  if (error.status === 401) {
    return check('conexion', 'Conexión', 'falla', `${target.maskedUrl} rechazó las credenciales (401).`,
      'Revisa el usuario y token en VPS_RPC_URL: deben coincidir con el hash de ANVIL_BASIC_AUTH en Coolify.');
  }
  const action = target.red === 'local'
    ? 'Inicia el nodo con npm run node o con pwsh ./start-windows.ps1 y vuelve a verificar.'
    : 'Comprueba en Coolify que el servicio anvil esté Healthy y que el DNS de ANVIL_RPC_DOMAIN apunte al VPS.';
  return check('conexion', 'Conexión', 'falla', `${target.maskedUrl} no respondió: ${error.message}`, action);
}

async function contractCheck(target, rpc, chainId, readManifest) {
  let manifest;
  try { manifest = await readManifest(target.manifestPath); }
  catch {
    return check('contrato', 'Contrato del aula', 'aviso', `No existe ${path.basename(target.manifestPath)}.`,
      target.red === 'local' ? 'Despliega con npm run deploy.' : 'Despliega con npx hardhat run scripts/deploy.js --network vps.');
  }
  if (manifest.chainId !== chainId) {
    return check('contrato', 'Contrato del aula', 'falla', `El manifiesto pertenece a la red ${manifest.chainId} y el nodo es ${chainId}.`, 'Vuelve a desplegar en esta red.');
  }
  const address = manifest.contracts.DineroProgramableBase.address;
  const code = await rpc('eth_getCode', [address, 'latest']);
  if (code === '0x') {
    return check('contrato', 'Contrato del aula', 'falla', `No hay código en ${address}.`,
      'El nodo se reinició sin conservar su estado o desplegaste en otro nodo: vuelve a desplegar.');
  }
  return check('contrato', 'Contrato del aula', 'ok', `DineroProgramableBase tiene código en ${address}.`);
}

async function accessCheck(target, fetchImpl) {
  try {
    await rpcCall(fetchImpl, target.rpcUrl, 'eth_chainId', [], { withoutCredentials: true });
    return check('acceso', 'Acceso sin credenciales', 'falla', 'El RPC respondió a una petición sin credenciales: cualquiera puede usarlo.',
      'Asocia el middleware anvil-auth al enrutador anvil-rpc (docker-compose.anvil.yml) y deja vacío el dominio del servicio en Coolify.');
  } catch (error) {
    if (error.status === 401) return check('acceso', 'Acceso sin credenciales', 'ok', 'Una petición sin credenciales recibe 401.');
    return check('acceso', 'Acceso sin credenciales', 'aviso', `Respuesta inesperada sin credenciales: ${error.message}`, 'Revisa la configuración de Traefik en Coolify.');
  }
}

async function verifyNetwork({ target, fetchImpl = fetch, readManifest = async file => JSON.parse(await fs.readFile(file, 'utf8')), wait = ms => new Promise(resolve => setTimeout(resolve, ms)), blockWaitMs = BLOCK_WAIT_MS }) {
  const rpc = (method, params) => rpcCall(fetchImpl, target.rpcUrl, method, params);
  const checks = [];
  let firstBlock;
  try { firstBlock = parseInt(await rpc('eth_blockNumber'), 16); }
  catch (error) { return { target, ok: false, checks: [connectionFailure(target, error)] }; }
  checks.push(check('conexion', 'Conexión', 'ok', `${target.maskedUrl} responde; bloque actual ${firstBlock}.`));

  const chainId = parseInt(await rpc('eth_chainId'), 16);
  checks.push(chainId === target.chainId
    ? check('chainId', 'Identificador de red', 'ok', `chainId ${chainId}, el esperado para ${target.article}.`)
    : check('chainId', 'Identificador de red', 'falla', `chainId ${chainId}; se esperaba ${target.chainId}.`,
      `Estás conectado a otro nodo. Revisa la URL; para el VPS, ANVIL_CHAIN_ID y VPS_CHAIN_ID deben valer ${target.chainId}.`));

  const client = await rpc('web3_clientVersion');
  const type = nodeType(client);
  checks.push(type === target.expectedClient
    ? check('cliente', 'Software del nodo', 'ok', `${type} (${client}).`)
    : check('cliente', 'Software del nodo', 'aviso', `${type} (${client}); se esperaba ${target.expectedClient}.`, 'Confirma que la URL apunta al nodo correcto.'));

  const genesis = await rpc('eth_getBlockByNumber', ['0x0', false]);
  checks.push(check('genesis', 'Bloque génesis', 'ok', `${genesis.hash}. Anótalo: si cambia, el nodo empezó una cadena nueva.`));

  await wait(blockWaitMs);
  const secondBlock = parseInt(await rpc('eth_blockNumber'), 16);
  if (target.red === 'local') {
    checks.push(check('avance', 'Producción de bloques', 'ok', `Bloque ${firstBlock} → ${secondBlock}. Hardhat solo crea bloques con transacciones.`));
  } else {
    checks.push(secondBlock > firstBlock
      ? check('avance', 'Producción de bloques', 'ok', `Bloque ${firstBlock} → ${secondBlock}: Anvil produce bloques por tiempo.`)
      : check('avance', 'Producción de bloques', 'aviso', `Bloque ${firstBlock} → ${secondBlock}: no avanzó.`, 'Revisa ANVIL_BLOCK_TIME en Coolify.'));
  }

  checks.push(await contractCheck(target, rpc, chainId, readManifest));
  if (target.red === 'vps') checks.push(await accessCheck(target, fetchImpl));
  return { target, ok: checks.every(item => item.state !== 'falla'), checks };
}

const SYMBOLS = { ok: '✓', aviso: '!', falla: '✕' };

function formatReport(report) {
  const lines = [`${report.target.label} · ${report.target.maskedUrl}`, ''];
  for (const item of report.checks) {
    lines.push(`${SYMBOLS[item.state]} ${item.title}: ${item.detail}`);
    if (item.action) lines.push(`  → ${item.action}`);
  }
  lines.push('', report.ok ? 'Resultado: la conexión corresponde a la red esperada.' : 'Resultado: hay comprobaciones fallidas. Sigue las acciones indicadas.');
  return lines.join('\n');
}

function parseRed(argv) {
  const inline = argv.find(arg => arg.startsWith('--red='));
  if (inline) return inline.slice('--red='.length);
  const index = argv.indexOf('--red');
  return index >= 0 ? argv[index + 1] : 'local';
}

async function runVerifyCli({ argv = process.argv.slice(2), env = process.env, logger = console, operator = process, ...options } = {}) {
  let target;
  try { target = resolveTarget(parseRed(argv), env); }
  catch (error) {
    logger.error(error.message);
    operator.exitCode = 1;
    return null;
  }
  const report = await verifyNetwork({ target, ...options });
  logger.log(formatReport(report));
  if (!report.ok) operator.exitCode = 1;
  return report;
}

if (require.main === module) void runVerifyCli();

module.exports = { resolveTarget, rpcCall, verifyNetwork, formatReport, runVerifyCli };
