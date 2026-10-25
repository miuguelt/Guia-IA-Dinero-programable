const {randomUUID} = require('node:crypto');

async function deployContracts(hre) {
  const [admin, oracle] = await hre.ethers.getSigners();
  const definitions = {};
  async function deploy(name, args = [], options = {}) {
    const factory = await hre.ethers.getContractFactory(name, options);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    const artifact = await hre.artifacts.readArtifact(name);
    definitions[name] = {address:await contract.getAddress(),abi:artifact.abi};
    return contract;
  }
  const token = await deploy('TokenPractica', [hre.ethers.parseEther('1000000')]);
  await deploy('DineroProgramableBase', [oracle.address, {value:hre.ethers.parseEther('10')}]);
  await deploy('DineroProgramableERC20', [await token.getAddress(), oracle.address]);
  await deploy('TiendaEscrowWeb3');
  await deploy('CertificadosInmutables');
  await deploy('RegistroTelemetria', [oracle.address]);
  await deploy('CertificacionMiel', [oracle.address]);
  const poseidon = await deploy('PoseidonT3');
  const verifier = await deploy('SemaphoreVerifier');
  const semaphore = await deploy('Semaphore', [await verifier.getAddress()], {libraries:{PoseidonT3:await poseidon.getAddress()}});
  const election = await deploy('EleccionesSemaphore', [await semaphore.getAddress(), BigInt(Date.now())]);
  const network = await hre.ethers.provider.getNetwork();
  const receipt = await election.deploymentTransaction().wait();
  return {id:randomUUID(),chainId:Number(network.chainId),contracts:definitions,deployedAtBlock:receipt.blockNumber,deployedBlockHash:receipt.blockHash,admin:admin.address};
}

module.exports = {deployContracts};
