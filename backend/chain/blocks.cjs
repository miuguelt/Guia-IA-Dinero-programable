// Lectura de los últimos bloques del nodo para el laboratorio «Cadena de bloques»: no envía transacciones.
function nodeType(client) {
  if (/anvil/i.test(client)) return 'Anvil (Foundry)';
  if (/hardhat/i.test(client)) return 'Hardhat';
  return 'Otro cliente';
}

async function inspectRecentBlocks(provider, count = 4) {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Consulta entre 1 y 10 bloques.');
  const [network, client, latest] = await Promise.all([provider.getNetwork(), provider.send('web3_clientVersion', []), provider.getBlockNumber()]);
  const blocks = [];
  for (let number = Math.max(0, latest - count + 1); number <= latest; number++) {
    const block = await provider.getBlock(number);
    if (!block) throw new Error(`El nodo no devolvió el bloque ${number}.`);
    const previous = blocks.at(-1);
    blocks.push({
      blockNumber: block.number,
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      transactions: block.transactions.length,
      linked: previous ? block.parentHash === previous.hash : null,
    });
  }
  const intact = blocks.every(block => block.linked !== false);
  return {
    chainId: Number(network.chainId),
    client,
    nodeType: nodeType(client),
    latestBlock: latest,
    intact,
    blocks,
    explanation: intact
      ? 'Cada parentHash coincide con el hash del bloque anterior: estos bloques forman una cadena continua en el nodo consultado.'
      : 'Un parentHash no coincide con el hash del bloque anterior: el nodo devolvió bloques que no forman una cadena continua.',
  };
}

module.exports = { inspectRecentBlocks, nodeType };
