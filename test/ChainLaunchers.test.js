const {expect} = require('chai');
const fs = require('node:fs/promises');
const path = require('node:path');
const {main,runDeployCli,deploymentTarget} = require('../scripts/deploy.js');
const {deployContracts} = require('../backend/chain/deployment.cjs');
const {startChain,runChainCli} = require('../scripts/chain-node.cjs');

describe('Preparación explícita de la cadena', function () {
  it('el anuncio real del nodo publica el puerto y conserva las claves fuera de la consola', async function () {
    const runtime = require('hardhat');
    const {TASK_NODE_SERVER_READY} = require('hardhat/builtin-tasks/task-names');
    const messages = [];
    const original = console.log;
    console.log = message => messages.push(message);
    try { await runtime.run(TASK_NODE_SERVER_READY,{address:'127.0.0.1',port:18545,provider:runtime.network.provider,server:{}}); }
    finally { console.log = original; }
    expect(messages).to.deep.equal(['Nodo del aula disponible en el puerto 18545, red local 31337.']);
    expect(messages.join(' ')).not.to.match(/private|0x[a-f0-9]{64}/i);
  });

  it('genera un manifiesto público con direcciones y ABI de contratos efectivamente desplegados', async function () {
    const destination = path.resolve('.cache/test-chain/launcher-deployment.json');
    const manifest = await runDeployCli({options:{destination},operator:{}});
    const saved = JSON.parse(await fs.readFile(destination,'utf8'));
    expect(saved.id).to.equal(manifest.id);
    expect(saved.chainId).to.equal(31337);
    expect(Object.keys(saved.contracts)).to.have.length(11);
    expect(saved.deployedBlockHash).to.match(/^0x[0-9a-f]{64}$/);
    for (const entry of Object.values(saved.contracts)) {
      expect(await require('hardhat').ethers.provider.getCode(entry.address)).not.to.equal('0x');
    }
    expect(Object.keys(saved)).not.to.include('privateKey');
  });

  it('rechaza otra red y limita el servidor a loopback con puerto válido', async function () {
    await expect(main({runtime:{ethers:{provider:{getNetwork:async () => ({chainId:1n})}}}})).to.be.rejectedWith('31337');
    let request;
    await startChain({port:18545,runtime:{run:async (task,args) => {request={task,args};}}});
    expect(request).to.deep.equal({task:'node',args:{hostname:'127.0.0.1',port:18545}});
    await expect(startChain({port:80})).to.be.rejectedWith('puerto');
  });

  it('separa el despliegue del VPS: exige su chainId y escribe un manifiesto propio', async function () {
    expect(deploymentTarget({network:{name:'localhost'}},{})).to.deep.include({chainId:31337n,label:'local'});
    expect(deploymentTarget({network:{name:'localhost'}},{}).destination).to.match(/artifacts[\\/]deployment\.json$/);
    const vps = deploymentTarget({network:{name:'vps'}},{VPS_CHAIN_ID:'31338'});
    expect(vps).to.deep.include({chainId:31338n,label:'VPS'});
    expect(vps.destination).to.match(/artifacts[\\/]deployment\.vps\.json$/);
    const runtime = {network:{name:'vps'},ethers:{provider:{getNetwork:async () => ({chainId:31337n})}}};
    await expect(main({runtime,env:{VPS_CHAIN_ID:'31338'}})).to.be.rejectedWith('31338');
  });

  it('el despliegue exige una cuenta administradora y otra de oráculo', async function () {
    const hre = {ethers:{getSigners:async () => [{address:'0x1'}]}};
    await expect(deployContracts(hre)).to.be.rejectedWith('dos cuentas');
  });

  it('la entrada CLI del nodo delega el arranque y comunica un puerto inválido sin exponer errores internos', async function () {
    const calls = [];
    const messages = [];
    const operator = {};
    const logger = {error:message => messages.push(message)};
    expect(await runChainCli({options:{port:18545,runtime:{run:async (...args) => calls.push(args)}},operator,logger})).to.equal(true);
    expect(calls).to.deep.equal([['node',{hostname:'127.0.0.1',port:18545}]]);
    expect(await runChainCli({options:{port:80},operator,logger})).to.equal(null);
    expect(operator.exitCode).to.equal(1);
    expect(messages).to.deep.equal(['No fue posible iniciar el nodo local. Comprueba el puerto del proyecto.']);
  });

  it('la entrada CLI del despliegue comunica un fallo de red sin crear un manifiesto', async function () {
    const operator = {};
    const messages = [];
    const destination = path.resolve('.cache/test-chain/rejected-deployment.json');
    await fs.rm(destination,{force:true});
    const runtime = {ethers:{provider:{getNetwork:async () => ({chainId:1n})}}};
    const result = await runDeployCli({options:{runtime,destination},operator,logger:{error:message => messages.push(message)}});
    expect(result).to.equal(null);
    expect(operator.exitCode).to.equal(1);
    expect(messages).to.deep.equal(['No fue posible desplegar los contratos. Comprueba el nodo local y ejecuta npm run compile.']);
    await expect(fs.access(destination)).to.be.rejected;
  });
});
