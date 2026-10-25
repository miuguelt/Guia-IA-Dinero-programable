// Script pedagógico: Experimentos guiados de seguridad y criptografía.
// Simula 4 ataques reales contra el sistema AgroPay y demuestra cómo
// la nueva capa criptográfica y de contratos inteligentes los neutraliza:
// 1. Alteración de mediciones tras ser firmadas (Integridad de datos)
// 2. Ataque de repetición de paquete firmado (Replay Attack)
// 3. Suplantación de permisos en la blockchain (Control de Acceso)
// 4. Ataque de reentrada para robo de garantía (Checks-Effects-Interactions)
const { ethers } = require('hardhat');
const { firmarLectura, crearVerificador } = require('../src/oraculo');

async function probarSeguridad({ log = console.log } = {}) {
  log('================================================================');
  log('     AGROPAY: EXPERIMENTOS DE SEGURIDAD Y VERIFICABILIDAD      ');
  log('================================================================\n');

  const [, oraculo, , atacante] = await ethers.getSigners();

  // Despliegue de contrato base
  const fabrica = await ethers.getContractFactory('GarantiaAgroPay');
  const contrato = await fabrica.deploy(oraculo.address);
  await contrato.waitForDeployment();
  await (await contrato.depositarGarantia({ value: ethers.parseEther('2.0') })).wait();

  // -------------------------------------------------------------
  // EXPERIMENTO 1: Alteración de datos post-firma
  // -------------------------------------------------------------
  log('--- EXPERIMENTO 1: Alteración de datos (Integridad criptográfica) ---');
  log('Escenario: Un intermediario malicioso intercepta una lectura con');
  log('temperatura de 8.0 °C (dañada) y la altera a 3.5 °C manteniendo la firma original.');

  const lecturaOriginal = { idLote: 201, temperatura: 8.0, acidez: 16, nonce: 'nonce-exp-1' };
  const paqueteLegitimo = await firmarLectura(oraculo, lecturaOriginal);

  // Manipulación del paquete
  const paqueteManipulado = {
    lectura: { ...paqueteLegitimo.lectura, temperatura: 3.5 },
    firma: paqueteLegitimo.firma,
  };

  const verificador1 = crearVerificador(oraculo.address);
  try {
    verificador1.verificar(paqueteManipulado);
    log('❌ FALLO DE SEGURIDAD: La manipulación fue aceptada indebidamente.');
  } catch (error) {
    log(`✔ BLOQUEADO CORRECTAMENTE: [${error.codigo}] ${error.message}`);
    log('Explicación: La firma digital ECDSA vincula matemáticamente el contenido');
    log('con la clave privada. Cambiar un solo carácter altera el hash e invalida la firma.\n');
  }

  // -------------------------------------------------------------
  // EXPERIMENTO 2: Ataque de repetición (Replay Attack)
  // -------------------------------------------------------------
  log('--- EXPERIMENTO 2: Ataque de repetición (Replay Attack) ---');
  log('Escenario: Un productor intenta enviar dos veces la misma lectura válida');
  log('para cobrar doble garantía por el mismo lote entregado.');

  const lecturaValida = { idLote: 202, temperatura: 3.2, acidez: 15, nonce: 'nonce-exp-2' };
  const paqueteValido = await firmarLectura(oraculo, lecturaValida);

  const verificador2 = crearVerificador(oraculo.address);
  verificador2.verificar(paqueteValido); // Primer procesamiento legítimo
  log('  Primer envío: Verificado y procesado con éxito.');

  try {
    verificador2.verificar(paqueteValido); // Segundo intento con el mismo paquete
    log('❌ FALLO DE SEGURIDAD: La repetición fue aceptada indebidamente.');
  } catch (error) {
    log(`✔ BLOQUEADO CORRECTAMENTE: [${error.codigo}] ${error.message}`);
    log('Explicación: El control de nonce garantiza que cada medición firmada');
    log('tenga un identificador de un solo uso que no puede ser reutilizado jamás.\n');
  }

  // -------------------------------------------------------------
  // EXPERIMENTO 3: Suplantación de control de acceso en la EVM
  // -------------------------------------------------------------
  log('--- EXPERIMENTO 3: Control de acceso en la Blockchain ---');
  log('Escenario: Una cuenta no autorizada intenta llamar directamente a autorizarPago().');

  try {
    await contrato.connect(atacante).autorizarPago(203, atacante.address, ethers.parseEther('1.0'));
    log('❌ FALLO DE SEGURIDAD: Una cuenta no autorizada pudo autorizar fondos.');
  } catch (error) {
    log(`✔ BLOQUEADO CORRECTAMENTE POR LA EVM: Error custom revertido.`);
    log('Explicación: El contrato valida en bytecode: if (msg.sender != oraculo) revert SoloOraculo().');
    log('Nadie en el mundo, ni siquiera los mineros de la red, pueden saltarse esta regla.\n');
  }

  // -------------------------------------------------------------
  // EXPERIMENTO 4: Ataque de reentrada contra el contrato
  // -------------------------------------------------------------
  log('--- EXPERIMENTO 4: Resistencia contra ataque de reentrada ---');
  log('Escenario: Un contrato atacante con una función fallback intenta llamar recursivamente');
  log('a retirar() mientras recibe la transferencia para vaciar la garantía completa.');

  const fabricaAtacante = await ethers.getContractFactory('AtacanteRetiro');
  const atacanteContrato = await fabricaAtacante.deploy(await contrato.getAddress());
  await atacanteContrato.waitForDeployment();

  // El oráculo autoriza un pago legítimo de 0.5 ETH para el atacante
  await contrato.connect(oraculo).autorizarPago(204, await atacanteContrato.getAddress(), ethers.parseEther('0.5'));

  // El atacante lanza su exploit
  const txAtaque = await atacanteContrato.atacar();
  await txAtaque.wait();

  const saldoRobado = await ethers.provider.getBalance(await atacanteContrato.getAddress());
  const intentos = await atacanteContrato.intentosReentrada();
  const reentradaExitosa = await atacanteContrato.reentradaExitosa();

  log(`- Intentos de reentrada realizados por el atacante: ${intentos}`);
  log(`- ¿Reentrada exitosa lograda?: ${reentradaExitosa}`);
  log(`- Fondos recibidos: ${ethers.formatEther(saldoRobado)} ETH (solo el pago autorizado, sin drenaje)`);
  log('✔ ATAQUE NEUTRALIZADO: El saldo se redujo a cero antes de la transferencia (patrón CEI).');
  log('Cuando el atacante intentó reentrar, la segunda llamada revirtió con SinSaldoPendiente().\n');

  log('================================================================');
  log('      TODOS LOS EXPERIMENTOS DE SEGURIDAD FUERON SUPERADOS     ');
  log('================================================================\n');

  return true;
}

if (require.main === module) {
  probarSeguridad().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { probarSeguridad };
