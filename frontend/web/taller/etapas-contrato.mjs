// Etapas 2 y 3 del taller: contrato Solidity, almacenamiento EVM, permisos y retiro seguro.
export const etapa2 = {
  numero: 2,
  titulo: 'Almacenamiento en EVM y custodia de garantía',
  modulo: 'm3',
  minutos: 45,
  labs: ['evm'],
  evidencia: null,
  objetivo: 'Inspeccionar cómo un contrato inteligente custodia fondos en la EVM, modifica variables de almacenamiento y emite eventos inmutables.',
  lenguajes: 'Solidity (contrato) y JavaScript (pruebas)',
  archivos: [
    ['contracts/GarantiaAgroPay.sol', 'Inspecciona constructor() y la función depositarGarantia().'],
    ['test/etapa-2.contrato.test.js', 'Analiza las 4 pruebas que verifican el depósito, el oráculo y el rechazo de montos cero.'],
  ],
  conceptos: '<p><strong>¿Dónde se guardan los datos en esta etapa?</strong></p><ul><li><strong>Capa 1: EVM Storage (Dentro del contrato):</strong> La variable <code>uint256 public garantiaDisponible</code> ocupa una ranura (slot) de almacenamiento persistente en la red local. El balance total en ethers lo custodia la propia cuenta del contrato (<code>address(this).balance</code>). La variable <code>immutable oraculo</code> se almacena directamente en el bytecode ejecutable del contrato.</li><li><strong>Capa 2: Logs / Eventos (En la estructura de bloques):</strong> La instrucción <code>emit GarantiaDepositada(msg.sender, msg.value)</code> no gasta almacenamiento dentro del contrato, sino que graba un registro criptográfico auditable en el bloque minado.</li></ul><p>Un contrato en Solidity se asemeja a una clase en POO, pero vive en una red distribuida: cualquier cuenta puede invocar sus funciones <code>external</code>, pero cada mutación de estado requiere una transacción validada y pago de gas.</p>',
  pasos: [
    'Abre <code>contracts/GarantiaAgroPay.sol</code> y revisa cómo se declaran las variables de estado y la función <code>depositarGarantia()</code>.',
    'Observa el modificador <code>payable</code>: permite que la función reciba ethers reales (en wei) y los sume al balance custodiado por el contrato.',
    'Abre <code>test/etapa-2.contrato.test.js</code> e inspecciona cómo ethers.js despliega el contrato y comprueba el evento <code>GarantiaDepositada</code>.',
    'Ejecuta <code>npm run etapa:2</code> en PowerShell: verás pasar las cuatro pruebas que certifican el registro del oráculo y la recepción de fondos.',
    'Abre el laboratorio Taller EVM en la guía web y compara lo observado en tus pruebas con la simulación interactiva.',
  ],
  codigo: [
    { titulo: 'Depósito y mutación de almacenamiento (contracts/GarantiaAgroPay.sol)', texto: "function depositarGarantia() external payable {\n    if (msg.value == 0) revert MontoInvalido();\n    garantiaDisponible += msg.value;\n    emit GarantiaDepositada(msg.sender, msg.value);\n}" },
    { titulo: 'Comprobación de eventos en las pruebas (test/etapa-2.contrato.test.js)', texto: "await expect(contrato.depositarGarantia({ value: monto }))\n  .to.emit(contrato, 'GarantiaDepositada').withArgs(admin.address, monto);" },
  ],
  comprobar: {
    comando: 'npm run etapa:2',
    antes: null,
    despues: '  Etapa 2 · Primer contrato\n    √ registra el oráculo al desplegar\n    √ no se despliega sin una dirección de oráculo\n    √ suma cada depósito a la garantía y emite un evento\n    √ rechaza un depósito de cero\n\n  4 passing',
  },
  siFalla: [
    ['FALTA Paquete hardhat', 'Asegúrate de haber ejecutado <code>npm install</code> en la raíz de la carpeta del taller.'],
    ['HardhatError: Contract not deployed', 'Verifica que la versión de Node.js sea 24 o superior con <code>node --version</code>.'],
  ],
  evidenciaTexto: 'Esta etapa sienta las bases de la custodia en cadena. Conserva los resultados de la prueba para incorporarlos en el reporte de desempeño MG-A03.',
};

