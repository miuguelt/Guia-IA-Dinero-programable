async function startChain({port=Number(process.env.EVM_PORT || 8545),runtime} = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('El puerto del nodo local debe estar entre 1024 y 65535.');
  const hardhat = runtime || require('hardhat');
  await hardhat.run('node',{hostname:'127.0.0.1',port});
}

async function runChainCli({options={},operator=process,logger=console} = {}) {
  try {
    await startChain(options);
    return true;
  } catch {
    logger.error('No fue posible iniciar el nodo local. Comprueba el puerto del proyecto.');
    operator.exitCode = 1;
    return null;
  }
}

if (require.main === module) void runChainCli();

module.exports = {startChain,runChainCli};
