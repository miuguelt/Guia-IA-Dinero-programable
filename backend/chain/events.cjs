async function collectEvents(ctx, { fromBlock = ctx.manifest.deployedAtBlock } = {}) {
  if (!Number.isSafeInteger(fromBlock) || fromBlock < 0) throw new Error('La posición de lectura debe ser un bloque entero no negativo.');
  const events = [];
  for (const [contractName,entry] of Object.entries(ctx.manifest.contracts)) {
    const contract = ctx.contract(contractName);
    const logs = await ctx.provider.getLogs({address:entry.address,fromBlock,toBlock:'latest'});
    for (const log of logs) {
      const parsed = contract.interface.parseLog(log);
      if (!parsed) continue;
      const args = {};
      for (let index=0;index<parsed.fragment.inputs.length;index++) {
        const name = parsed.fragment.inputs[index].name;
        args[name || String(index)] = serialize(parsed.args[index]);
      }
      events.push({deploymentId:ctx.manifest.id,txHash:log.transactionHash,logIndex:log.index,blockNumber:log.blockNumber,name:parsed.name,contract:contractName,args});
    }
  }
  return events.sort((first,second) => first.blockNumber-second.blockNumber || first.logIndex-second.logIndex);
}

function serialize(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serialize);
  return value;
}

module.exports = {collectEvents,serialize};
