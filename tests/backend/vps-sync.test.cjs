const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveVpsConfig, syncVpsEvents, serializeValue } = require('../../backend/chain/vps-sync.cjs');

test('hardhat.config.js expone la red vps parametrizada con valores predeterminados seguros', () => {
  const configPath = path.resolve(__dirname, '../../hardhat.config.js');
  const content = fs.readFileSync(configPath, 'utf8');
  assert.match(content, /\bvps:\s*\{/);
  assert.match(content, /process\.env\.VPS_RPC_URL/);
  assert.match(content, /process\.env\.VPS_CHAIN_ID \|\| 31338/);
  assert.match(content, /process\.env\.VPS_ORACLE_PRIVATE_KEY/);
});

test('docker-compose.anvil.yml define el servicio Anvil persistente y protegido para Coolify', () => {
  const composePath = path.resolve(__dirname, '../../docker-compose.anvil.yml');
  assert.equal(fs.existsSync(composePath), true, 'Falta docker-compose.anvil.yml');
  const content = fs.readFileSync(composePath, 'utf8');
  assert.match(content, /ghcr\.io\/foundry-rs\/foundry/);
  assert.match(content, /--state/);
  assert.match(content, /\/data\/anvil-state\.json/);
  assert.match(content, /basicauth\.users/);
  assert.match(content, /healthcheck:/);
  assert.match(content, /coolify:/);
  assert.doesNotMatch(content, /^\s*ports:/m);
  // El VPS usa otro chainId para que MetaMask y los scripts no lo confundan con el nodo local.
  assert.match(content, /\$\{ANVIL_CHAIN_ID:-31338\}/);
  assert.doesNotMatch(content, /31337/);
});

test('docker-compose.anvil.yml asocia el middleware Basic Auth a un enrutador con dominio y TLS', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../../docker-compose.anvil.yml'), 'utf8');
  // Un middleware definido pero no asociado a ningún enrutador no protege el RPC.
  assert.match(content, /traefik\.http\.routers\.anvil-rpc\.middlewares=anvil-auth/);
  assert.match(content, /traefik\.http\.routers\.anvil-rpc\.rule=Host\(`\$\{ANVIL_RPC_DOMAIN:\?/);
  assert.match(content, /traefik\.http\.routers\.anvil-rpc\.tls=true/);
  assert.match(content, /traefik\.http\.routers\.anvil-rpc\.service=anvil/);
  assert.match(content, /basicauth\.users=\$\{ANVIL_BASIC_AUTH:\?/);
});

test('resolveVpsConfig valida URL, detecta credenciales Basic Auth y oculta el token', () => {
  const def = resolveVpsConfig({});
  assert.equal(def.rpcUrl, 'http://127.0.0.1:8545');
  assert.equal(def.chainId, 31338);
  assert.equal(def.deploymentId, 'vps-anvil-31338');
  assert.equal(def.hasAuth, false);
  assert.equal(def.maskedUrl, 'http://127.0.0.1:8545');

  const auth = resolveVpsConfig({
    VPS_RPC_URL: 'https://aprendiz:secreto123@rpc.ejemplo.co',
    VPS_CHAIN_ID: '31338',
    VPS_DEPLOYMENT_ID: 'agropay-vps-01',
  });
  assert.equal(auth.hasAuth, true);
  assert.equal(auth.chainId, 31338);
  assert.equal(auth.deploymentId, 'agropay-vps-01');
  assert.equal(auth.maskedUrl, 'https://aprendiz:***@rpc.ejemplo.co');
  assert.doesNotMatch(auth.maskedUrl, /secreto123/);

  assert.throws(() => resolveVpsConfig({ VPS_RPC_URL: 'ws://rpc.ejemplo.co' }), /protocolo HTTP o HTTPS/);
  assert.throws(() => resolveVpsConfig({ VPS_CHAIN_ID: '0' }), /chainId entero positivo/);
});

test('serializeValue transforma BigInt y arreglos anidados sin alterar primitivos', () => {
  assert.equal(serializeValue(250n), '250');
  assert.deepEqual(serializeValue([10n, ['ok', 20n]]), ['10', ['ok', '20']]);
  assert.equal(serializeValue('texto'), 'texto');
});

test('syncVpsEvents consulta logs del nodo EVM y proyecta en el almacén SQL con deduplicación', async () => {
  const recorded = [];
  const store = {
    async readPosition(id) {
      return id === 'con-posicion' ? { blockNumber: 12, logIndex: 0 } : null;
    },
    async recordEvents(id, events) {
      recorded.push({ id, events });
      return { indexed: events.length, deploymentId: id, rebuilt: false };
    },
  };
  const provider = {
    async getNetwork() { return { chainId: 31338n }; },
    async getBlockNumber() { return 25; },
    async getLogs({ address, fromBlock, toBlock }) {
      assert.equal(address, '0x1111111111111111111111111111111111111111');
      assert.equal(toBlock, 'latest');
      return [
        {
          transactionHash: '0xabc',
          index: 2,
          blockNumber: fromBlock + 1,
          topics: ['0x01'],
          data: '0x',
        },
        {
          transactionHash: '0xdef',
          index: 0,
          blockNumber: fromBlock,
          topics: ['0x02'],
          data: '0x',
        },
        {
          transactionHash: '0xignorado',
          index: 1,
          blockNumber: fromBlock,
          topics: ['0x03'],
          data: '0x',
        },
      ];
    },
  };
  const contract = {
    target: '0x1111111111111111111111111111111111111111',
    interface: {
      parseLog(log) {
        if (log.transactionHash === '0xignorado') return null;
        return {
          name: 'GarantiaDepositada',
          fragment: { inputs: [{ name: 'productor' }, { name: '' }] },
          args: ['0x2222222222222222222222222222222222222222', [500n]],
        };
      },
    },
  };

  const first = await syncVpsEvents({ provider, contract, store });
  assert.equal(first.status, 'synced');
  assert.equal(first.deploymentId, 'vps-anvil-31338');
  assert.equal(first.fromBlock, 0);
  assert.equal(first.indexed, 2);
  assert.equal(first.events[0].txHash, '0xdef');
  assert.equal(first.events[1].txHash, '0xabc');
  assert.deepEqual(first.events[0].args, {
    productor: '0x2222222222222222222222222222222222222222',
    1: ['500'],
  });

  const second = await syncVpsEvents({ provider, contract: { address: contract.target, interface: contract.interface }, store, deploymentId: 'con-posicion' });
  assert.equal(second.fromBlock, 12);
  assert.equal(recorded.length, 2);

  await assert.rejects(
    () => syncVpsEvents({ provider: null, contract, store }),
    /proveedor, contrato y almacén/
  );
});
