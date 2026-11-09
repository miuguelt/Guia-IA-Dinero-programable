const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("☕ DispensadorDigital — Pruebas de Mi Primer Contrato", function () {
  let dispensador;
  let dueno, comprador, curioso;
  const precioArticulo = ethers.parseEther("0.05"); // 0.05 ETH por bebida

  beforeEach(async function () {
    [dueno, comprador, curioso] = await ethers.getSigners();

    const FabricaDispensador = await ethers.getContractFactory("DispensadorDigital");
    dispensador = await FabricaDispensador.deploy(precioArticulo);
  });

  describe("1. Inicialización y Reglas de Despliegue", function () {
    it("Debería registrar correctamente el precio del artículo y la dirección del dueño", async function () {
      expect(await dispensador.precioArticulo()).to.equal(precioArticulo);
      expect(await dispensador.dueno()).to.equal(dueno.address);
      expect(await dispensador.totalVentas()).to.equal(0);
      expect(await dispensador.obtenerBalance()).to.equal(0);
    });

    it("Debería RECHAZAR el despliegue con precio cero (PrecioInvalido)", async function () {
      const FabricaDispensador = await ethers.getContractFactory("DispensadorDigital");
      await expect(FabricaDispensador.deploy(0)).to.be.revertedWithCustomError(
        dispensador,
        "PrecioInvalido"
      );
    });
  });

  describe("2. Proceso de Compra (msg.value y reversión atómica)", function () {
    it("Debería permitir la compra si se envía el monto exacto y emitir CompraExitosa", async function () {
      await expect(dispensador.connect(comprador).comprar({ value: precioArticulo }))
        .to.emit(dispensador, "CompraExitosa")
        .withArgs(comprador.address, precioArticulo, 1);

      expect(await dispensador.totalVentas()).to.equal(1);
      expect(await dispensador.obtenerBalance()).to.equal(precioArticulo);
    });

    it("Debería permitir la compra si se envía un monto superior al precio", async function () {
      const pagoSuperior = ethers.parseEther("0.1");
      await expect(dispensador.connect(comprador).comprar({ value: pagoSuperior }))
        .to.emit(dispensador, "CompraExitosa")
        .withArgs(comprador.address, pagoSuperior, 1);

      expect(await dispensador.totalVentas()).to.equal(1);
      expect(await dispensador.obtenerBalance()).to.equal(pagoSuperior);
    });

    it("Debería RECHAZAR la compra y revertir fondos si el pago es insuficiente", async function () {
      const pagoInsuficiente = ethers.parseEther("0.02");

      await expect(
        dispensador.connect(comprador).comprar({ value: pagoInsuficiente })
      ).to.be.revertedWithCustomError(dispensador, "PagoInsuficiente")
        .withArgs(pagoInsuficiente, precioArticulo);

      expect(await dispensador.totalVentas()).to.equal(0);
      expect(await dispensador.obtenerBalance()).to.equal(0);
    });
  });

  describe("3. Retiro Seguro de Ganancias", function () {
    it("Debería RECHAZAR el retiro si quien llama NO es el dueño", async function () {
      // Primero realizamos una compra para que haya saldo
      await dispensador.connect(comprador).comprar({ value: precioArticulo });

      await expect(
        dispensador.connect(curioso).retirarGanancias()
      ).to.be.revertedWithCustomError(dispensador, "SoloDuenoPuedeRetirar")
        .withArgs(curioso.address);
    });

    it("Debería RECHAZAR el retiro si el balance del contrato es cero", async function () {
      await expect(
        dispensador.connect(dueno).retirarGanancias()
      ).to.be.revertedWithCustomError(dispensador, "SinSaldoParaRetirar");
    });

    it("Debería permitir al dueño retirar todos los fondos y emitir FondosRetirados", async function () {
      // 2 compras consecutivas
      await dispensador.connect(comprador).comprar({ value: precioArticulo });
      await dispensador.connect(curioso).comprar({ value: precioArticulo });

      const balanceEsperado = precioArticulo * 2n;
      expect(await dispensador.obtenerBalance()).to.equal(balanceEsperado);

      await expect(dispensador.connect(dueno).retirarGanancias())
        .to.emit(dispensador, "FondosRetirados")
        .withArgs(dueno.address, balanceEsperado);

      expect(await dispensador.obtenerBalance()).to.equal(0);
    });
  });
});
