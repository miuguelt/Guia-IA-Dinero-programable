const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const UN_ETH = ethers.parseEther('1');

async function conGarantia() {
  const [admin, oraculo, productor, otro] = await ethers.getSigners();
  const contrato = await (await ethers.getContractFactory('GarantiaAgroPay')).deploy(oraculo.address);
  await contrato.depositarGarantia({ value: ethers.parseEther('2') });
  return { contrato, admin, oraculo, productor, otro };
}

describe('Etapa 3 · Permisos y retiro seguro', () => {
  describe('autorizarPago', () => {
    it('reserva el pago del productor y descuenta la garantía', async () => {
      const { contrato, oraculo, productor } = await loadFixture(conGarantia);
      await expect(contrato.connect(oraculo).autorizarPago(7, productor.address, UN_ETH))
        .to.emit(contrato, 'PagoAutorizado').withArgs(7, productor.address, UN_ETH);
      expect(await contrato.saldoPendiente(productor.address)).to.equal(UN_ETH);
      expect(await contrato.garantiaDisponible()).to.equal(UN_ETH);
      expect(await contrato.loteAutorizado(7)).to.equal(true);
    });

    it('solo el oráculo puede autorizar', async () => {
      const { contrato, otro, productor } = await loadFixture(conGarantia);
      await expect(contrato.connect(otro).autorizarPago(1, productor.address, UN_ETH))
        .to.be.revertedWithCustomError(contrato, 'SoloOraculo').withArgs(otro.address);
    });

    it('no autoriza dos veces el mismo lote', async () => {
      const { contrato, oraculo, productor } = await loadFixture(conGarantia);
      await contrato.connect(oraculo).autorizarPago(1, productor.address, UN_ETH);
      await expect(contrato.connect(oraculo).autorizarPago(1, productor.address, UN_ETH))
        .to.be.revertedWithCustomError(contrato, 'LoteYaAutorizado').withArgs(1);
    });

    it('no promete más dinero del que hay en garantía', async () => {
      const { contrato, oraculo, productor } = await loadFixture(conGarantia);
      await expect(contrato.connect(oraculo).autorizarPago(1, productor.address, ethers.parseEther('3')))
        .to.be.revertedWithCustomError(contrato, 'FondosInsuficientes').withArgs(ethers.parseEther('2'), ethers.parseEther('3'));
    });

    it('valida productor y monto', async () => {
      const { contrato, oraculo, productor } = await loadFixture(conGarantia);
      await expect(contrato.connect(oraculo).autorizarPago(1, ethers.ZeroAddress, UN_ETH))
        .to.be.revertedWithCustomError(contrato, 'DireccionInvalida');
      await expect(contrato.connect(oraculo).autorizarPago(1, productor.address, 0))
        .to.be.revertedWithCustomError(contrato, 'MontoInvalido');
    });
  });

  describe('retirar', () => {
    it('transfiere el saldo al productor y lo deja en cero', async () => {
      const { contrato, oraculo, productor } = await loadFixture(conGarantia);
      await contrato.connect(oraculo).autorizarPago(1, productor.address, UN_ETH);
      const tx = contrato.connect(productor).retirar();
      await expect(tx).to.changeEtherBalances([productor, contrato], [UN_ETH, -UN_ETH]);
      await expect(tx).to.emit(contrato, 'PagoRetirado').withArgs(productor.address, UN_ETH);
      expect(await contrato.saldoPendiente(productor.address)).to.equal(0n);
    });

    it('rechaza un retiro sin saldo, también el segundo intento', async () => {
      const { contrato, oraculo, productor } = await loadFixture(conGarantia);
      await expect(contrato.connect(productor).retirar()).to.be.revertedWithCustomError(contrato, 'SinSaldoPendiente');
      await contrato.connect(oraculo).autorizarPago(1, productor.address, UN_ETH);
      await contrato.connect(productor).retirar();
      await expect(contrato.connect(productor).retirar()).to.be.revertedWithCustomError(contrato, 'SinSaldoPendiente');
    });

    it('resiste un intento de reentrada', async () => {
      const { contrato, oraculo } = await loadFixture(conGarantia);
      const atacante = await (await ethers.getContractFactory('AtacanteRetiro')).deploy(await contrato.getAddress());
      await contrato.connect(oraculo).autorizarPago(1, await atacante.getAddress(), UN_ETH);

      await atacante.atacar();

      expect(await atacante.intentosReentrada()).to.equal(1n);
      expect(await atacante.reentradaExitosa()).to.equal(false);
      expect(await ethers.provider.getBalance(await atacante.getAddress())).to.equal(UN_ETH);
      expect(await ethers.provider.getBalance(await contrato.getAddress())).to.equal(UN_ETH);
    });

    it('conserva el saldo si el destinatario rechaza el pago', async () => {
      const { contrato, oraculo } = await loadFixture(conGarantia);
      const receptor = await (await ethers.getContractFactory('ReceptorQueRechaza')).deploy();
      const direccion = await receptor.getAddress();
      await contrato.connect(oraculo).autorizarPago(1, direccion, UN_ETH);

      await expect(receptor.retirarDe(await contrato.getAddress()))
        .to.be.revertedWithCustomError(contrato, 'FalloTransferencia');
      expect(await contrato.saldoPendiente(direccion)).to.equal(UN_ETH);
    });
  });

  describe('experimentos de seguridad guiados', () => {
    it('el script de experimentos guiados de seguridad se ejecuta y neutraliza todos los ataques', async () => {
      const { probarSeguridad } = require('../scripts/probar-seguridad');
      const logs = [];
      const exito = await probarSeguridad({ log: msg => logs.push(msg) });
      expect(exito).to.equal(true);
      expect(logs.some(l => l.includes('EXPERIMENTO 1: Alteración de datos'))).to.be.true;
      expect(logs.some(l => l.includes('EXPERIMENTO 2: Ataque de repetición'))).to.be.true;
      expect(logs.some(l => l.includes('EXPERIMENTO 3: Control de acceso'))).to.be.true;
      expect(logs.some(l => l.includes('EXPERIMENTO 4: Resistencia contra ataque de reentrada'))).to.be.true;
    });
  });
});
