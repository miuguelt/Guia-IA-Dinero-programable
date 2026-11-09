const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("☕ DispensadorDigital — Pruebas de Mi Primer Contrato (Taller)", function () {
  let dispensador;
  let dueno, comprador, curioso;
  const precioArticulo = ethers.parseEther("0.05");

  beforeEach(async function () {
    [dueno, comprador, curioso] = await ethers.getSigners();

    const FabricaDispensador = await ethers.getContractFactory("DispensadorDigital");
    dispensador = await FabricaDispensador.deploy(precioArticulo);
  });

  it("Debería inicializar el precio y el dueño correctamente", async function () {
    expect(await dispensador.precioArticulo()).to.equal(precioArticulo);
    expect(await dispensador.dueno()).to.equal(dueno.address);
    expect(await dispensador.totalVentas()).to.equal(0);
  });

  it("Debería permitir una compra exitosa y emitir CompraExitosa", async function () {
    await expect(dispensador.connect(comprador).comprar({ value: precioArticulo }))
      .to.emit(dispensador, "CompraExitosa")
      .withArgs(comprador.address, precioArticulo, 1);

    expect(await dispensador.totalVentas()).to.equal(1);
    expect(await dispensador.obtenerBalance()).to.equal(precioArticulo);
  });

  it("Debería rechazar compras con pago insuficiente", async function () {
    const pagoInsuficiente = ethers.parseEther("0.01");
    await expect(
      dispensador.connect(comprador).comprar({ value: pagoInsuficiente })
    ).to.be.revertedWithCustomError(dispensador, "PagoInsuficiente");
  });

  it("Debería permitir al dueño retirar las ganancias y rechazar a terceros", async function () {
    await dispensador.connect(comprador).comprar({ value: precioArticulo });

    await expect(
      dispensador.connect(curioso).retirarGanancias()
    ).to.be.revertedWithCustomError(dispensador, "SoloDuenoPuedeRetirar");

    await expect(dispensador.connect(dueno).retirarGanancias())
      .to.emit(dispensador, "FondosRetirados")
      .withArgs(dueno.address, precioArticulo);

    expect(await dispensador.obtenerBalance()).to.equal(0);
  });
});
