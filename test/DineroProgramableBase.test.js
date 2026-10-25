const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("⚡ DineroProgramableBase — Suite de Pruebas TDD", function () {
  let contrato;
  let admin, oraculoIA, campesino, atacante;
  const depositoInicial = ethers.parseEther("5.0"); // 5 ETH en garantía

  beforeEach(async function () {
    // Obtenemos cuentas simuladas proporcionadas por Hardhat Network
    [admin, oraculoIA, campesino, atacante] = await ethers.getSigners();

    // Desplegamos el contrato con 5 ETH en el constructor
    const DineroProgramableFactory = await ethers.getContractFactory("DineroProgramableBase");
    contrato = await DineroProgramableFactory.deploy(oraculoIA.address, {
      value: depositoInicial,
    });
  });

  describe("1. Inicialización y Custodia (Escrow)", function () {
    it("Debería registrar correctamente al administrador y al oráculo de IA", async function () {
      expect(await contrato.administrador()).to.equal(admin.address);
      expect(await contrato.oraculoIA()).to.equal(oraculoIA.address);
    });

    it("Debería almacenar el balance en garantía inicial", async function () {
      expect(await contrato.totalEnGarantia()).to.equal(depositoInicial);
      expect(await contrato.consultarBalanceContrato()).to.equal(depositoInicial);
    });

    it("Debería permitir depósitos adicionales de garantía y emitir evento", async function () {
      const montoAdicional = ethers.parseEther("2.0");
      await expect(contrato.connect(admin).depositarGarantia({ value: montoAdicional }))
        .to.emit(contrato, "FondosDepositados")
        .withArgs(admin.address, montoAdicional, ethers.parseEther("7.0"));

      expect(await contrato.totalEnGarantia()).to.equal(ethers.parseEther("7.0"));
    });
  });

  describe("2. Lógica Programable & Evaluación por IA", function () {
    it("Debería RECHAZAR la autorización si quien llama NO es el oráculo de IA", async function () {
      const montoPago = ethers.parseEther("1.0");
      await expect(
        contrato.connect(atacante).autorizarPagoCondicional(1, campesino.address, montoPago, 95)
      ).to.be.revertedWithCustomError(contrato, "NoAutorizado");
    });

    it("Debería RECHAZAR el pago si el puntaje de calidad certificado por IA es menor al 90%", async function () {
      const montoPago = ethers.parseEther("1.0");
      const puntajeInsuficiente = 82; // Leche contaminada o miel con agua

      await expect(
        contrato.connect(oraculoIA).autorizarPagoCondicional(2, campesino.address, montoPago, puntajeInsuficiente)
      ).to.be.revertedWithCustomError(contrato, "CondicionNoCumplida")
       .withArgs(puntajeInsuficiente, 90);
    });

    it("Debería AUTORIZAR el pago cuando la IA certifica calidad >= 90% y emitir evento", async function () {
      const montoPago = ethers.parseEther("1.5");
      const puntajeExcelente = 96;

      await expect(
        contrato.connect(oraculoIA).autorizarPagoCondicional(3, campesino.address, montoPago, puntajeExcelente)
      ).to.emit(contrato, "PagoAutorizadoPorIA")
       .withArgs(3, campesino.address, montoPago, puntajeExcelente);

      // Verificamos que el saldo pendiente del campesino se incrementó
      expect(await contrato.saldosPendientes(campesino.address)).to.equal(montoPago);

      // Verificamos que el total en garantía disponible disminuyó
      expect(await contrato.totalEnGarantia()).to.equal(ethers.parseEther("3.5"));
    });
  });

  describe("3. Retiro Seguro de Fondos (Patrón Pull & CEI)", function () {
    const montoPago = ethers.parseEther("1.5");

    beforeEach(async function () {
      // Autorizamos un pago previo para el campesino
      await contrato.connect(oraculoIA).autorizarPagoCondicional(10, campesino.address, montoPago, 98);
    });

    it("Debería permitir al campesino retirar sus fondos autorizados", async function () {
      const saldoInicial = await ethers.provider.getBalance(campesino.address);

      // El campesino ejecuta el retiro
      const tx = await contrato.connect(campesino).retirarMiDinero();
      const receipt = await tx.wait();
      const costoGas = receipt.gasUsed * receipt.gasPrice;

      const saldoFinal = await ethers.provider.getBalance(campesino.address);

      // Comprobamos que el balance del campesino aumentó (montoPago - costoGas)
      expect(saldoFinal).to.equal(saldoInicial + montoPago - costoGas);

      // Comprobamos que su saldo pendiente en el contrato ahora es 0
      expect(await contrato.saldosPendientes(campesino.address)).to.equal(0);
    });

    it("Debería RECHAZAR un segundo intento de retiro consecutivo (Sin saldo)", async function () {
      // Primer retiro exitoso
      await contrato.connect(campesino).retirarMiDinero();

      // Segundo retiro falla inmediatamente
      await expect(
        contrato.connect(campesino).retirarMiDinero()
      ).to.be.revertedWithCustomError(contrato, "SinSaldoPendiente");
    });
  });
});
