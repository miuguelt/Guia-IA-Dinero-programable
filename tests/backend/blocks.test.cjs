const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectRecentBlocks } = require('../../backend/chain/blocks.cjs');
const { createLabExecutor } = require('../../backend/labs/execute.cjs');

const hash = n => '0x' + n.toString(16).padStart(64, '0');

function fakeProvider({ latest = 5, broken = null, missing = null, client = 'HardhatNetwork/2.29.1/@nomicfoundation/edr/0.12.0' } = {}) {
  const requested = [];
  return {
    requested,
    async getNetwork() { return { chainId: 31337n }; },
    async send(method, params) {
      assert.equal(method, 'web3_clientVersion');
      assert.deepEqual(params, []);
      return client;
    },
    async getBlockNumber() { return latest; },
    async getBlock(number) {
      requested.push(number);
      if (number === missing) return null;
      return {
        number,
        hash: hash(number + 1),
        parentHash: number === broken ? hash(999) : hash(number),
        timestamp: 1_760_000_000 + number * 2,
        transactions: number % 2 ? ['0xaa'] : [],
      };
    },
  };
}

test('inspectRecentBlocks lee los últimos bloques del nodo y comprueba cada enlace con el anterior', async () => {
  const provider = fakeProvider();
  const result = await inspectRecentBlocks(provider);
  assert.deepEqual(provider.requested, [2, 3, 4, 5]);
  assert.equal(result.chainId, 31337);
  assert.equal(result.client, 'HardhatNetwork/2.29.1/@nomicfoundation/edr/0.12.0');
  assert.equal(result.nodeType, 'Hardhat');
  assert.equal(result.latestBlock, 5);
  assert.equal(result.intact, true);
  assert.equal(result.blocks.length, 4);
  assert.deepEqual(result.blocks[0], { blockNumber: 2, hash: hash(3), parentHash: hash(2), timestamp: new Date((1_760_000_000 + 4) * 1000).toISOString(), transactions: 0, linked: null });
  assert.equal(result.blocks[1].linked, true);
  assert.equal(result.blocks[1].parentHash, result.blocks[0].hash);
  assert.equal(result.blocks[1].transactions, 1);
  assert.match(result.explanation, /parentHash/);
});

test('inspectRecentBlocks detecta un enlace roto, nodos cortos y bloques ausentes', async () => {
  const broken = await inspectRecentBlocks(fakeProvider({ broken: 4, client: 'anvil/v1.4.3' }));
  assert.equal(broken.intact, false);
  assert.equal(broken.nodeType, 'Anvil (Foundry)');
  assert.equal(broken.blocks.find(block => block.blockNumber === 4).linked, false);
  assert.match(broken.explanation, /no coincide/);

  const short = fakeProvider({ latest: 1, client: 'geth/1.15' });
  const result = await inspectRecentBlocks(short, 4);
  assert.deepEqual(short.requested, [0, 1]);
  assert.equal(result.nodeType, 'Otro cliente');
  assert.equal(result.blocks[0].linked, null);

  await assert.rejects(() => inspectRecentBlocks(fakeProvider({ missing: 3 })), /no devolvió el bloque 3/);
  await assert.rejects(() => inspectRecentBlocks(fakeProvider(), 0), /entre 1 y 10/);
  await assert.rejects(() => inspectRecentBlocks(fakeProvider(), 11), /entre 1 y 10/);
});

test('el ejecutor atiende el laboratorio de bloques con la cadena real y sin indexar eventos', async () => {
  let indexed = false;
  const chain = {
    async blocks() { return { intact: true, blocks: [] }; },
    async execute() { throw new Error('no debe enviar transacciones'); },
    async events() { indexed = true; return []; },
  };
  const execute = createLabExecutor({ chain, store: {}, signatures: {}, tasks: {} });
  assert.deepEqual(await execute('blocks', { block: '2', data: 'texto', rehash: true }, 'sesion'), { intact: true, blocks: [] });
  assert.equal(indexed, false);
});

test('la API acepta exactamente los laboratorios del catálogo web, incluido el de bloques', async () => {
  const { LAB_IDS } = require('../../backend/labs/runs.cjs');
  const { labs } = await import('../../frontend/web/labs/catalog.mjs');
  assert.deepEqual([...LAB_IDS].sort(), labs.map(lab => lab.id).sort());
});
