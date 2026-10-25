function serializeValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeValue);
  return value;
}

function resolveVpsConfig(env = process.env) {
  const rpcUrl = env.VPS_RPC_URL || 'http://127.0.0.1:8545';
  const chainId = Number(env.VPS_CHAIN_ID || 31337);
  const deploymentId = env.VPS_DEPLOYMENT_ID || `vps-anvil-${chainId}`;
  const url = new URL(rpcUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('El nodo del VPS requiere protocolo HTTP o HTTPS.');
  }
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error('La red del VPS requiere un chainId entero positivo.');
  }
  const hasAuth = Boolean(url.username && url.password);
  const maskedUrl = hasAuth ? rpcUrl.replace(`:${url.password}@`, ':***@') : rpcUrl;
  return { rpcUrl, maskedUrl, chainId, deploymentId, hasAuth };
}

async function syncVpsEvents({
  provider,
  contract,
  store,
  deploymentId = 'vps-anvil-31337',
  contractName = 'DineroProgramableBase',
  fromBlock,
} = {}) {
  if (!provider || !contract || !store) {
    throw new Error('La sincronización requiere proveedor, contrato y almacén.');
  }
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  const previous = await store.readPosition(deploymentId);
  const startBlock = fromBlock ?? previous?.blockNumber ?? 0;
  const address = contract.target || contract.address;
  const logs = await provider.getLogs({ address, fromBlock: startBlock, toBlock: 'latest' });
  const events = [];
  for (const log of logs) {
    const parsed = contract.interface.parseLog(log);
    if (!parsed) continue;
    const args = {};
    for (let index = 0; index < parsed.fragment.inputs.length; index++) {
      const name = parsed.fragment.inputs[index].name;
      args[name || String(index)] = serializeValue(parsed.args[index]);
    }
    events.push({
      deploymentId,
      txHash: log.transactionHash,
      logIndex: log.index,
      blockNumber: log.blockNumber,
      name: parsed.name,
      contract: contractName,
      args,
    });
  }
  events.sort((first, second) => first.blockNumber - second.blockNumber || first.logIndex - second.logIndex);
  await store.recordEvents(deploymentId, events);
  return {
    status: 'synced',
    deploymentId,
    chainId: Number(network.chainId),
    blockNumber,
    fromBlock: startBlock,
    indexed: events.length,
    events,
  };
}

module.exports = { resolveVpsConfig, syncVpsEvents, serializeValue };
