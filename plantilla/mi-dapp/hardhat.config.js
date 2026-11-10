require('@nomicfoundation/hardhat-toolbox');
const { subtask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require('hardhat/builtin-tasks/task-names');

// Usa el compilador solc 0.8.24 instalado con npm: compila sin descargar nada.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }, _hre, runSuper) => {
  if (solcVersion !== '0.8.24') return runSuper();
  return { compilerPath: require.resolve('solc/soljson.js'), isSolcJs: true, version: '0.8.24', longVersion: require('solc').version() };
});

// La red «remota» solo existe si defines RPC_URL y CLAVE_PRIVADA en tu terminal.
// Nunca escribas esos valores en este archivo.
const remota = process.env.RPC_URL && process.env.CLAVE_PRIVADA
  ? { remota: { url: process.env.RPC_URL, accounts: [process.env.CLAVE_PRIVADA] } }
  : {};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.24',
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545' },
    ...remota,
  },
  mocha: { timeout: 60000 },
};
