const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Validaciones del aula local', function () {
  it('rechaza un oráculo nulo y autorizaciones sin valor', async function () {
    const [admin, oracle, beneficiary] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('DineroProgramableBase');
    await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, 'DireccionInvalida');
    const contract = await factory.deploy(oracle.address, {value: 1000});
    await expect(contract.connect(oracle).autorizarPagoCondicional(1, beneficiary.address, 0, 98))
      .to.be.revertedWithCustomError(contract, 'MontoInvalido');
    await expect(contract.connect(oracle).autorizarPagoCondicional(1, ethers.ZeroAddress, 1, 98))
      .to.be.revertedWithCustomError(contract, 'DireccionInvalida');
    await expect(contract.connect(oracle).autorizarPagoCondicional(1, beneficiary.address, 1, 101))
      .to.be.revertedWithCustomError(contract, 'PuntajeInvalido');
    await expect(contract.connect(admin).actualizarOraculoIA(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(contract, 'DireccionInvalida');
  });

  it('impide crear pedidos con destinatario nulo y reembolsar pedidos inexistentes', async function () {
    const factory = await ethers.getContractFactory('TiendaEscrowWeb3');
    const contract = await factory.deploy();
    await expect(contract.pagarYBloquearEnEscrow(1, ethers.ZeroAddress, {value: 10}))
      .to.be.revertedWithCustomError(contract, 'DireccionInvalida');
    await expect(contract.reembolsarComprador(100)).to.be.revertedWithCustomError(contract, 'EstadoInvalido');
  });

  it('no emite certificados vacíos', async function () {
    const factory = await ethers.getContractFactory('CertificadosInmutables');
    const contract = await factory.deploy();
    await expect(contract.emitirCertificado(ethers.ZeroHash, 'CODIGO', 'Descripción'))
      .to.be.revertedWithCustomError(contract, 'DatosInvalidos');
  });

  it('mantiene cuarentena después de una lectura posterior dentro del intervalo', async function () {
    const [admin, oracle] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('RegistroTelemetria');
    const contract = await factory.deploy(oracle.address);
    const batch = ethers.id('LOTE-01');
    await contract.connect(oracle).registrar(batch, 95, ethers.id('lectura-1'));
    await contract.connect(oracle).registrar(batch, 42, ethers.id('lectura-2'));
    expect((await contract.lotes(batch)).cuarentena).to.equal(true);
    await expect(contract.connect(admin).registrar(batch, 42, ethers.id('lectura-3')))
      .to.be.revertedWithCustomError(contract, 'NoAutorizado');
  });
});
