// Pruebas del contrato: cada operación del CRUD con su caso válido y sus rechazos.
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('RegistroProductos · el CRUD como contrato', () => {
  let contrato, responsable, otra;

  beforeEach(async () => {
    [responsable, otra] = await ethers.getSigners();
    contrato = await (await ethers.getContractFactory('RegistroProductos')).deploy();
  });

  it('crear guarda el producto, asigna el id y emite ProductoCreado', async () => {
    await expect(contrato.crear('Café', 12000))
      .to.emit(contrato, 'ProductoCreado').withArgs(1, responsable.address, 'Café', 12000);
    expect(await contrato.totalProductos()).to.equal(1n);
    const producto = await contrato.obtener(1);
    expect([producto.nombre, producto.precio, producto.responsable, producto.activo])
      .to.deep.equal(['Café', 12000n, responsable.address, true]);
  });

  it('crear rechaza un nombre vacío y no consume un id', async () => {
    await expect(contrato.crear('', 100)).to.be.revertedWithCustomError(contrato, 'NombreVacio');
    expect(await contrato.totalProductos()).to.equal(0n);
  });

  it('obtener rechaza un id que no existe', async () => {
    await expect(contrato.obtener(7)).to.be.revertedWithCustomError(contrato, 'ProductoInexistente').withArgs(7);
  });

  it('actualizarPrecio cambia el valor y deja el anterior en el evento', async () => {
    await contrato.crear('Café', 12000);
    await expect(contrato.actualizarPrecio(1, 13500))
      .to.emit(contrato, 'PrecioActualizado').withArgs(1, 12000, 13500);
    expect((await contrato.obtener(1)).precio).to.equal(13500n);
  });

  it('solo el responsable actualiza o desactiva', async () => {
    await contrato.crear('Café', 12000);
    await expect(contrato.connect(otra).actualizarPrecio(1, 1))
      .to.be.revertedWithCustomError(contrato, 'SoloResponsable').withArgs(otra.address);
    await expect(contrato.connect(otra).desactivar(1))
      .to.be.revertedWithCustomError(contrato, 'SoloResponsable').withArgs(otra.address);
    expect((await contrato.obtener(1)).precio).to.equal(12000n);
  });

  it('desactivar marca el producto inactivo sin borrarlo', async () => {
    await contrato.crear('Café', 12000);
    await expect(contrato.desactivar(1)).to.emit(contrato, 'ProductoDesactivado').withArgs(1, responsable.address);
    const producto = await contrato.obtener(1);
    expect(producto.activo).to.equal(false);
    expect(producto.nombre).to.equal('Café');
  });

  it('un producto inactivo ya no se modifica', async () => {
    await contrato.crear('Café', 12000);
    await contrato.desactivar(1);
    await expect(contrato.actualizarPrecio(1, 1)).to.be.revertedWithCustomError(contrato, 'ProductoInactivo').withArgs(1);
    await expect(contrato.desactivar(1)).to.be.revertedWithCustomError(contrato, 'ProductoInactivo').withArgs(1);
  });

  it('actualizar o desactivar un id inexistente se rechaza', async () => {
    await expect(contrato.actualizarPrecio(9, 1)).to.be.revertedWithCustomError(contrato, 'ProductoInexistente').withArgs(9);
    await expect(contrato.desactivar(9)).to.be.revertedWithCustomError(contrato, 'ProductoInexistente').withArgs(9);
  });
});
