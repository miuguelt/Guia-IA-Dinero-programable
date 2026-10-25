const {expect} = require('chai');
const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const productionConfig = require('../hardhat.config.js');

describe('La compilación conserva el estado operativo del proyecto', function () {
  it('no elimina JSON del despliegue, ciclo de vida ni reportes ajenos a Hardhat', async function () {
    this.timeout(120000);
    expect(path.normalize(productionConfig.paths.artifacts)).to.equal(path.join('artifacts','hardhat'));
    expect(path.normalize(productionConfig.paths.cache)).to.equal(path.join('.cache','hardhat'));
    const root = path.resolve(__dirname,'..');
    const cacheRoot = path.join(root,'.cache');
    await fs.mkdir(cacheRoot,{recursive:true});
    const fixture = await fs.mkdtemp(path.join(cacheRoot,'compile-preservation-'));
    try {
      const contracts = path.join(fixture,'contracts');
      const directory = path.join(fixture,'artifacts');
      await fs.mkdir(contracts,{recursive:true});
      await fs.mkdir(directory,{recursive:true});
      const configPath = path.join(fixture,'hardhat.config.js');
      await fs.writeFile(configPath, `const config = require(${JSON.stringify(path.join(root,'hardhat.config.js'))});\nmodule.exports = {...config,paths:{...config.paths,root:__dirname,sources:'./contracts',tests:'./test'}};\n`);
      await fs.writeFile(path.join(contracts,'Ejemplo.sol'),'// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract Ejemplo { function valor() external pure returns (uint256) { return 42; } }\n');
      const snapshots = new Map();
      for (const name of ['deployment.json','lifecycle.json','report.json']) {
        const file = path.join(directory,name);
        const content = Buffer.from(JSON.stringify({id:randomUUID(),purpose:'Conservación del estado operativo',name}));
        await fs.writeFile(file,content);
        snapshots.set(file,content);
      }
      const cli = path.join(root,'node_modules/hardhat/internal/cli/cli.js');
      const result = spawnSync(process.execPath,[cli,'compile','--force','--config',configPath],{cwd:root,encoding:'utf8',windowsHide:true,timeout:60000});
      expect(result.status,result.stderr || result.error?.message).to.equal(0);
      const artifact = JSON.parse(await fs.readFile(path.join(directory,'hardhat/contracts/Ejemplo.sol/Ejemplo.json'),'utf8'));
      expect(artifact.contractName).to.equal('Ejemplo');
      expect(artifact.abi.some(item => item.name === 'valor')).to.equal(true);
      expect(artifact.bytecode).to.match(/^0x[0-9a-f]+$/i);
      await fs.access(path.join(fixture,'.cache/hardhat/solidity-files-cache.json'));
      for (const [file,content] of snapshots) expect(await fs.readFile(file)).to.deep.equal(content);
    } finally {
      if (!fixture.startsWith(cacheRoot+path.sep)) throw new Error('La ruta temporal salió de la caché del proyecto.');
      await fs.rm(fixture,{recursive:true,force:true});
    }
  });
});
