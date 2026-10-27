const { test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { resolveTarget, rpcCall, verifyNetwork, formatReport, runVerifyCli } = require('../../scripts/verificar-red.cjs');

const SECRET = 'TokenDePractica2026';
const VPS_ENV = { VPS_RPC_URL: `https://aprendiz:${SECRET}@rpc.ejemplo.co`, VPS_CHAIN_ID: '31338' };
const CONTRACT = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Nodo JSON-RPC simulado: registra cada petición y responde según el método.
function fakeNode({ chainId = 31337, client = 'HardhatNetwork/2.29.1', blocks = [7, 7], code = '0x6080', requireAuth = false, openWithoutAuth = false, down = false } = {}) {
  const calls = [];
  const heights = [...blocks];
  async function fetchImpl(url, init) {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), authorization: init.headers.authorization, method: body.method });
    if (down) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    if (requireAuth && !init.headers.authorization && !openWithoutAuth) return { ok: false, status: 401, json: async () => ({}) };
    const results = {
      eth_blockNumber: () => '0x' + (heights.length > 1 ? heights.shift() : heights[0]).toString(16),
      eth_chainId: () => '0x' + chainId.toString(16),
      web3_clientVersion: () => client,
      eth_getBlockByNumber: () => ({ hash: '0x' + 'ab'.repeat(32), number: '0x0' }),
      eth_getCode: () => code,
    };
    if (!results[body.method]) return { ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: body.id, error: { message: 'method not found' } }) };
    return { ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: body.id, result: results[body.method]() }) };
  }
  return { calls, fetchImpl };
}

const manifest = chainId => async () => ({ chainId, contracts: { DineroProgramableBase: { address: CONTRACT } } });
const noWait = async () => {};

test('resolveTarget distingue el nodo local del VPS y separa sus manifiestos', () => {
  const local = resolveTarget('local', {});
  assert.equal(local.rpcUrl, 'http://127.0.0.1:8545');
  assert.equal(local.chainId, 31337);
  assert.equal(local.expectedClient, 'Hardhat');
  assert.match(local.manifestPath, /artifacts[\\/]deployment\.json$/);

  const vps = resolveTarget('vps', VPS_ENV);
  assert.equal(vps.chainId, 31338);
  assert.equal(vps.expectedClient, 'Anvil (Foundry)');
  assert.equal(vps.hasAuth, true);
  assert.doesNotMatch(vps.maskedUrl, new RegExp(SECRET));
  assert.match(vps.manifestPath, /artifacts[\\/]deployment\.vps\.json$/);
  assert.equal(resolveTarget('vps', {}).chainId, 31338);
  assert.throws(() => resolveTarget('mainnet', {}), /--red local o --red vps/);
});

test('rpcCall envía las credenciales como cabecera Basic y nunca dentro de la URL', async () => {
  const node = fakeNode({ requireAuth: true });
  assert.equal(await rpcCall(node.fetchImpl, VPS_ENV.VPS_RPC_URL, 'eth_chainId'), '0x7a69');
  assert.equal(node.calls[0].url, 'https://rpc.ejemplo.co/');
  assert.equal(node.calls[0].authorization, 'Basic ' + Buffer.from(`aprendiz:${SECRET}`).toString('base64'));
  assert.equal(await rpcCall(node.fetchImpl, 'https://rpc.ejemplo.co', 'eth_chainId', [], { withoutCredentials: true }).catch(error => error.status), 401);
  await assert.rejects(() => rpcCall(fakeNode().fetchImpl, 'http://127.0.0.1:8545', 'eth_desconocido'), /method not found/);
});

test('verifyNetwork confirma un nodo local de Hardhat con su contrato desplegado', async () => {
  const node = fakeNode({ blocks: [7, 7] });
  const report = await verifyNetwork({ target: resolveTarget('local', {}), fetchImpl: node.fetchImpl, readManifest: manifest(31337), wait: noWait });
  assert.equal(report.ok, true);
  const byId = Object.fromEntries(report.checks.map(check => [check.id, check]));
  assert.deepEqual(Object.keys(byId), ['conexion', 'chainId', 'cliente', 'genesis', 'avance', 'contrato']);
  assert.equal(byId.chainId.state, 'ok');
  assert.match(byId.cliente.detail, /Hardhat/);
  assert.match(byId.genesis.detail, /0xabab/);
  assert.match(byId.avance.detail, /solo crea bloques con transacciones/);
  assert.match(byId.contrato.detail, new RegExp(CONTRACT));
  assert.ok(!node.calls.some(call => call.authorization));
});

test('verifyNetwork reconoce el VPS protegido, su ritmo de bloques y el rechazo sin credenciales', async () => {
  const node = fakeNode({ chainId: 31338, client: 'anvil/v1.4.3', blocks: [40, 42], requireAuth: true });
  const report = await verifyNetwork({ target: resolveTarget('vps', VPS_ENV), fetchImpl: node.fetchImpl, readManifest: manifest(31338), wait: noWait });
  assert.equal(report.ok, true);
  const byId = Object.fromEntries(report.checks.map(check => [check.id, check]));
  assert.equal(byId.avance.state, 'ok');
  assert.match(byId.avance.detail, /40 → 42/);
  assert.equal(byId.acceso.state, 'ok');
  assert.match(byId.acceso.detail, /401/);
  const text = formatReport(report);
  assert.match(text, /aprendiz:\*\*\*@rpc\.ejemplo\.co/);
  assert.doesNotMatch(text, new RegExp(SECRET));
});

