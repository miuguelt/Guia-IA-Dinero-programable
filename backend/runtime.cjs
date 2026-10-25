const { createChainRuntime } = require('./chain/runtime.cjs');
const { createStore } = require('./persistence/store.cjs');
const { createSignatureLab } = require('./security/signatures.cjs');
const { createWebAuthnLab } = require('./security/webauthn.cjs');
const { createTaskRunner } = require('./audit/runner.cjs');
const { createLabExecutor } = require('./labs/execute.cjs');
const { createRunService } = require('./labs/runs.cjs');
const path = require('node:path');
const { stat } = require('node:fs/promises');

async function createRuntime({ root = path.resolve(__dirname, '..'), port = 8153 } = {}) {
  const chain = createChainRuntime({ rpcUrl: process.env.GUIA_RPC_URL || 'http://127.0.0.1:8545',
    manifestPath: path.join(root, 'artifacts', 'deployment.json') });
  const store = createStore();
  const tasks = createTaskRunner({ root });
  const signatures = createSignatureLab();
  const webAuthn = createWebAuthnLab({ store, origin: `http://localhost:${port}` });
  try { await store.initialize(); } catch { /* La lectura estática continúa; el estado declara la dependencia ausente. */ }
  const runs = createRunService(createLabExecutor({ chain, store, signatures, tasks }));
  const startedAt = Date.now();
  async function revision() {
    const files = await Promise.all(['main.js', 'styles.css'].map(file => stat(path.join(root, 'web', file))));
    return { revision: startedAt + ':' + Math.max(...files.map(file => file.mtimeMs)) };
  }
  async function runtime() {
    const [network, database, tools] = await Promise.allSettled([chain.health(), store.health(), tasks.health()]);
    return { api: true, chain: network.status === 'fulfilled' ? network.value : { connected: false },
      database: database.status === 'fulfilled' ? database.value : { connected: false },
      tools: tools.status === 'fulfilled' ? tools.value : {}, deployment: network.value?.deployment || null };
  }
  async function close() { await runs.idle(); await chain.close(); await store.close(); }
  return { webRoot: path.join(root, 'web'), assetRoot: path.join(root, 'assets'), runs, webAuthn, runtime, revision, close };
}

module.exports = { createRuntime };
