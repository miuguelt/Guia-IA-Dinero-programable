const {expect} = require('chai');
const {ethers} = require('hardhat');

describe('Retiro seguro con receptor adversarial real', function () {
  it('rechaza la reentrada y conserva el saldo pendiente si el receptor no acepta fondos', async function () {
    const [admin,oracle] = await ethers.getSigners();
    const base = await (await ethers.getContractFactory('DineroProgramableBase')).deploy(oracle.address,{value:1000});
    const receiver = await (await ethers.getContractFactory('AdversarioRetiro')).deploy(await base.getAddress());
    const recipient = await receiver.getAddress();
    await base.connect(oracle).autorizarPagoCondicional(1,recipient,100,98);
    await receiver.retirar(false);
    expect(await receiver.reentradaExitosa()).to.equal(false);
    expect(await ethers.provider.getBalance(recipient)).to.equal(100);
    expect(await base.saldosPendientes(recipient)).to.equal(0);
    await base.connect(oracle).autorizarPagoCondicional(2,recipient,100,98);
    await expect(receiver.retirar(true)).to.be.revertedWithCustomError(base,'FalloTransferencia');
    expect(await base.saldosPendientes(recipient)).to.equal(100);
    expect(await base.consultarBalanceContrato()).to.equal(900);
    expect(await ethers.provider.getBalance(recipient)).to.equal(100);
    expect(await base.administrador()).to.equal(admin.address);
  });
});
