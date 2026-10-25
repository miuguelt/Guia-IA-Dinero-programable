const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { contenidoFirmado, firmarLectura, crearVerificador, procesarLectura } = require('../src/oraculo');

const LECTURA = { idLote: 1, temperatura: 3.5, acidez: 16, nonce: 'lectura-1' };

async function preparar() {
  const [, oraculo, productor, intruso] = await ethers.getSigners();
  const contrato = await (await ethers.getContractFactory('GarantiaAgroPay')).deploy(oraculo.address);
  await contrato.depositarGarantia({ value: ethers.parseEther('2') });
  return { contrato, oraculo, productor, intruso };
}

describe('Etapa 4 · Oráculo firmado', () => {
  it('firma siempre el mismo texto para la misma lectura', () => {
    expect(contenidoFirmado({ nonce: 'n', acidez: 16, temperatura: 3.5, idLote: 1, extra: 'ignorado' }))
      .to.equal('{"idLote":1,"temperatura":3.5,"acidez":16,"nonce":"n"}');
  });

  it('acepta una lectura firmada por el oráculo registrado', async () => {
    const { oraculo } = await loadFixture(preparar);
    const paquete = await firmarLectura(oraculo, LECTURA);
    expect(paquete.firma).to.match(/^0x[0-9a-f]{130}$/);
    expect(crearVerificador(oraculo.address).verificar(paquete)).to.deep.equal(LECTURA);
  });

  it('rechaza una lectura alterada después de firmar', async () => {
    const { oraculo } = await loadFixture(preparar);
    const paquete = await firmarLectura(oraculo, LECTURA);
    paquete.lectura.temperatura = 2;
    expect(() => crearVerificador(oraculo.address).verificar(paquete)).to.throw('La firma no corresponde')
      .with.property('codigo', 'FIRMA_INVALIDA');
  });

  it('rechaza una lectura firmada por otra cuenta', async () => {
    const { oraculo, intruso } = await loadFixture(preparar);
    const paquete = await firmarLectura(intruso, LECTURA);
    expect(() => crearVerificador(oraculo.address).verificar(paquete)).to.throw().with.property('codigo', 'FIRMA_INVALIDA');
  });

  it('rechaza repetir la misma lectura', async () => {
    const { oraculo } = await loadFixture(preparar);
    const paquete = await firmarLectura(oraculo, LECTURA);
    const verificador = crearVerificador(oraculo.address);
    verificador.verificar(paquete);
    expect(() => verificador.verificar(paquete)).to.throw().with.property('codigo', 'LECTURA_REPETIDA');
  });

  it('autoriza el pago en el contrato cuando la lectura cumple', async () => {
    const { contrato, oraculo, productor } = await loadFixture(preparar);
    const resultado = await procesarLectura({
      contrato: contrato.connect(oraculo),
      verificador: crearVerificador(oraculo.address),
      paquete: await firmarLectura(oraculo, LECTURA),
      productor: productor.address,
      monto: ethers.parseEther('1'),
    });
    expect(resultado.aprobada).to.equal(true);
    expect(resultado.txHash).to.match(/^0x[0-9a-f]{64}$/);
    expect(await contrato.saldoPendiente(productor.address)).to.equal(ethers.parseEther('1'));
  });

  it('no envía transacción cuando la lectura no cumple', async () => {
    const { contrato, oraculo, productor } = await loadFixture(preparar);
    const resultado = await procesarLectura({
      contrato: contrato.connect(oraculo),
      verificador: crearVerificador(oraculo.address),
      paquete: await firmarLectura(oraculo, { ...LECTURA, temperatura: 9 }),
      productor: productor.address,
      monto: ethers.parseEther('1'),
    });
    expect(resultado).to.deep.equal({ aprobada: false, motivos: ['Temperatura 9 °C supera el máximo de 4 °C.'], txHash: null });
    expect(await contrato.saldoPendiente(productor.address)).to.equal(0n);
  });
});
