// Script pedagógico: Inspección profunda de almacenamiento en 3 capas.
// Muestra exactamente dónde y cómo se guarda la información en cada capa:
// Capa 1: EVM Storage (Variables de estado en el contrato inteligente)
// Capa 2: Logs / Eventos (Bitácora criptográfica en los bloques de la red)
// Capa 3: Proyección SQL / Base de Datos (Lectura rápida optimizada)
const { ethers } = require('hardhat');
const { recorrerFlujo } = require('../src/recorrido');
const { RepositorioMemoria } = require('../src/repositorio-memoria');

async function inspeccionarEstado({ log = console.log } = {}) {
  log('================================================================');
  log('    AGROPAY: INSPECCIÓN DE ALMACENAMIENTO EN TRES CAPAS        ');
  log('================================================================\n');

  const [comprador, oraculo, productor] = await ethers.getSigners();
  const repositorio = new RepositorioMemoria();

  log('1. Ejecutando flujo completo con lote certificado (temperatura 3.5 °C, acidez 16)...');
  const lectura = { idLote: 101, temperatura: 3.5, acidez: 16, nonce: 'inspeccion-001' };
  const resultado = await recorrerFlujo({
    ethers,
    lectura,
    montoEth: '0.5',
    garantiaEth: '1.5',
    repositorio,
  });

  const contrato = await ethers.getContractAt('GarantiaAgroPay', resultado.contrato);

  log('\n----------------------------------------------------------------');
  log('  CAPA 1: EVM STORAGE (Estado dentro del contrato en la blockchain)');
  log('----------------------------------------------------------------');
  log('Los datos residen en la máquina virtual (EVM). Cada cambio requiere una');
  log('transacción firmada, consenso de validadores y costo de gas.\n');

  const oraculoRegistrado = await contrato.oraculo();
  const garantiaRestante = await contrato.garantiaDisponible();
  const saldoProductor = await contrato.saldoPendiente(productor.address);
  const loteYaAutorizado = await contrato.loteAutorizado(101);

  log(`- Contrato desplegado en:     ${resultado.contrato}`);
  log(`- Oráculo autorizado (slot):  ${oraculoRegistrado}`);
  log(`- Garantía restante en custodia: ${ethers.formatEther(garantiaRestante)} ETH (1.0 ETH tras pagar 0.5 ETH)`);
  log(`- Saldo pendiente productor:  ${ethers.formatEther(saldoProductor)} ETH (0 ETH, ya fue retirado con éxito)`);
  log(`- Lote #101 autorizado en map: ${loteYaAutorizado} (evita doble pago)`);

  log('\n----------------------------------------------------------------');
  log('  CAPA 2: BITÁCORA DE EVENTOS / LOGS (Inmutable en la cadena)');
  log('----------------------------------------------------------------');
  log('Los eventos no se almacenan en variables de estado, sino en la estructura');
  log('criptográfica de los bloques. Son la fuente canónica de verdad histórica.\n');

  const eventosMemoria = await repositorio.listarEventos();
  for (const ev of eventosMemoria) {
    log(`  [Bloque #${ev.bloque}] Evento: ${ev.tipo.padEnd(20)} | Cuenta: ${ev.cuenta} | Monto: ${ethers.formatEther(ev.montoWei)} ETH`);
  }

  log('\n----------------------------------------------------------------');
  log('  CAPA 3: PROYECCIÓN EN BASE DE DATOS (Lectura off-chain / CQRS)');
  log('----------------------------------------------------------------');
  log('La aplicación web o API REST NO consulta directamente la blockchain para');
  log('listar o filtrar, sino esta tabla SQL sincronizada por el indexador.\n');
  log(`- Total de registros proyectados: ${eventosMemoria.length}`);
  log('- Deduplicación garantizada por clave única (tx_hash, log_index)');
  log('- Si la base de datos se borra, se reconstruye al 100 % desde la Capa 2.\n');

  log('================================================================');
  log('    CONCLUSIÓN: LA NUEVA CAPA DE SEGURIDAD Y VERIFICABILIDAD   ');
  log('================================================================');
  log('1. La blockchain garantiza que nadie pueda alterar las reglas de pago ni el saldo.');
  log('2. El oráculo garantiza con firma digital que los datos del sensor son auténticos.');
  log('3. La base de datos relacional ofrece velocidad de consulta sin comprometer la verdad.');
  log('================================================================\n');

  return { contrato: resultado.contrato, eventos: eventosMemoria };
}

if (require.main === module) {
  inspeccionarEstado().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { inspeccionarEstado };
