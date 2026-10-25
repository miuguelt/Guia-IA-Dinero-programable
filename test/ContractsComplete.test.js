const {expect} = require('chai');
const {ethers} = require('hardhat');
const {deployContracts} = require('../backend/chain/deployment.cjs');
const {Identity,Group,generateProof,verifyProof} = require('@semaphore-protocol/core');
const {prepareProofAssets} = require('../backend/chain/proof-assets.cjs');

describe('Contratos del aula: efectos, límites y permisos', function () {
  let entries,admin,oracle,beneficiary,outsider;
  const contract = name => new ethers.Contract(entries[name].address,entries[name].abi,admin);
  before(async function () {
    this.timeout(120000);
    [admin,oracle,beneficiary,outsider] = await ethers.getSigners();
    entries = (await deployContracts(require('hardhat'))).contracts;
  });

  it('custodia nativa rechaza cero, duplicados, falta de saldo y permisos incorrectos', async function () {
    const base = contract('DineroProgramableBase');
    await expect(base.depositarGarantia()).to.be.revertedWithCustomError(base,'MontoInvalido');
    await expect(base.connect(outsider).actualizarOraculoIA(outsider.address)).to.be.revertedWithCustomError(base,'NoAutorizado');
    await base.actualizarOraculoIA(oracle.address);
    await expect(base.connect(oracle).autorizarPagoCondicional(77,beneficiary.address,ethers.parseEther('100'),98)).to.be.revertedWithCustomError(base,'FondosInsuficientes');
    await base.connect(oracle).autorizarPagoCondicional(77,beneficiary.address,100,90);
    await expect(base.connect(oracle).autorizarPagoCondicional(77,beneficiary.address,100,98)).to.be.revertedWithCustomError(base,'MontoInvalido');
    await base.connect(beneficiary).retirarMiDinero();
    await expect(base.connect(beneficiary).retirarMiDinero()).to.be.revertedWithCustomError(base,'SinSaldoPendiente');
    expect(await base.saldosPendientes(beneficiary.address)).to.equal(0);
  });

  it('ejecuta approve, transferFrom, custodia ERC-20, autorización y retiro', async function () {
    const token = contract('TokenPractica');
    const base = contract('DineroProgramableERC20');
    expect(await token.totalSupply()).to.be.greaterThan(1000);
    await expect(base.depositarGarantiaTokens(0)).to.be.revertedWithCustomError(base,'MontoInvalido');
    await token.approve(await base.getAddress(),1000);
    expect(await token.allowance(admin.address,await base.getAddress())).to.equal(1000);
    await base.depositarGarantiaTokens(1000);
    expect(await base.consultarBalanceTokensContrato()).to.equal(1000);
    await expect(base.autorizarPagoCondicionalTokens(1,beneficiary.address,100,98)).to.be.revertedWithCustomError(base,'NoAutorizado');
    await expect(base.connect(oracle).autorizarPagoCondicionalTokens(1,beneficiary.address,100,89)).to.be.revertedWithCustomError(base,'CondicionNoCumplida');
    await expect(base.connect(oracle).autorizarPagoCondicionalTokens(1,beneficiary.address,2000,98)).to.be.revertedWithCustomError(base,'FondosInsuficientes');
    await base.connect(oracle).autorizarPagoCondicionalTokens(1,beneficiary.address,100,98);
    await expect(base.connect(oracle).autorizarPagoCondicionalTokens(1,beneficiary.address,100,98)).to.be.revertedWithCustomError(base,'LoteYaEjecutado');
    await base.connect(beneficiary).retirarMiDineroTokens();
    expect(await token.balanceOf(beneficiary.address)).to.equal(100);
    await expect(base.connect(beneficiary).retirarMiDineroTokens()).to.be.revertedWithCustomError(base,'SinSaldoPendiente');
    await expect(base.connect(outsider).actualizarOraculoIA(outsider.address)).to.be.revertedWithCustomError(base,'NoAutorizado');
    await base.actualizarOraculoIA(oracle.address);
    expect(await base.oraculoIA()).to.equal(oracle.address);
  });

  it('valida límites ERC-20 y el token no transfiere sin saldo ni autorización', async function () {
    const token = contract('TokenPractica');
    const base = contract('DineroProgramableERC20');
    await expect(base.actualizarOraculoIA(ethers.ZeroAddress)).to.be.revertedWithCustomError(base,'DireccionInvalida');
    await expect(base.connect(oracle).autorizarPagoCondicionalTokens(2,ethers.ZeroAddress,1,98)).to.be.revertedWithCustomError(base,'DireccionInvalida');
    await expect(base.connect(oracle).autorizarPagoCondicionalTokens(2,beneficiary.address,0,98)).to.be.revertedWithCustomError(base,'MontoInvalido');
    await expect(base.connect(oracle).autorizarPagoCondicionalTokens(2,beneficiary.address,1,101)).to.be.revertedWithCustomError(base,'PuntajeInvalido');
    await expect(token.approve(ethers.ZeroAddress,1)).to.be.revertedWithCustomError(token,'DireccionInvalida');
    await expect(token.transfer(ethers.ZeroAddress,1)).to.be.revertedWithCustomError(token,'DireccionInvalida');
    await expect(token.connect(outsider).transfer(admin.address,1)).to.be.revertedWithCustomError(token,'SaldoInsuficiente');
    await expect(token.connect(outsider).transferFrom(admin.address,outsider.address,1)).to.be.revertedWithCustomError(token,'PermisoInsuficiente');
    await token.transfer(outsider.address,10);
    expect(await token.balanceOf(outsider.address)).to.equal(10);
  });

  it('protege el pedido y registra despacho, entrega y reembolso', async function () {
    const shop = contract('TiendaEscrowWeb3');
    await expect(shop.pagarYBloquearEnEscrow(1,oracle.address)).to.be.revertedWithCustomError(shop,'MontoIncorrecto');
    await shop.connect(beneficiary).pagarYBloquearEnEscrow(1,oracle.address,{value:10});
    await expect(shop.pagarYBloquearEnEscrow(1,oracle.address,{value:10})).to.be.revertedWithCustomError(shop,'EstadoInvalido');
    await expect(shop.marcarDespachado(1)).to.be.revertedWithCustomError(shop,'NoAutorizado');
    await shop.connect(oracle).marcarDespachado(1);
    await expect(shop.connect(outsider).confirmarRecibidoYLiberarPago(1)).to.be.revertedWithCustomError(shop,'NoAutorizado');
    await shop.connect(beneficiary).confirmarRecibidoYLiberarPago(1);
    expect((await shop.pedidos(1)).estado).to.equal(3);
    await expect(shop.reembolsarComprador(1)).to.be.revertedWithCustomError(shop,'EstadoInvalido');
    await shop.connect(beneficiary).pagarYBloquearEnEscrow(2,oracle.address,{value:10});
    await expect(shop.connect(outsider).reembolsarComprador(2)).to.be.revertedWithCustomError(shop,'NoAutorizado');
    await shop.reembolsarComprador(2);
    expect((await shop.pedidos(2)).estado).to.equal(4);
  });

  it('emite, consulta y revoca certificados sin confundir ausencia con autenticidad', async function () {
    const cert = contract('CertificadosInmutables');
    const hash = ethers.id('documento de aprendizaje');
    expect((await cert.verificarAutenticidad(hash)).esAutentico).to.equal(false);
    await expect(cert.connect(outsider).emitirCertificado(hash,'EV-01','Entrega')).to.be.revertedWithCustomError(cert,'NoAutorizado');
    await cert.emitirCertificado(hash,'EV-01','Entrega');
    await expect(cert.emitirCertificado(hash,'EV-01','Entrega')).to.be.revertedWithCustomError(cert,'CertificadoYaExiste');
    expect((await cert.verificarAutenticidad(hash)).estaVigente).to.equal(true);
    await cert.revocarCertificado(hash,'Corrección de evidencia');
    expect((await cert.verificarAutenticidad(hash)).estaVigente).to.equal(false);
    await expect(cert.revocarCertificado(ethers.id('ausente'),'Sin registro')).to.be.revertedWithCustomError(cert,'CertificadoNoExiste');
  });

  it('telemetría rechaza lecturas repetidas, inválidas y emisores sin permiso', async function () {
    const telemetry = contract('RegistroTelemetria').connect(oracle);
    const batch = ethers.id('lote térmico');
    await telemetry.registrar(batch,20,ethers.id('lectura uno'));
    expect((await telemetry.lotes(batch)).cuarentena).to.equal(false);
    await expect(telemetry.registrar(batch,20,ethers.id('lectura uno'))).to.be.revertedWithCustomError(telemetry,'LecturaDuplicada');
    await expect(telemetry.registrar(ethers.ZeroHash,20,ethers.id('otra'))).to.be.revertedWithCustomError(telemetry,'DatoInvalido');
    await telemetry.registrar(batch,19,ethers.id('lectura dos'));
    expect((await telemetry.lotes(batch)).cuarentena).to.equal(true);
  });

  it('certifica parámetros del ejercicio de miel y rechaza alteraciones', async function () {
    const honey = contract('CertificacionMiel');
    const batch = ethers.id('miel ejercicio');
    await expect(honey.certificar(batch,ethers.id('doc'),172,140,-264)).to.be.revertedWithCustomError(honey,'NoAutorizado');
    await expect(honey.connect(oracle).certificar(batch,ethers.id('doc'),201,140,-264)).to.be.revertedWithCustomError(honey,'CondicionesIncumplidas');
    await expect(honey.connect(oracle).certificar(batch,ethers.id('doc'),1001,140,-264)).to.be.revertedWithCustomError(honey,'ParametrosInvalidos');
    await honey.connect(oracle).certificar(batch,ethers.id('doc'),200,400,-245);
    expect(await honey.certificados(batch)).to.equal(ethers.id('doc'));
    await expect(honey.connect(oracle).certificar(batch,ethers.id('doc'),172,140,-264)).to.be.revertedWithCustomError(honey,'LoteInvalido');
  });

  it('verifica prueba Semaphore real y revierte voto repetido, alterado o fuera del ámbito', async function () {
    this.timeout(120000);
    const election = contract('EleccionesSemaphore');
    const identity = new Identity();
    const group = new Group([identity.commitment]);
    await expect(election.connect(outsider).registrarElector(identity.commitment)).to.be.revertedWithCustomError(election,'NoAutorizado');
    await election.registrarElector(identity.commitment);
    const proof = await generateProof(identity,group,1,await election.ambito(),4,await prepareProofAssets(process.cwd()));
    expect(await verifyProof(proof)).to.equal(true);
    await expect(election.emitirVoto({...proof,scope:'123'})).to.be.revertedWithCustomError(election,'AmbitoInvalido');
    await expect(election.emitirVoto({...proof,message:'4'})).to.be.revertedWithCustomError(election,'OpcionInvalida');
    await expect(election.emitirVoto({...proof,message:'2'})).to.be.reverted;
    await expect(election.emitirVoto(proof)).to.emit(election,'VotoRegistrado').withArgs(1,proof.nullifier);
    expect(await election.votos(1)).to.equal(1);
    await expect(election.emitirVoto(proof)).to.be.reverted;
  });
});
