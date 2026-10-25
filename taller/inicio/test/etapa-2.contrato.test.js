const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

async function desplegar() {
  const [admin, oraculo, productor] = await ethers.getSigners();
  const contrato = await (await ethers.getContractFactory('GarantiaAgroPay')).deploy(oraculo.address);
  return { contrato, admin, oraculo, productor };
}

describe('Etapa 2 · Primer contrato', () => {
  it('registra el oráculo al desplegar', async () => {
    const { contrato, oraculo } = await loadFixture(desplegar);
    expect(await contrato.oraculo()).to.equal(oraculo.address);
    expect(await contrato.garantiaDisponible()).to.equal(0n);
  });

  it('no se despliega sin una dirección de oráculo', async () => {
    const fabrica = await ethers.getContractFactory('GarantiaAgroPay');
    await expect(fabrica.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(fabrica, 'DireccionInvalida');
  });

  it('suma cada depósito a la garantía y emite un evento', async () => {
    const { contrato, admin } = await loadFixture(desplegar);
    const monto = ethers.parseEther('1');
    await expect(contrato.depositarGarantia({ value: monto }))
      .to.emit(contrato, 'GarantiaDepositada').withArgs(admin.address, monto);
    await contrato.depositarGarantia({ value: monto });
    expect(await contrato.garantiaDisponible()).to.equal(ethers.parseEther('2'));
    expect(await ethers.provider.getBalance(await contrato.getAddress())).to.equal(ethers.parseEther('2'));
  });

  it('rechaza un depósito de cero', async () => {
    const { contrato } = await loadFixture(desplegar);
    await expect(contrato.depositarGarantia({ value: 0 })).to.be.revertedWithCustomError(contrato, 'MontoInvalido');
  });
});
