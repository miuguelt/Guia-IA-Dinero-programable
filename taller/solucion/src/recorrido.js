// Etapa 6: recorrido completo del nuevo paradigma.
// Conecta los componentes en un flujo verificable de extremo a extremo:
// 1. Despliegue del contrato y depósito de garantía
// 2. Firma criptográfica de la lectura (Oráculo)
// 3. Verificación de integridad y regla de negocio
// 4. Interacción con la EVM y emisión de eventos
// 5. Retiro seguro por el productor
// 6. Proyección e indexación en base de datos
const { firmarLectura, crearVerificador, procesarLectura } = require('./oraculo');
const { sincronizar } = require('./indexador');
const { RepositorioMemoria } = require('./repositorio-memoria');

async function recorrerFlujo({ ethers, lectura, montoEth = '1', garantiaEth = '2', repositorio = new RepositorioMemoria() }) {
  const [, oraculo, productor] = await ethers.getSigners();

  // Paso 1: Despliegue en la red local y fondeo de la garantía
  const fabrica = await ethers.getContractFactory('GarantiaAgroPay');
  const contrato = await fabrica.deploy(oraculo.address);
  await contrato.waitForDeployment();
  await (await contrato.depositarGarantia({ value: ethers.parseEther(garantiaEth) })).wait();

  // Paso 2 y 3: Firma y procesamiento con verificación criptográfica
  const paquete = await firmarLectura(oraculo, lectura);
  const resultado = await procesarLectura({
    contrato: contrato.connect(oraculo),
    verificador: crearVerificador(oraculo.address),
    paquete,
    productor: productor.address,
    monto: ethers.parseEther(montoEth),
  });

  // Paso 4: Retiro de fondos si el lote fue aprobado
  let retiro = null;
  if (resultado.aprobada) {
    retiro = (await (await contrato.connect(productor).retirar()).wait()).hash;
  }

  // Paso 5: Sincronización hacia la proyección
  const sincronizacion = await sincronizar({ contrato, repositorio });

  return {
    contrato: await contrato.getAddress(),
    dictamen: { aprobada: resultado.aprobada, motivos: resultado.motivos },
    autorizacion: resultado.txHash,
    retiro,
    sincronizacion,
    eventos: await repositorio.listarEventos(),
  };
}

function resumenMarkdown(resultado) {
  const lineas = [
    '# Evidencia del taller AgroPay',
    '',
    'Recorrido ejecutado en la red local de Hardhat con fondos de práctica sin valor monetario.',
    '',
    `- Contrato: \`${resultado.contrato}\``,
    `- Dictamen: ${resultado.dictamen.aprobada ? 'aprobada' : 'rechazada'}`,
  ];
  for (const motivo of resultado.dictamen.motivos) lineas.push(`  - ${motivo}`);
  lineas.push(
    `- Autorización: ${resultado.autorizacion ?? 'no se envió'}`,
    `- Retiro: ${resultado.retiro ?? 'no se envió'}`,
    `- Eventos leídos: ${resultado.sincronizacion.leidos}; nuevos en la proyección: ${resultado.sincronizacion.nuevos}`,
    '',
    '| Bloque | Tipo | Cuenta | Monto (wei) |',
    '|---|---|---|---|',
  );
  for (const evento of resultado.eventos) {
    lineas.push(`| ${evento.bloque} | ${evento.tipo} | \`${evento.cuenta}\` | ${evento.montoWei} |`);
  }
  return lineas.join('\n') + '\n';
}

module.exports = { recorrerFlujo, resumenMarkdown };
