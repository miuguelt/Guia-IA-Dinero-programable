const fs = require('node:fs/promises');
const {JsonRpcProvider, Contract} = require('ethers');

function createConnection({rpcUrl='http://127.0.0.1:8545',manifestPath,provider:injectedProvider} = {}) {
  const url = new URL(rpcUrl);
  if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.protocol !== 'http:') {
    throw new Error('El aula solo admite un nodo HTTP en el equipo local.');
  }
  const provider = injectedProvider || new JsonRpcProvider(rpcUrl, undefined, {cacheTimeout:-1,batchMaxCount:1});
  async function context() {
    const network = await provider.getNetwork();
    if (network.chainId !== 31337n) throw new Error('Selecciona la red local 31337.');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (manifest.chainId !== 31337) throw new Error('El manifiesto no corresponde a la red local.');
    const blockNumber = await provider.getBlockNumber();
    const base = manifest.contracts.DineroProgramableBase;
    if (blockNumber < manifest.deployedAtBlock || await provider.getCode(base.address) === '0x') {
      throw new Error('El nodo se reinició. Vuelve a desplegar los contratos del aula.');
    }
    if (manifest.deployedBlockHash && (await provider.getBlock(manifest.deployedAtBlock)).hash !== manifest.deployedBlockHash) {
      throw new Error('El nodo se reinició. El bloque del despliegue ya no pertenece a esta cadena.');
    }
    const signers = await Promise.all([0,1,2,3].map(index => provider.getSigner(index)));
    function contract(name, signer=signers[0]) {
      const entry = manifest.contracts[name];
      if (!entry) throw new Error(`Falta el contrato ${name}. Vuelve a desplegar el aula.`);
      return new Contract(entry.address, entry.abi, signer);
    }
    return {provider,manifest,blockNumber,signers,contract};
  }
  async function health() {
    try {
      const ctx = await context();
      return {connected:true,chainId:31337,blockNumber:ctx.blockNumber,deployment:ctx.manifest};
    } catch {
      return {connected:false,chainId:31337,message:'Inicia el nodo local y despliega los contratos con el lanzador del proyecto.'};
    }
  }
  function close() { provider.destroy(); }
  return {context,health,close};
}

module.exports = {createConnection};
