const {expect} = require('chai');
const fs = require('node:fs/promises');
const path = require('node:path');
const {ethers} = require('hardhat');
const {deployContracts} = require('../backend/chain/deployment.cjs');
const {createChainRuntime} = require('../backend/chain/runtime.cjs');
const {createConnection} = require('../backend/chain/connection.cjs');
const {confirmed} = require('../backend/chain/receipts.cjs');
const {serialize} = require('../backend/chain/events.cjs');
const {amount,quality} = require('../backend/chain/payments.cjs');
const {proofAssetHashes} = require('../backend/chain/proof-assets.cjs');

describe('Adaptador EVM del aula con contratos desplegados', function () {
  let runtime,provider,manifestPath,manifest;
  before(async function () {
    this.timeout(120000);
    manifest = await deployContracts(require('hardhat'));
    manifestPath = path.resolve('.cache/test-chain/deployment.json');
    await fs.mkdir(path.dirname(manifestPath),{recursive:true});
    await fs.writeFile(manifestPath,JSON.stringify(manifest));
    provider = new ethers.BrowserProvider(require('hardhat').network.provider,undefined,{cacheTimeout:-1});
    runtime = createChainRuntime({provider,manifestPath});
  });
  after(() => runtime.close());

  it('informa la red real y rechaza proveedores remotos o manifiestos inválidos', async function () {
    expect((await runtime.health()).connected).to.equal(true);
    expect(() => createConnection({rpcUrl:'https://example.com'})).to.throw('equipo local');
    const absent = createConnection({provider,manifestPath:manifestPath+'.absent'});
    expect((await absent.health()).connected).to.equal(false);
    await expect(absent.context()).to.be.rejected;
    const wrong = {...manifest,chainId:1};
    await fs.writeFile(manifestPath,JSON.stringify(wrong));
    await expect(runtime.execute('evm',{})).to.be.rejectedWith('manifiesto');
    await fs.writeFile(manifestPath,JSON.stringify({...manifest,deployedAtBlock:999999}));
    await expect(runtime.execute('evm',{})).to.be.rejectedWith('reinició');
    await fs.writeFile(manifestPath,JSON.stringify({...manifest,deployedBlockHash:ethers.ZeroHash}));
    await expect(runtime.execute('evm',{})).to.be.rejectedWith('reinició');
    await fs.writeFile(manifestPath,JSON.stringify(manifest));
  });

  it('mide depósito, autorización y retiro sin convertir una denegación en éxito', async function () {
    const result = await runtime.execute('pipeline',{temperature:3.5,acidity:16,amountEth:'0.01'});
    expect(result.approved).to.equal(true);
    expect(result.receipts).to.have.length(3);
    expect(result.pendingWei).to.equal('0');
    expect(result.balanceAfterWei).to.equal(result.balanceBeforeWei);
    const denied = await runtime.execute('pipeline',{temperature:9,acidity:25});
    expect(denied.approved).to.equal(false);
    expect(denied.receipts).to.have.length(0);
    expect(denied.balanceAfterWei).to.equal(denied.balanceBeforeWei);
  });

  it('ejecuta todas las operaciones preparadas del taller EVM', async function () {
    const deposit = await runtime.execute('evm',{amountEth:'0.01'});
    expect(BigInt(deposit.balanceAfterWei)-BigInt(deposit.balanceBeforeWei)).to.equal(ethers.parseEther('0.01'));
    expect((await runtime.execute('evm',{action:'agropay',amountWei:'100'})).receipt.status).to.equal(1);
    const token = await runtime.execute('evm',{action:'erc20',amountWei:'100'});
    expect(BigInt(token.beneficiaryAfterWei)-BigInt(token.beneficiaryBeforeWei)).to.equal(100n);
    expect((await runtime.execute('evm',{action:'escrow'})).state).to.equal(3);
    expect((await runtime.execute('evm',{action:'escrow',refund:true})).state).to.equal(4);
    expect((await runtime.execute('evm',{action:'certificate'})).authentic).to.equal(true);
    await expect(runtime.execute('evm',{action:'arbitrary'})).to.be.rejectedWith('operación disponible');
    await expect(runtime.execute('arbitrary',{})).to.be.rejectedWith('adaptador EVM');
  });

  it('consulta la cuarentena y certificación confirmadas y rechaza parámetros inválidos', async function () {
    const first = await runtime.execute('pharma',{batchId:'API-01',temperature:10});
    expect(first.quarantine).to.equal(true);
    expect((await runtime.execute('pharma',{batchId:'API-01',temperature:4.2})).quarantine).to.equal(true);
    expect((await runtime.execute('pharma',{})).quarantine).to.equal(false);
    await expect(runtime.execute('pharma',{temperature:Infinity})).to.be.rejectedWith('temperatura');
    const honey = await runtime.execute('honey',{batchId:'MIEL-API',humidity:17.2,hmf:14,deltaC13:-26.4});
    expect(honey.documentHash).to.equal(honey.registeredHash);
    await expect(runtime.execute('honey',{humidity:-1})).to.be.rejectedWith('parámetros');
    await expect(runtime.execute('honey',{humidity:21})).to.be.rejected;
  });

  it('contrasta predicciones y mide gas de dos recorridos sobre la red local', async function () {
    const result = await runtime.execute('myths',{prediction:'approved'});
    expect(result.predictionCorrect).to.equal(true);
    expect((await runtime.execute('myths',{prediction:'rejected',temperature:9})).predictionCorrect).to.equal(true);
    expect((await runtime.execute('architecture',{})).receipt.status).to.equal(1);
    const comparison = await runtime.execute('comparison',{});
    expect(BigInt(comparison.nativeGas)).to.be.greaterThan(0n);
    expect(BigInt(comparison.tokenGas)).to.be.greaterThan(0n);
    expect(comparison.receipts).to.have.length(7);
  });

  it('prueba criptografía real y no admite pruebas alteradas ni repetidas', async function () {
    this.timeout(120000);
    const result = await runtime.execute('elections',{voterId:'integración-1',candidate:1});
    expect(result.verified).to.equal(true);
    expect(BigInt(result.votesAfter)-BigInt(result.votesBefore)).to.equal(1n);
    await expect(runtime.execute('elections',{voterId:'integración-1',candidate:1})).to.be.rejected;
    await expect(runtime.execute('elections',{voterId:'integración-2',candidate:2,scenario:'invalid'})).to.be.rejectedWith('alterada');
    const replay = await runtime.execute('elections',{voterId:'integración-3',candidate:2,scenario:'replay'});
    expect(replay.replayRejected).to.equal(true);
    expect(BigInt(replay.votesAfter)-BigInt(replay.votesBefore)).to.equal(1n);
    await expect(runtime.execute('elections',{candidate:0})).to.be.rejectedWith('tres opciones');
    const hashes = await proofAssetHashes(process.cwd());
    expect(hashes.wasm).to.match(/^[a-f0-9]{64}$/);
    expect(hashes.zkey).to.match(/^[a-f0-9]{64}$/);
  });

  it('extrae eventos confirmados con identificadores estables y valores serializables', async function () {
    const events = await runtime.events();
    expect(events.some(event => event.name === 'FondosRetirados')).to.equal(true);
    expect(events.every(event => event.deploymentId === manifest.id && event.txHash.startsWith('0x'))).to.equal(true);
    expect(serialize([1n,2,'texto'])).to.deep.equal(['1',2,'texto']);
    expect(() => JSON.stringify(events)).not.to.throw();
  });

  it('valida montos y evita anunciar una transacción fallida como confirmada', async function () {
    expect(amount({})).to.equal(ethers.parseEther('0.01'));
    expect(() => amount({amountWei:'0'})).to.throw('monto');
    expect(() => amount({amountEth:'11'})).to.throw('monto');
    expect(quality({})).to.equal(98);
    expect(() => quality({temperature:'texto'})).to.throw('numéricas');
    await expect(confirmed(Promise.resolve({wait:async () => ({status:0})}))).to.be.rejectedWith('confirmada');
    const local = createConnection({rpcUrl:'http://127.0.0.1:18599',manifestPath});
    local.close();
  });
});
