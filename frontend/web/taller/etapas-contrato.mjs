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
  conceptos: `<p><strong>¿Dónde se guardan los datos en esta etapa?</strong></p><ul><li><strong>Capa 1 · EVM Storage (Dentro del contrato):</strong> La variable <code>uint256 public garantiaDisponible</code> ocupa una ranura (slot) de almacenamiento persistente en la red. El balance total en ethers lo custodia la propia cuenta del contrato (<code>address(this).balance</code> en wei). La variable <code>immutable oraculo</code> se almacena directamente en el bytecode ejecutable del contrato.</li><li><strong>Capa 2 · Logs / Eventos (En la estructura de bloques):</strong> La instrucción <code>emit GarantiaDepositada(msg.sender, msg.value)</code> no gasta ranuras de almacenamiento dentro del contrato: graba un recibo criptográfico inmutable en el bloque minado que lee el indexador.</li></ul>

<div class="insight"><strong>Analogía del mundo real: El depósito en garantía (escrow) y la cuenta empresarial</strong><p>En el comercio agropecuario tradicional, cuando una empresa compradora pacta la adquisición de cosechas con asociaciones campesinas, ninguna parte asume el riesgo de pagar por adelantado ni de entregar producto fiado. Se utiliza una <strong>cuenta de depósito en garantía (escrow)</strong> gestionada por un tercero fiduciario neutral.</p><p>En la EVM, el contrato <code>GarantiaAgroPay.sol</code> asume ese rol fiduciario sin intermediarios humanos. Para entender cómo gestiona los fondos, debes distinguir dos conceptos clave:</p><ol><li><strong>La Bóveda (Balance nativo <code>address(this).balance</code>):</strong> Es la cuenta bancaria física del contrato. Contiene la totalidad de los ethers (en wei) que han ingresado y están custodiados en la red.</li><li><strong>El Libro Contable (Variable de estado <code>garantiaDisponible</code>):</strong> Es la ranura de memoria interna que registra cuánto de ese dinero está libre y listo para respaldar nuevos lotes.</li></ol><p>Al ejecutar <code>depositarGarantia()</code> con fondos (<code>msg.value &gt; 0</code>), el dinero entra a la bóveda (<code>address(this).balance += msg.value</code>) y simultáneamente el libro contable anota el saldo disponible (<code>garantiaDisponible += msg.value</code>). En esta etapa ambos valores coinciden exactamente, certificando una solvencia del 100 %.</p></div>

<div class="hero-diagram" aria-label="Diagrama de ranuras de almacenamiento en EVM, balance nativo y emisión notarial en AgroPay">
  <div class="diagram-label">EVM STORAGE VS BALANCE NATIVO · MUTACIÓN DE ESTADO Y LOGS DE BLOQUE</div>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 330" width="100%" height="auto" role="img" aria-label="Diagrama de ranuras de almacenamiento en EVM, balance nativo y emisión notarial en AgroPay" style="max-width:840px;height:auto;display:block;margin:1rem auto;border-radius:12px;background:#0f172a;border:1px solid #334155;">
    <title>Flujo de depósito, almacenamiento en EVM y emisión notarial de eventos</title>
    <desc>Ilustra cómo una transacción payable transfiere ethers al balance del contrato, muta la variable garantiaDisponible en un slot de storage, emite el evento GarantiaDepositada en los logs del bloque, y revierte con MontoInvalido si el valor es cero.</desc>
    <defs>
      <linearGradient id="gradPaso1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="gradStorage" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <linearGradient id="gradLogs" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#78350f"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="gradRevert" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7f1d1d"/>
        <stop offset="100%" stop-color="#450a0a"/>
      </linearGradient>
    </defs>

    <!-- Paso 1: Transacción de depósito -->
    <g transform="translate(24, 35)">
      <rect width="210" height="195" rx="10" fill="url(#gradPaso1)" stroke="#38bdf8" stroke-width="1.8"/>
      <rect x="14" y="14" width="48" height="24" rx="5" fill="#38bdf8" fill-opacity="0.2"/>
      <text x="38" y="30" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">PASO 1</text>
      <text x="70" y="30" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">Depósito payable</text>
      <text x="14" y="58" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">msg.sender envía fondos</text>
      <rect x="14" y="72" width="182" height="108" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1"/>
      <text x="24" y="94" fill="#38bdf8" font-family="monospace" font-size="10.5">depositarGarantia()</text>
      <text x="24" y="112" fill="#cbd5e1" font-family="monospace" font-size="10">msg.value &gt; 0 wei</text>
      <line x1="24" y1="122" x2="186" y2="122" stroke="#334155" stroke-width="1"/>
      <text x="24" y="140" fill="#a5f3fc" font-family="system-ui, sans-serif" font-size="9.5">Modificador payable:</text>
      <text x="24" y="156" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="9">Recibe ethers reales</text>
      <text x="24" y="170" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="9">en la cuenta del contrato</text>
    </g>

    <!-- Conector 1 a 2 (Flujo normal) -->
    <path d="M 236 100 L 276 100" stroke="#10b981" stroke-width="2.5"/>
    <polygon points="274,95 284,100 274,105" fill="#10b981"/>

    <!-- Bifurcación Rechazo (msg.value == 0) -->
    <path d="M 236 160 L 276 190" stroke="#ef4444" stroke-width="2.5"/>
    <polygon points="272,184 284,196 270,195" fill="#ef4444"/>

    <!-- Paso 2: Mutación en Almacenamiento EVM y Balance -->
    <g transform="translate(286, 25)">
      <rect width="260" height="150" rx="10" fill="url(#gradStorage)" stroke="#10b981" stroke-width="1.8"/>
      <rect x="14" y="14" width="48" height="24" rx="5" fill="#10b981" fill-opacity="0.2"/>
      <text x="38" y="30" text-anchor="middle" fill="#10b981" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">PASO 2</text>
      <text x="70" y="30" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">Mutación en EVM</text>
      <text x="14" y="56" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="10" font-weight="600">Storage Slot + Balance de cuenta</text>

      <rect x="14" y="68" width="232" height="34" rx="6" fill="#0f172a" stroke="#047857"/>
      <text x="24" y="85" fill="#34d399" font-family="monospace" font-size="10">garantiaDisponible += value</text>
      <text x="24" y="96" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="8.5">Slot de almacenamiento permanente</text>

      <rect x="14" y="106" width="232" height="34" rx="6" fill="#0f172a" stroke="#047857"/>
      <text x="24" y="123" fill="#67e8f9" font-family="monospace" font-size="10">address(this).balance += value</text>
      <text x="24" y="134" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="8.5">Bóveda nativa de la cuenta en wei</text>
    </g>

    <!-- Conector 2 a 3 -->
    <path d="M 548 100 L 590 100" stroke="#f59e0b" stroke-width="2.5"/>
    <polygon points="588,95 598,100 588,105" fill="#f59e0b"/>

    <!-- Paso 3: Emisión Notarial de Logs -->
    <g transform="translate(600, 25)">
      <rect width="216" height="150" rx="10" fill="url(#gradLogs)" stroke="#f59e0b" stroke-width="1.8"/>
      <rect x="14" y="14" width="48" height="24" rx="5" fill="#f59e0b" fill-opacity="0.2"/>
      <text x="38" y="30" text-anchor="middle" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">PASO 3</text>
      <text x="70" y="30" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">Logs de Bloque</text>
      <text x="14" y="56" fill="#fde68a" font-family="system-ui, sans-serif" font-size="10" font-weight="600">Registro inmutable · $0 Slot</text>

      <rect x="14" y="68" width="188" height="72" rx="6" fill="#0f172a" stroke="#78350f"/>
      <text x="22" y="88" fill="#fbbf24" font-family="monospace" font-size="9.5">emit GarantiaDepositada(</text>
      <text x="32" y="104" fill="#fde68a" font-family="monospace" font-size="9">msg.sender,</text>
      <text x="32" y="120" fill="#fde68a" font-family="monospace" font-size="9">msg.value);</text>
      <text x="22" y="134" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="8">Leído por indexador CQRS</text>
    </g>

    <!-- Caja Reversión: MontoInvalido -->
    <g transform="translate(286, 185)">
      <rect width="530" height="52" rx="8" fill="url(#gradRevert)" stroke="#ef4444" stroke-width="1.5"/>
      <text x="16" y="22" fill="#fca5a5" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">✕ REVERSIÓN: if (msg.value == 0) revert MontoInvalido();</text>
      <text x="16" y="40" fill="#fecaca" font-family="system-ui, sans-serif" font-size="10">Rechazo automático: transacción revertida atómicamente, $0 gasto de almacenamiento y estado intacto.</text>
    </g>

    <!-- Barra inferior resumen invariante -->
    <rect x="24" y="250" width="792" height="64" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1"/>
    <text x="44" y="274" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">Invariante de solvencia y custodia en la EVM:</text>
    <text x="44" y="293" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="10.5">El balance custodiado por la cuenta (address(this).balance) respalda en todo momento los fondos contables (garantiaDisponible). Si el monto es cero, la EVM revierte de inmediato sin alterar el estado.</text>
  </svg>
  <p>El diagrama ilustra el flujo de una transacción payable: el balance de la cuenta y la variable de almacenamiento aumentan al unísono, mientras el evento queda indexado en el bloque minado.</p>
</div>

<h3>Comparativa de persistencia en la Máquina Virtual de Ethereum (EVM)</h3>
<div class="table-scroll"><table><caption>Comparativa de persistencia en la EVM para la Etapa 2</caption><thead><tr><th scope="col">Capa de persistencia</th><th scope="col">Qué almacena en AgroPay</th><th scope="col">Costo en gas</th><th scope="col">Persistencia y mutabilidad</th><th scope="col">Accesibilidad en la EVM</th></tr></thead><tbody>
<tr><td><strong>EVM Storage (Ranuras)</strong></td><td><code>uint256 public garantiaDisponible</code></td><td>Muy alto (hasta 20.000 gas por inicializar un slot SSTORE).</td><td>Persistente entre bloques. Modificable solo mediante transacciones validadas.</td><td>Lectura y escritura directa desde funciones del contrato.</td></tr>
<tr><td><strong>Bytecode Inmutable</strong></td><td><code>address public immutable oraculo</code></td><td>Costo único durante el despliegue del contrato (CREATE).</td><td>Inmutable de por vida; forma parte del código de la máquina.</td><td>Lectura directa sin coste de SLOAD; no puede modificarse tras desplegar.</td></tr>
<tr><td><strong>Event Logs (Bloques)</strong></td><td><code>event GarantiaDepositada(depositante, monto)</code></td><td>Económico (~375 a 1.500 gas según tópicos indexados).</td><td>Inmutable en los recibos de bloques; no consume slots del contrato.</td><td>Inaccesible para contratos en la EVM; legible externamente por el indexador SQL.</td></tr>
<tr><td><strong>Balance Nativo</strong></td><td>Fondos en wei custodiados por <code>address(this)</code></td><td>Gestionado por el protocolo en transferencias payable.</td><td>Permanente en el árbol de cuentas de la red.</td><td>Consultable mediante <code>address(this).balance</code>; transferible con call seguro.</td></tr>
</tbody></table></div>

<p>Un contrato en Solidity se asemeja a una clase en POO, pero vive en una red distribuida: cualquier cuenta puede invocar sus funciones <code>external</code>, pero cada mutación de estado requiere una transacción validada y pago de gas.</p>`,
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
