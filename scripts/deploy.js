const fs = require('node:fs/promises');
const path = require('node:path');
const {deployContracts} = require('../backend/chain/deployment.cjs');

async function main({runtime,destination=path.resolve(__dirname, '../artifacts/deployment.json')} = {}) {
  const hre = runtime || require('hardhat');
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 31337n) throw new Error('El despliegue del aula solo admite la red local 31337.');
  const manifest = await deployContracts(hre);
  await fs.mkdir(path.dirname(destination), {recursive:true});
  await fs.writeFile(destination, JSON.stringify(manifest, null, 2));
  console.log(`Despliegue local confirmado: ${Object.keys(manifest.contracts).length} contratos, bloque ${manifest.deployedAtBlock}.`);
  return manifest;
}

async function runDeployCli({options={},operator=process,logger=console} = {}) {
  try { return await main(options); }
  catch {
    logger.error('No fue posible desplegar los contratos. Comprueba el nodo local y ejecuta npm run compile.');
    operator.exitCode = 1;
    return null;
  }
}

if (require.main === module) void runDeployCli();

module.exports = {main,runDeployCli};