test('verifyNetwork explica las fallas: otra red, RPC abierto, contrato ausente y bloques detenidos', async () => {
  const wrong = await verifyNetwork({ target: resolveTarget('vps', VPS_ENV), fetchImpl: fakeNode({ chainId: 31337, blocks: [5, 5], code: '0x', openWithoutAuth: true, requireAuth: true }).fetchImpl, readManifest: manifest(31338), wait: noWait });
  const byId = Object.fromEntries(wrong.checks.map(check => [check.id, check]));
  assert.equal(wrong.ok, false);
  assert.equal(byId.chainId.state, 'falla');
  assert.match(byId.chainId.action, /31338/);
  assert.equal(byId.cliente.state, 'aviso');
  assert.equal(byId.avance.state, 'aviso');
  assert.equal(byId.contrato.state, 'falla');
  assert.equal(byId.acceso.state, 'falla');
  assert.match(byId.acceso.action, /middleware/);

  const otherManifest = await verifyNetwork({ target: resolveTarget('local', {}), fetchImpl: fakeNode().fetchImpl, readManifest: manifest(31338), wait: noWait });
  assert.equal(otherManifest.checks.find(check => check.id === 'contrato').state, 'falla');
  const noManifest = await verifyNetwork({ target: resolveTarget('local', {}), fetchImpl: fakeNode().fetchImpl, readManifest: async () => { throw Object.assign(new Error('no existe'), { code: 'ENOENT' }); }, wait: noWait });
  assert.equal(noManifest.checks.find(check => check.id === 'contrato').state, 'aviso');
  assert.equal(noManifest.ok, true);

  const odd = await verifyNetwork({ target: resolveTarget('vps', VPS_ENV), fetchImpl: async (url, init) => init.headers.authorization ? fakeNode({ chainId: 31338, client: 'anvil/v1', blocks: [1, 2] }).fetchImpl(url, init) : { ok: false, status: 503, json: async () => ({}) }, readManifest: manifest(31338), wait: noWait });
  assert.equal(odd.checks.find(check => check.id === 'acceso').state, 'aviso');
});

test('verifyNetwork se detiene con una acción concreta si el nodo no responde o rechaza las credenciales', async () => {
  const down = await verifyNetwork({ target: resolveTarget('local', {}), fetchImpl: fakeNode({ down: true }).fetchImpl, readManifest: manifest(31337), wait: noWait });
  assert.equal(down.ok, false);
  assert.equal(down.checks.length, 1);
  assert.match(down.checks[0].action, /npm run node/);

  const denied = await verifyNetwork({ target: resolveTarget('vps', { VPS_RPC_URL: 'https://rpc.ejemplo.co' }), fetchImpl: fakeNode({ requireAuth: true }).fetchImpl, readManifest: manifest(31338), wait: noWait });
  assert.equal(denied.checks[0].state, 'falla');
  assert.match(denied.checks[0].action, /usuario y token/);
});

test('runVerifyCli imprime el informe, fija el código de salida y comunica argumentos inválidos', async () => {
  const lines = [];
  const logger = { log: line => lines.push(line), error: line => lines.push(line) };
  const operator = {};
  const ok = await runVerifyCli({ argv: ['--red', 'local'], env: {}, fetchImpl: fakeNode().fetchImpl, readManifest: manifest(31337), wait: noWait, logger, operator });
  assert.equal(ok.ok, true);
  assert.equal(operator.exitCode, undefined);
  assert.match(lines.join('\n'), /Nodo local/);

  const failed = {};
  await runVerifyCli({ argv: ['--red=vps'], env: VPS_ENV, fetchImpl: fakeNode({ chainId: 1 }).fetchImpl, readManifest: manifest(31338), wait: noWait, logger, operator: failed });
  assert.equal(failed.exitCode, 1);

  const invalid = {};
  assert.equal(await runVerifyCli({ argv: ['--red', 'otra'], env: {}, logger, operator: invalid }), null);
  assert.equal(invalid.exitCode, 1);
  assert.match(lines.at(-1), /--red local o --red vps/);
});

test('verifyNetwork lee el manifiesto del disco, espera de verdad y detecta un contrato sin código', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'verificar-red-'));
  const manifestPath = path.join(dir, 'deployment.json');
  await fs.writeFile(manifestPath, JSON.stringify({ chainId: 31337, contracts: { DineroProgramableBase: { address: CONTRACT } } }));
  const began = Date.now();
  const report = await verifyNetwork({ target: { ...resolveTarget('local', {}), manifestPath }, fetchImpl: fakeNode({ code: '0x' }).fetchImpl, blockWaitMs: 30 });
  assert.ok(Date.now() - began >= 25, 'la espera por defecto usa el temporizador');
  const contrato = report.checks.find(check => check.id === 'contrato');
  assert.equal(contrato.state, 'falla');
  assert.match(contrato.detail, new RegExp(CONTRACT));
  assert.match(contrato.action, /vuelve a desplegar/);
  assert.equal(report.ok, false);
  await fs.rm(dir, { recursive: true, force: true });
});
