require("@nomicfoundation/hardhat-toolbox");
const { subtask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, TASK_NODE_SERVER_READY } = require('hardhat/builtin-tasks/task-names');

// El compilador versionado se obtiene de npm durante la preparación, no durante la práctica.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({solcVersion}, _hre, runSuper) => {
  if (solcVersion !== '0.8.24') return runSuper();
  return {compilerPath:require.resolve('solc/soljson.js'),isSolcJs:true,version:'0.8.24',longVersion:require('solc').version()};
});

// El mensaje estándar imprime las claves de las cuentas; este límite solo publica el puerto.
subtask(TASK_NODE_SERVER_READY).setAction(async ({port}) => {
  console.log(`Nodo del aula disponible en el puerto ${port}, red local 31337.`);
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  paths: {
    artifacts: './artifacts/hardhat',
    cache: './.cache/hardhat',
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      loggingEnabled: false,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    vps: {
      url: process.env.VPS_RPC_URL || "http://127.0.0.1:8545",
      chainId: Number(process.env.VPS_CHAIN_ID || 31337),
      accounts: process.env.VPS_PRIVATE_KEY ? [process.env.VPS_PRIVATE_KEY] : undefined,
    },
  },
};
