const {expect} = require('chai');
const {ethers} = require('hardhat');

describe('Custodia ERC-20 con tokens que no siguen el estándar al pie de la letra', function () {
  async function desplegar(nombreToken, ...argumentos) {
    const [admin,oracle,beneficiary] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory(nombreToken)).deploy(...argumentos);
    const base = await (await ethers.getContractFactory('DineroProgramableERC20')).deploy(await token.getAddress(),oracle.address);
    return {admin,oracle,beneficiary,token,base};
  }

  it('acepta depósito y retiro con un token que no devuelve bool', async function () {
    const {oracle,beneficiary,token,base} = await desplegar('TokenSinRetorno',1000);
    await base.depositarGarantiaTokens(400);
    expect(await token.balanceOf(await base.getAddress())).to.equal(400);
    await base.connect(oracle).autorizarPagoCondicionalTokens(1,beneficiary.address,150,95);
    await expect(base.connect(beneficiary).retirarMiDineroTokens()).to.emit(base,'FondosRetirados').withArgs(beneficiary.address,150);
    expect(await token.balanceOf(beneficiary.address)).to.equal(150);
    expect(await base.saldosPendientes(beneficiary.address)).to.equal(0);
  });

  it('revierte el depósito cuando el token devuelve false', async function () {
    const {base} = await desplegar('TokenQueRetornaFalso',false);
    await expect(base.depositarGarantiaTokens(10)).to.be.revertedWithCustomError(base,'FalloTransferenciaERC20');
    expect(await base.totalEnGarantia()).to.equal(0);
  });

  it('revierte el retiro cuando el token devuelve false y conserva el saldo pendiente', async function () {
    const {oracle,beneficiary,base} = await desplegar('TokenQueRetornaFalso',true);
    await base.depositarGarantiaTokens(100);
    await base.connect(oracle).autorizarPagoCondicionalTokens(2,beneficiary.address,100,95);
    await expect(base.connect(beneficiary).retirarMiDineroTokens()).to.be.revertedWithCustomError(base,'FalloTransferenciaERC20');
    expect(await base.saldosPendientes(beneficiary.address)).to.equal(100);
  });

  it('rechaza una dirección de token sin código', async function () {
    const [admin,oracle] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('DineroProgramableERC20');
    const base = await factory.deploy(admin.address,oracle.address);
    await expect(base.depositarGarantiaTokens(1)).to.be.revertedWithCustomError(base,'FalloTransferenciaERC20');
  });
});
