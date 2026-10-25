const {expect} = require('chai');
const {ethers,network} = require('hardhat');

describe('Existencia de certificado independiente de su fecha', function () {
  it('conserva autenticidad, duplicados y revocación aunque la fecha sea cero', async function () {
    const cert = await (await ethers.getContractFactory('CertificadosInmutables')).deploy();
    const hash = ethers.id('evidencia con fecha de metadatos cero');
    await cert.emitirCertificado(hash,'EV-FECHA','Registro de prueba');
    const baseSlot = BigInt(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32','uint256'],[hash,0])));
    const dateSlot = ethers.toBeHex(baseSlot+4n,32);
    await network.provider.send('hardhat_setStorageAt',[await cert.getAddress(),dateSlot,ethers.ZeroHash]);
    const result = await cert.verificarAutenticidad(hash);
    expect(result.fechaEmision).to.equal(0);
    expect(result.esAutentico).to.equal(true);
    await expect(cert.emitirCertificado(hash,'EV-FECHA','Duplicado')).to.be.revertedWithCustomError(cert,'CertificadoYaExiste');
    await cert.revocarCertificado(hash,'Corrección de metadatos');
    expect((await cert.verificarAutenticidad(hash)).estaVigente).to.equal(false);
  });
});
