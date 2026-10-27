const fs = require('node:fs/promises');
const path = require('node:path');
const {deployContracts} = require('../backend/chain/deployment.cjs');
const {resolveVpsConfig} = require('../backend/chain/vps-sync.cjs');

// El VPS escribe su propio manifiesto para no reemplazar el del aula local.
function deploymentTarget(hre, env = process.env) {
  if (hre.network?.name === 'vps') {
    return {label:'VPS',chainId:BigInt(resolveVpsConfig(env).chainId),destination:path.resolve(__dirname, '../artifacts/deployment.vps.json')};
  }
  return {label:'local',chainId:31337n,destination:path.resolve(__dirname, '../artifacts/deployment.json')};
}

async function main({runtime,destination,env=process.env} = {}) {
  const hre = runtime || require('hardhat');
  const target = deploymentTarget(hre, env);
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== target.chainId) {
    throw new Error(target.label === 'VPS'
      ? `El VPS respondió con la red ${network.chainId}; VPS_CHAIN_ID espera ${target.chainId}.`
      : 'El despliegue del aula solo admite la red local 31337.');
  }
  const manifest = await deployContracts(hre);
  const file = destination || target.destination;
  await fs.mkdir(path.dirname(file), {recursive:true});
  await fs.writeFile(file, JSON.stringify(manifest, null, 2));
  console.log(`Despliegue ${target.label} confirmado: ${Object.keys(manifest.contracts).length} contratos, bloque ${manifest.deployedAtBlock}, archivo ${path.basename(file)}.`);
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

module.exports = {main,runDeployCli,deploymentTarget};
