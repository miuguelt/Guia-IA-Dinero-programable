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
      <text x="16" y="39" fill="#fecaca" font-family="system-ui, sans-serif" font-size="9.5">Rechazo atómico: transacción revertida sin mutar storage ni consumir gas persistente.</text>
    </g>

    <!-- Barra inferior resumen invariante -->
    <rect x="24" y="250" width="792" height="64" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1"/>
    <text x="44" y="271" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">Invariante de solvencia y custodia en la EVM:</text>
    <text x="44" y="288" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="10">El balance custodiado por la cuenta (address(this).balance) respalda los fondos contables (garantiaDisponible).</text>
    <text x="44" y="302" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="9.5">Si el monto enviado es cero (msg.value == 0), la EVM revierte de inmediato sin alterar el estado del contrato.</text>
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
  evidenciaTexto: 'Esta etapa sienta las bases de la custodia en cadena. Conserva la salida de la prueba: la usarás junto con la etapa 3 en MG-A03.',
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
  conceptos: `<p><strong>¿Dónde se guardan los datos en esta etapa?</strong></p><ul><li><code>mapping(address =&gt; uint256) public saldoPendiente;</code> almacena en slots de storage de la EVM los fondos que pertenecen a cada productor. Es una tabla hash criptográfica distribuida calculada como <code>keccak256(h(k) . p)</code>.</li><li><code>mapping(uint256 =&gt; bool) public loteAutorizado;</code> almacena qué lotes ya fueron autorizados, evitando que un mismo lote cobre dos veces (idempotencia en cadena).</li></ul>

<div class="insight"><strong>Analogía del mundo real: La ventanilla bancaria y el retiro seguro</strong><p>Imagina una ventanilla de banco físico donde un cliente llega a cobrar un cheque de ventanilla:</p><ol><li><strong>1. Verificación (Checks):</strong> El cajero consulta el saldo en la pantalla para comprobar que hay dinero disponible.</li><li><strong>2. Débito contable (Effects):</strong> Antes de contar y entregar los billetes físicos, el cajero descuenta el saldo en el sistema informático y lo deja en $0.</li><li><strong>3. Entrega de fondos (Interactions):</strong> El cajero pasa el fajo de billetes por la ventanilla al cliente.</li></ol><p>Si el cajero primero entregara los billetes y solo después tecleara el débito en la pantalla, un cliente malicioso con un clon o cómplice podría pedir otro retiro de inmediato antes de que el cajero actualice el sistema. En contratos inteligentes, eso es exactamente un <strong>ataque de reentrada</strong>: transferir dinero mediante <code>call</code> cede el control computacional al contrato receptor, el cual puede volver a llamar a <code>retirar()</code> si su saldo aún no ha sido llevado a cero.</p></div>

<div class="hero-diagram" aria-label="Diagrama de neutralización de ataque de reentrada mediante el patrón Checks-Effects-Interactions">
  <div class="diagram-label">SEGURIDAD EN SOLIDITY · CHECKS-EFFECTS-INTERACTIONS VS ATAQUE DE REENTRADA</div>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 330" width="100%" height="auto" role="img" aria-label="Diagrama de neutralización de ataque de reentrada mediante el patrón Checks-Effects-Interactions" style="max-width:840px;height:auto;display:block;margin:1rem auto;border-radius:12px;background:#0f172a;border:1px solid #334155;">
    <title>Patrón Checks-Effects-Interactions y bloqueo de reentrada</title>
    <desc>Compara el flujo vulnerable que permite reentrada frente al flujo seguro CEI implementado en GarantiaAgroPay donde el saldo se lleva a cero antes de transferir.</desc>
    <defs>
      <linearGradient id="gradChecks" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="gradEffects" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <linearGradient id="gradInteractions" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="gradAttack" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7f1d1d"/>
        <stop offset="100%" stop-color="#450a0a"/>
      </linearGradient>
    </defs>

    <!-- Paso 1: Checks -->
    <g transform="translate(24, 30)">
      <rect width="180" height="150" rx="10" fill="url(#gradChecks)" stroke="#38bdf8" stroke-width="1.8"/>
      <rect x="12" y="12" width="56" height="22" rx="4" fill="#38bdf8" fill-opacity="0.2"/>
      <text x="40" y="27" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="10" font-weight="bold">1. CHECKS</text>
      <text x="12" y="52" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Validar estado</text>
      <rect x="12" y="64" width="156" height="72" rx="5" fill="#0f172a" stroke="#334155"/>
      <text x="18" y="84" fill="#a5f3fc" font-family="monospace" font-size="9.5">uint monto =</text>
      <text x="24" y="98" fill="#a5f3fc" font-family="monospace" font-size="9.5">saldo[msg.sender];</text>
      <text x="18" y="116" fill="#fca5a5" font-family="monospace" font-size="9">if (monto == 0)</text>
      <text x="24" y="128" fill="#f87171" font-family="monospace" font-size="9">revert SinSaldo();</text>
    </g>

    <!-- Flecha 1 a 2 -->
    <path d="M 204 105 L 234 105" stroke="#10b981" stroke-width="2.5"/>
    <polygon points="232,100 242,105 232,110" fill="#10b981"/>

    <!-- Paso 2: Effects (Seguro) -->
    <g transform="translate(244, 30)">
      <rect width="195" height="150" rx="10" fill="url(#gradEffects)" stroke="#10b981" stroke-width="1.8"/>
      <rect x="12" y="12" width="60" height="22" rx="4" fill="#10b981" fill-opacity="0.2"/>
      <text x="42" y="27" text-anchor="middle" fill="#10b981" font-family="system-ui, sans-serif" font-size="10" font-weight="bold">2. EFFECTS</text>
      <text x="12" y="52" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Mutación previa</text>
      <rect x="12" y="64" width="171" height="72" rx="5" fill="#0f172a" stroke="#047857"/>
      <text x="18" y="86" fill="#34d399" font-family="monospace" font-size="9.5">saldo[msg.sender] = 0;</text>
      <text x="18" y="104" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="9">¡Antes de transferir!</text>
      <text x="18" y="124" fill="#6ee7b7" font-family="system-ui, sans-serif" font-size="8.5">Storage blindado en EVM</text>
    </g>

    <!-- Flecha 2 a 3 -->
    <path d="M 439 105 L 469 105" stroke="#38bdf8" stroke-width="2.5"/>
    <polygon points="467,100 477,105 467,110" fill="#38bdf8"/>

    <!-- Paso 3: Interactions -->
    <g transform="translate(479, 30)">
      <rect width="180" height="150" rx="10" fill="url(#gradInteractions)" stroke="#60a5fa" stroke-width="1.8"/>
      <rect x="12" y="12" width="90" height="22" rx="4" fill="#60a5fa" fill-opacity="0.2"/>
      <text x="57" y="27" text-anchor="middle" fill="#93c5fd" font-family="system-ui, sans-serif" font-size="9.5" font-weight="bold">3. INTERACTIONS</text>
      <text x="12" y="52" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Transferencia</text>
      <rect x="12" y="64" width="156" height="72" rx="5" fill="#0f172a" stroke="#1e3a8a"/>
      <text x="16" y="86" fill="#93c5fd" font-family="monospace" font-size="9">msg.sender.call{</text>
      <text x="24" y="100" fill="#93c5fd" font-family="monospace" font-size="9">value: monto}("");</text>
      <text x="16" y="120" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="8.5">Cede control externo</text>
    </g>

    <!-- Intento de Reentrada Bloqueado -->
    <g transform="translate(674, 30)">
      <rect width="142" height="150" rx="10" fill="url(#gradAttack)" stroke="#ef4444" stroke-width="1.8"/>
      <text x="71" y="27" text-anchor="middle" fill="#fca5a5" font-family="system-ui, sans-serif" font-size="10" font-weight="bold">ATAQUE REENTRADA</text>
      <text x="12" y="50" fill="#f87171" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">AtacanteRetiro.sol</text>
      <rect x="10" y="60" width="122" height="78" rx="5" fill="#0f172a" stroke="#7f1d1d"/>
      <text x="16" y="78" fill="#f87171" font-family="monospace" font-size="8.5">receive() external {</text>
      <text x="20" y="92" fill="#fca5a5" font-family="monospace" font-size="8">contrato.retirar();</text>
      <text x="16" y="106" fill="#f87171" font-family="monospace" font-size="8.5">}</text>
      <text x="16" y="126" fill="#ef4444" font-family="system-ui, sans-serif" font-size="8" font-weight="bold">BLOCKED: saldo == 0</text>
    </g>

    <!-- Flecha curvada de retorno atacante hacia Checks -->
    <path d="M 745 180 C 745 220, 114 220, 114 185" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 3"/>
    <polygon points="109,190 114,180 119,190" fill="#ef4444"/>
    <text x="430" y="215" text-anchor="middle" fill="#fca5a5" font-family="system-ui, sans-serif" font-size="10">El reingreso choca contra el paso 1 (Checks) porque el saldo ya es 0 → revierte SinSaldoPendiente()</text>

    <!-- Barra inferior resumen invariante -->
    <rect x="24" y="240" width="792" height="74" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1"/>
    <text x="44" y="263" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">Invariante de seguridad contra reentrada (CEI):</text>
    <text x="44" y="280" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="10">El orden es la defensa: al mutar el estado antes de llamar a contratos externos, cualquier intento de llamada recursiva</text>
    <text x="44" y="295" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="9.5">encuentra el saldo en cero y revierte. Adicionalmente, autorizarPago() restringe permisos estrictos con SoloOraculo.</text>
  </svg>
  <p>El diagrama ilustra el flujo protegido por CEI: el saldo se reduce a cero antes de la llamada de transferencia, neutralizando cualquier intento de recursión maliciosa.</p>
</div>

<h3>Control de acceso y neutralización de ataques en la Etapa 3</h3>
<div class="table-scroll"><table><caption>Defensas y validaciones en GarantiaAgroPay.sol</caption><thead><tr><th scope="col">Vector de ataque</th><th scope="col">Comprobación técnica</th><th scope="col">Error personalizado</th><th scope="col">Efecto en la EVM</th></tr></thead><tbody>
<tr><td><strong>Suplantación de oráculo</strong></td><td><code>if (msg.sender != oraculo)</code></td><td><code>revert SoloOraculo(msg.sender);</code></td><td>Revierte llamadas de cuentas que intentan autorizarse pagos sin ser el validador registrado.</td></tr>
<tr><td><strong>Ataque de repetición (Replay)</strong></td><td><code>if (loteAutorizado[idLote])</code></td><td><code>revert LoteYaAutorizado(idLote);</code></td><td>Garantiza idempotencia en cadena: un lote evaluado solo puede cobrarse exactamente una vez.</td></tr>
<tr><td><strong>Solvencia de fondos</strong></td><td><code>if (monto &gt; garantiaDisponible)</code></td><td><code>revert FondosInsuficientes(disponible, monto);</code></td><td>Impide comprometer más garantía de la que el contrato custodia efectivamente en depósito.</td></tr>
<tr><td><strong>Ataque de reentrada</strong></td><td><code>saldoPendiente[msg.sender] = 0;</code> antes del <code>call</code></td><td><code>revert SinSaldoPendiente();</code></td><td>El reingreso malicioso encuentra balance cero en el paso de Checks y es neutralizado.</td></tr>
</tbody></table></div>`,
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
  evidenciaTexto: 'Pega la salida de <code>npm run probar:seguridad</code> en el bloque 1 · Observa de MG-A03. En el bloque 2, explica el rechazo de <code>autorizarPago</code> por permisos y el orden Checks-Effects-Interactions de <code>retirar()</code>, incluido por qué el contrato atacante no pudo sacar más del monto asignado.',
};