export const etapa3 = {
  numero: 3,
  titulo: 'Permisos, mappings y retiro seguro contra reentrada',
  modulo: 'm3',
  minutos: 60,
  labs: ['audit', 'evm'],
  evidencia: 'MG-A03',
  objetivo: 'Inspeccionar el control de acceso en la EVM, los mappings de saldo y la neutralización de ataques de reentrada con el patrón Checks-Effects-Interactions.',
  lenguajes: 'Solidity (contrato) y JavaScript (pruebas)',
  archivos: [
    ['contracts/GarantiaAgroPay.sol', 'Inspecciona autorizarPago() y retirar().'],
    ['contracts/practica/AtacanteRetiro.sol', 'Revisa el exploit de reentrada que intenta drenar los fondos de garantía.'],
    ['scripts/probar-seguridad.js', 'Script guiado que ejecuta 4 ataques controlados y muestra su mitigación.'],
    ['test/etapa-3.seguridad.test.js', 'Diez pruebas que validan permisos, solvencia, reentrada y experimentos.'],
  ],
  conceptos: '<p><strong>¿Dónde se guardan los datos en esta etapa?</strong></p><ul><li><code>mapping(address => uint256) public saldoPendiente;</code> almacena en slots de storage de la EVM los fondos que pertenecen a cada productor. Es una tabla hash criptográfica distribuida.</li><li><code>mapping(uint256 => bool) public loteAutorizado;</code> almacena qué lotes ya fueron autorizados, evitando que un mismo lote cobre dos veces (idempotencia en cadena).</li></ul><p><strong>El Patrón Checks-Effects-Interactions (CEI):</strong> En <code>retirar()</code>, la regla fundamental de seguridad es:</p><ol><li><strong>Checks:</strong> Comprobar que el saldo del llamador sea mayor a cero.</li><li><strong>Effects:</strong> Reducir el saldo a cero en el storage de la EVM <em>antes</em> de transferir fondos.</li><li><strong>Interactions:</strong> Transferir el dinero al productor mediante <code>call</code>.</li></ol><p>Si el saldo se redujera después de transferir, un contrato malicioso (como <code>AtacanteRetiro.sol</code>) podría reingresar recursivamente a <code>retirar()</code> durante la transferencia y drenar la garantía completa de todos los demás productores. El patrón CEI neutraliza este vector de ataque por diseño.</p>',
  pasos: [
    'Abre <code>contracts/GarantiaAgroPay.sol</code> y analiza las comprobaciones estrictas de <code>autorizarPago()</code>: control de oráculo (<code>SoloOraculo</code>), unicidad (<code>LoteYaAutorizado</code>) y solvencia (<code>FondosInsuficientes</code>).',
    'Revisa <code>retirar()</code> e identifica exactamente la línea donde se aplica el paso <em>Effects</em> (<code>saldoPendiente[msg.sender] = 0;</code>) antes del <em>Interactions</em>.',
    'Abre <code>contracts/practica/AtacanteRetiro.sol</code> y analiza cómo su función <code>receive()</code> intenta reentrar a la fuerza.',
    'Ejecuta <code>npm run etapa:3</code> en PowerShell: verás pasar las diez pruebas automatizadas que certifican la resistencia frente a atacantes.',
    'Ejecuta <code>npm run probar:seguridad</code>: observa en tu terminal la demostración detallada de cómo la EVM bloquea la suplantación de permisos y neutraliza la reentrada.',
  ],
  codigo: [
    { titulo: 'Control de acceso estricto en la EVM (Solidity)', texto: "if (msg.sender != oraculo) revert SoloOraculo(msg.sender);\nif (loteAutorizado[idLote]) revert LoteYaAutorizado(idLote);\nif (monto > garantiaDisponible) revert FondosInsuficientes(garantiaDisponible, monto);" },
    { titulo: 'Retiro blindado en orden Checks-Effects-Interactions (Solidity)', texto: 'uint256 monto = saldoPendiente[msg.sender];   // 1. Checks\nif (monto == 0) revert SinSaldoPendiente();\n\nsaldoPendiente[msg.sender] = 0;                 // 2. Effects (¡Antes de transferir!)\n\n(bool exito, ) = msg.sender.call{value: monto}(""); // 3. Interactions\nif (!exito) revert FalloTransferencia();\nemit PagoRetirado(msg.sender, monto);' },
    { titulo: 'Comando de experimentos de seguridad', texto: 'npm run probar:seguridad' },
  ],
  comprobar: {
    comando: 'npm run etapa:3',
    antes: null,
    despues: '  Etapa 3 · Permisos y retiro seguro\n    autorizarPago\n      √ reserva el pago del productor y descuenta la garantía\n      √ solo el oráculo puede autorizar\n      √ no autoriza dos veces el mismo lote\n      √ no promete más dinero del que hay en garantía\n      √ valida productor y monto\n    retirar\n      √ transfiere el saldo al productor y lo deja en cero\n      √ rechaza un retiro sin saldo, también el segundo intento\n      √ resiste un intento de reentrada\n      √ conserva el saldo si el destinatario rechaza el pago\n    experimentos de seguridad guiados\n      √ el script de experimentos guiados de seguridad se ejecuta y neutraliza todos los ataques\n\n  10 passing',
  },
  siFalla: [
    ['Transaction reverted without reason', 'Asegúrate de que la red de Hardhat esté compilando correctamente con <code>npm run compilar</code>.'],
  ],
  evidenciaTexto: 'En tu portafolio MG-A03, presenta la regla de permisos de <code>autorizarPago</code> y el orden Checks-Effects-Interactions de <code>retirar()</code>. Adjunta la salida de <code>npm run probar:seguridad</code> explicando por qué el contrato atacante no pudo sustraer más del monto asignado.',
};
