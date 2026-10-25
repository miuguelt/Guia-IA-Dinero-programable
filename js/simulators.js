// ============================================================
// GUÍA IA & DINERO PROGRAMABLE — LABORATORIO DE SIMULADORES
// ============================================================

window.SIMULATORS = (function() {

  // ------------------------------------------------------------
  // 1. SIMULADOR DE BLOCKCHAIN & SHA-256 (INMUTABILIDAD)
  // ------------------------------------------------------------
  let chain = [
    { index: 0, prevHash: "0000000000000000", data: "Bloque Génesis: Despliegue AgroPay Escrow", nonce: 1482, hash: "0000a4b89f21e03d" },
    { index: 1, prevHash: "0000a4b89f21e03d", data: "Lote Leche #412: 5,000L - Temp: 3.2°C - Aprobado IA", nonce: 3821, hash: "00007c390a1b6e4f" }
  ];

  function pseudoHash(str, nonce) {
    let val = 0;
    const combined = str + nonce;
    for (let i = 0; i < combined.length; i++) {
      val = ((val << 5) - val) + combined.charCodeAt(i);
      val |= 0;
    }
    const hex = Math.abs(val).toString(16).padStart(12, '0');
    return "0000" + hex.slice(0, 12);
  }

  function renderChain() {
    const container = document.getElementById('blockchain-cards');
    if (!container) return;
    container.innerHTML = '';

    chain.forEach((block, idx) => {
      const card = document.createElement('div');
      card.className = 'glass-card';
      card.style.cssText = 'border-left: 4px solid var(--accent-cyan); margin-bottom: 16px;';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:var(--accent-cyan); font-family:'Space Grotesk',sans-serif;">BLOQUE #${block.index}</strong>
          <span style="font-size:12px; color:var(--text-muted); font-family:'JetBrains Mono',monospace;">Nonce: ${block.nonce}</span>
        </div>
        <div style="margin-bottom:6px; font-size:12px; font-family:'JetBrains Mono',monospace;">
          <span style="color:var(--text-muted);">Prev Hash:</span> <span style="color:#94a3b8;">${block.prevHash}</span>
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Datos de la Transacción:</label>
          <input type="text" id="block-data-${idx}" value="${block.data}" onchange="SIMULATORS.corruptBlock(${idx})" 
            style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 10px; color:#fff; font-size:13px; font-family:'Inter',sans-serif; margin-top:4px;">
        </div>
        <div style="font-size:12px; font-family:'JetBrains Mono',monospace;">
          <span style="color:var(--text-muted);">Hash Actual:</span> 
          <span id="block-hash-${idx}" style="color:${block.hash.startsWith('0000') ? '#34d399' : '#f43f5e'}; font-weight:700;">${block.hash}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function corruptBlock(index) {
    const input = document.getElementById(`block-data-${index}`);
    if (!input) return;
    chain[index].data = input.value;
    chain[index].hash = "e98a1f2b4c8d7e6a"; // Hash corrupto que rompe la regla de dificultad '0000'
    renderChain();
    const screen = document.getElementById('blockchain-screen');
    if (screen) {
      screen.innerHTML = `<span style="color:#f43f5e;">⚠️ ALERTA DE INTEGRIDAD: El bloque #${index} ha sido alterado. El Hash criptográfico se rompió y los nodos rechazaron el bloque por consenso matemático.</span>`;
    }
  }

  function mineNewBlock() {
    const input = document.getElementById('new-block-tx-input');
    const data = input && input.value.trim() ? input.value.trim() : "Liquidación Automática Cooperativa: 2,500 USDC transferidos";
    const prevBlock = chain[chain.length - 1];
    let nonce = 1000 + Math.floor(Math.random() * 9000);
    const newHash = pseudoHash(data, nonce);

    chain.push({
      index: chain.length,
      prevHash: prevBlock.hash,
      data: data,
      nonce: nonce,
      hash: newHash
    });

    renderChain();
    if (input) input.value = '';
    const screen = document.getElementById('blockchain-screen');
    if (screen) {
      screen.innerHTML = `<span style="color:#34d399;">✅ BLOQUE #${chain.length - 1} MINADO CON ÉXITO.\nHash: ${newHash}\nValidado por 1,024 nodos de la red sin intermediario bancario.</span>`;
    }
    if (window.GAMIFICATION) window.GAMIFICATION.addXP(40, "Bloque sellado criptográficamente en la blockchain");
  }

  // ------------------------------------------------------------
  // 2. SIMULADOR DE ATAQUE DE REENTRADA (REENTRANCY HACKER LAB)
  // ------------------------------------------------------------
  let victimBalance = 10.0;
  let attackerBalance = 0.0;
  let isSecuredWithCEI = false;

  function toggleCEIPattern() {
    isSecuredWithCEI = !isSecuredWithCEI;
    const btn = document.getElementById('reentrancy-toggle-btn');
    const status = document.getElementById('reentrancy-status-badge');
    if (btn) {
      btn.textContent = isSecuredWithCEI ? "🛡️ Patrón Seguro (Check-Effects-Interactions): ACTIVO" : "⚠️ Modo Vulnerable: SIN PROTECCIÓN";
      btn.className = isSecuredWithCEI ? "sim-btn sim-btn-success" : "sim-btn sim-btn-danger";
    }
    if (status) {
      status.textContent = isSecuredWithCEI ? "CONTRATO BLINDADO (CEI ON)" : "VULNERABLE A REENTRADA";
      status.style.color = isSecuredWithCEI ? "#34d399" : "#fb7185";
    }
    const screen = document.getElementById('reentrancy-screen');
    if (screen) {
      screen.innerHTML = isSecuredWithCEI 
        ? "Modo seguro activado: El contrato actualiza balances[msg.sender] = 0 ANTES de transferir fondos externos."
        : "Modo vulnerable activado: El contrato transfiere fondos antes de poner el saldo en cero.";
    }
  }

  function launchReentrancyExploit() {
    const screen = document.getElementById('reentrancy-screen');
    if (!screen) return;

    if (isSecuredWithCEI) {
      screen.innerHTML = `
[ATACANTE]: Llamando a retirarFondos() con depósito de 1 ETH...
[VICTIMA]: Checks superados -> saldo del atacante = 1 ETH.
[VICTIMA]: Effects: balances[msg.sender] = 0 (ESTADO ACTUALIZADO A TIEMPO).
[VICTIMA]: Interactions: transfiriendo 1 ETH al contrato atacante...
[ATACANTE]: Fallback() intercepta la transferencia e intenta REENTRAR llamando a retirarFondos()...
[VICTIMA]: REVERT! balances[msg.sender] es 0. Fondos protegidos.
🛡️ ATAQUE NEUTRALIZADO POR EL PATRÓN CHECK-EFFECTS-INTERACTIONS.
      `;
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(60, "Ataque de reentrada repelido con éxito");
    } else {
      victimBalance = 0.0;
      attackerBalance += 10.0;
      updateReentrancyBalances();
      screen.innerHTML = `
[ATACANTE]: Llamando a retirarFondos() con depósito de 1 ETH...
[VICTIMA]: Transfiriendo 1 ETH antes de actualizar variable interna...
[ATACANTE - Fallback()]: Reingresando recursivamente a retirarFondos()...
[VICTIMA]: Transfiriendo otro ETH (variable saldo aún no ha cambiado)...
[ATACANTE - Fallback()]: Reingresando llamada #3... #4... #10...
💥 DRENAJE TOTAL! El contrato víctima quedó en 0.0 ETH.
Pérdida irreversible: 10 ETH robados en una sola transacción atómica.
      `;
    }
  }

  function resetReentrancyLab() {
    victimBalance = 10.0;
    attackerBalance = 0.0;
    updateReentrancyBalances();
    const screen = document.getElementById('reentrancy-screen');
    if (screen) screen.textContent = "Laboratorio reiniciado. Depósito inicial de 10 ETH en la tesorería.";
  }

  function updateReentrancyBalances() {
    const vEl = document.getElementById('victim-balance');
    const aEl = document.getElementById('attacker-balance');
    if (vEl) vEl.textContent = `${victimBalance.toFixed(1)} ETH`;
    if (aEl) aEl.textContent = `${attackerBalance.toFixed(1)} ETH`;
  }

  // ------------------------------------------------------------
  // 3. ORÁCULO DE IA AGROPAY (DECISION ENGINE CON GEMINI SENSORS)
  // ------------------------------------------------------------
  function evaluateAgroBatch() {
    const temp = parseFloat(document.getElementById('agro-temp').value);
    const ph = parseFloat(document.getElementById('agro-ph').value);
    const purity = parseInt(document.getElementById('agro-purity').value, 10);
    const screen = document.getElementById('agro-screen');

    if (!screen) return;

    screen.innerHTML = `[ORÁCULO IA]: Invocando modelo de inferencia AgroVision (Gemini Multimodal)...
[SENSOR IoT]: Temp: ${temp}°C | pH: ${ph} | Pureza: ${purity}%\n`;

    setTimeout(() => {
      let isApproved = (temp <= 4.0 && ph >= 6.5 && ph <= 6.8 && purity >= 95);
      if (isApproved) {
        screen.innerHTML += `
[IA DECISIÓN]: Calidad Excelente (Grado A Premium).
[CRIPTOGRAFÍA]: Oráculo firma paquete criptográfico: 0x9f8b2e... ECDSA
[SMART CONTRACT]: AgroPayEscrow.liquidarPago(lote#8841, 100% fondos) ejecutada.
💰 PAGO DESEMBOLSADO: 3,450,000 COP (850 USDC) transferidos instantáneamente a la billetera de la Asociación Campesina.
        `;
        if (window.GAMIFICATION) window.GAMIFICATION.addXP(50, "Liquidación autónoma con Oráculo IA completada");
      } else {
        screen.innerHTML += `
[IA DECISIÓN]: ⚠️ LOTE RECHAZADO. Fallo en parámetros de inocuidad (Temp esperada <= 4°C, pH entre 6.5-6.8).
[SMART CONTRACT]: El depósito en garantía permanece bloqueado y se emite penalización al transportista.
        `;
      }
    }, 400);
  }

  // ------------------------------------------------------------
  // 4. TERMINAL CLI WEB3 INTERACTIVA
  // ------------------------------------------------------------
  function handleCliInput(e) {
    if (e.key === 'Enter') {
      const input = document.getElementById('cli-terminal-input');
      const output = document.getElementById('cli-terminal-output');
      if (!input || !output) return;

      const cmd = input.value.trim();
      input.value = '';

      output.innerHTML += `\n<span style="color:#00f0ff;">adso@web3-dev:~/agropay$</span> ${cmd}\n`;

      if (cmd === 'help') {
        output.innerHTML += `Comandos disponibles:
  npx hardhat compile      - Compila los contratos inteligentes en Solidity
  npx hardhat test         - Ejecuta la suite de pruebas unitarias TDD
  node scripts/deploy.js   - Simula el despliegue a red local (Hardhat Network)
  cat AgroPayEscrow.sol    - Inspecciona el código fuente del contrato principal
  clear                    - Limpia la pantalla de la terminal`;
      } else if (cmd === 'npx hardhat compile') {
        output.innerHTML += `<span style="color:#34d399;">Compiled 2 Solidity files successfully (solc 0.8.24).
Artifacts written to ./artifacts</span>`;
        if (window.GAMIFICATION) window.GAMIFICATION.addXP(30, "Compilación exitosa con solc");
      } else if (cmd === 'npx hardhat test') {
        output.innerHTML += `<span style="color:#38bdf8;">  Contract: AgroPayEscrow</span>
    <span style="color:#34d399;">✔ Debería recibir el depósito en garantía de la alcaldía (45ms)</span>
    <span style="color:#34d399;">✔ Debería validar que sólo el oráculo de IA puede reportar calidad (38ms)</span>
    <span style="color:#34d399;">✔ Debería bloquear pagos si la temperatura supera 4°C (41ms)</span>
    <span style="color:#34d399;">✔ Debería proteger contra ataques de reentrada aplicando CEI (52ms)</span>

  <span style="color:#34d399; font-weight:700;">4 passing (176ms) - Cobertura de funciones: 100%</span>`;
        if (window.GAMIFICATION) window.GAMIFICATION.addXP(70, "Suite de pruebas TDD ejecutada con 100% verde");
      } else if (cmd === 'node scripts/deploy.js') {
        output.innerHTML += `Deploying contracts with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
AgroPayEscrow deployed to: <span style="color:#00f0ff;">0x5FbDB2315678afecb367f032d93F642f64180aa3</span>
Transaction hash: 0x82b947c61f238217bb68f237f3747d639b7201b1e83917411a7620439f02e6c1`;
        if (window.GAMIFICATION) window.GAMIFICATION.addXP(40, "Contrato desplegado en nodo local");
      } else if (cmd === 'cat AgroPayEscrow.sol') {
        output.innerHTML += `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract AgroPayEscrow {
    address public immutable oraculoIA;
    mapping(uint256 => uint256) public pagosProductores;
    // ... Patrón Check-Effects-Interactions implementado
}`;
      } else if (cmd === 'clear' || cmd === 'cls') {
        output.innerHTML = '';
      } else {
        output.innerHTML += `<span style="color:#f43f5e;">Comando no reconocido. Escribe 'help' para ver la lista de comandos.</span>`;
      }

      const body = document.getElementById('cli-body-scroll');
      if (body) body.scrollTop = body.scrollHeight;
    }
  }

  // ============================================================
  // 5. MOTOR DEL ECOSISTEMA MULTI-INDUSTRIA (12 LABORATORIOS)
  // ============================================================
  let currentBlockHeight = 1842092;
  let activePipelineStep = 1;

  // Estado Electoral ZK
  const votersData = [
    { name: "Ana Gómez", dni: "48920192A", tokenActive: true, nullifier: "0x3b89994e72a088cd91fe112345bcda01" },
    { name: "Carlos Ruiz", dni: "71290384B", tokenActive: true, nullifier: "0x1a70661c44ba22ee88aa908123efb022" },
    { name: "Elena Torres", dni: "30491823C", tokenActive: true, nullifier: "0x882e7d01cc339900fa12ab54671239aa" }
  ];
  let currentVoterIdx = 0;
  let zkProofReady = false;
  let electoralCounts = { 1: 0, 2: 0, 3: 0 };
  let registeredNullifiers = [];

  // Lotes Farmacéuticos
  const pharmaBatches = {
    "LOT-7741": { name: "Vacuna Pediátrica Pentavalente", status: "VALID", temp: 4.2 },
    "LOT-8890": { name: "Insulina Recombinante Humana", status: "VALID", temp: 3.8 },
    "LOT-9921": { name: "Inmunoglobulina Anti-Rh", status: "VALID", temp: 4.5 }
  };
  let activePharmaBatch = "LOT-7741";

  // Pasos del Pipeline de 6 Fases
  const pipelineSteps = [
    {
      title: "Captura en el Dispositivo Físico Seguro",
      role: "Rol del Programador: Firmware C/C++ en ESP32 / Arduino",
      desc: "El sensor térmico PT100 o el chip NFC NTAG 424 realiza la medición física del entorno. La medición nunca se envía en texto plano sin firmar. El microcontrolador lee el valor crudo en memoria volátil segura.",
      hw: "Lectura analógica ADC -> Convertida a float en memoria volátil segura.",
      code: `// Firmware C/C++ (ESP32 con criptochip)
float temp = pt100.readTemperature();
uint8_t payload[32];
memcpy(payload, &temp, sizeof(temp));`
    },
    {
      title: "Firma Criptográfica en Hardware Seguro (HSM / Secure Element)",
      role: "Rol del Programador: Integración con CryptoAuthLib (Microchip)",
      desc: "El microcontrolador no calcula la firma en su CPU general. Envía el hash del dato al coprocesador ATECC608A o Smartcard vía bus I2C. La clave privada nunca sale del silicio.",
      hw: "El hardware genera una firma ECDSA secp256k1 inmutable.",
      code: `// Criptochip firma con su clave privada interna
ATCA_STATUS status = atcab_sign(0, sha256_hash, signature);
// signature contiene (r, s) de 64 bytes`
    },
    {
      title: "Transmisión por Red Oráculo & Mempool",
      role: "Rol del Programador: Gateway Oráculo en TypeScript / Go",
      desc: "El gateway recibe el paquete firmado por MQTT/NB-IoT y prepara una transacción JSON-RPC hacia el nodo validador de la blockchain, codificando la firma en formato de la EVM.",
      hw: "Módem celular transmite paquetes cifrados TLS 1.3.",
      code: `// Gateway Node.js / Viem
const tx = await contract.write.recordTelemetry([
  batchId,
  tempX10,
  timestamp,
  signatureBytes
]);`
    },
    {
      title: "Ejecución Determinista del Smart Contract (EVM)",
      role: "Rol del Programador: Smart Contract en Solidity",
      desc: "Los validadores ejecutan la función. El contrato recupera la dirección pública del firmante mediante ecrecover() y verifica si está autorizada por el Ministerio de Salud.",
      hw: "La máquina virtual EVM valida la firma y evalúa los umbrales de frío.",
      code: `// Solidity
address signer = ecrecover(messageHash, v, r, s);
require(authorizedSensors[signer], "Sensor no autorizado");
if (temp > 80 || temp < 20) {
    batchStatus[batchId] = Status.QUARANTINE;
    emit ColdChainBreached(batchId, temp);
}`
    },
    {
      title: "Consenso BFT & Almacenamiento Inmutable en Bloque",
      role: "Rol del Programador: DevOps / Infraestructura de Nodos",
      desc: "Los 4 nodos validadores intercambian votos de consenso QBFT. Cuando más del 66% aprueba el bloque, se incluye en la cadena y se actualiza el Merkle Patricia Trie en RocksDB.",
      hw: "Almacenamiento en disco SSD NVMe de cada nodo validador.",
      code: `// Log de Consenso QBFT
[INFO] Commit block #1842093 (Hash: 0x9f1a...)
Round: 0, Signatures: 4/4 nodes OK.`
    },
    {
      title: "Indexación Off-Chain a PostgreSQL (Patrón CQRS)",
      role: "Rol del Programador: Worker ETL en TypeScript / Python",
      desc: "Un servicio indexador escucha el evento ColdChainBreached vía WebSocket, decodifica los argumentos y ejecuta un INSERT/UPDATE en PostgreSQL en menos de 1 milisegundo.",
      hw: "Servidor de base de datos relacional para analítica y UI.",
      code: `// Indexador Escuchando Eventos
contract.on("ColdChainBreached", async (batchId, temp) => {
  await pgPool.query(
    "UPDATE tokens_registry SET is_burned = true WHERE token_id = $1",
    [batchId]
  );
});`
    }
  ];

  // Snippets de Smart Contracts Multi-Industria
  const contractSnippets = {
    pharma: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ColdChainTracker {
    enum Status { SAFE, QUARANTINE }
    
    struct Batch {
        int256 lastTempX10;
        Status status;
        uint256 updatedAt;
    }
    
    mapping(string => Batch) public batches;
    address public certifiedLab;

    event TelemetryLogged(string indexed batchId, int256 temp, Status status);

    constructor() {
        certifiedLab = msg.sender;
    }

    function recordTelemetry(string memory batchId, int256 tempX10) external {
        // Regla: Rango +2.0°C a +8.0°C (20 a 80 en decimas)
        Status newStatus = (tempX10 >= 20 && tempX10 <= 80) ? Status.SAFE : Status.QUARANTINE;
        
        batches[batchId] = Batch({
            lastTempX10: tempX10,
            status: newStatus,
            updatedAt: block.timestamp
        });

        emit TelemetryLogged(batchId, tempX10, newStatus);
    }
}`,
    voting: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AnonymousVotingZK {
    mapping(bytes32 => bool) public usedNullifiers;
    mapping(uint256 => uint256) public voteTally;

    event VoteCast(bytes32 indexed nullifier, uint256 candidateId);

    function castVote(
        bytes32 nullifier,
        uint256 candidateId,
        uint256[8] calldata zkProof
    ) external {
        require(!usedNullifiers[nullifier], "Nullifier already used");
        
        // Verificacion en circuito: verifier.verifyProof(zkProof, [nullifier, candidateId])
        usedNullifiers[nullifier] = true;
        voteTally[candidateId] += 1;

        emit VoteCast(nullifier, candidateId);
    }
}`,
    honey: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PureHoneyCertification {
    struct Analysis {
        uint256 humidityX10;
        uint256 hmf;
        bool isPure;
    }
    mapping(bytes32 => Analysis) public certifiedBatches;

    function certifyBatch(bytes32 batchHash, uint256 humX10, uint256 hmf) external {
        require(humX10 <= 200, "Humidity exceeds 20.0%");
        require(hmf <= 40, "HMF exceeds 40 mg/kg");
        
        certifiedBatches[batchHash] = Analysis(humX10, hmf, true);
    }
}`
  };

  // Comandos de Emuladores para la Consola Local
  const terminalCommands = {
    foundry: {
      title: "foundry-cli: forge test -vvvv & anvil",
      lines: [
        "$ forge test --match-contract ColdChainTest -vvvv",
        "[⠢] Compiling 12 files with Solc 0.8.20...",
        "[⠆] Solc 0.8.20 finished in 412.30ms",
        "Compiler run successful!",
        "",
        "Running 3 tests for test/ColdChainTest.t.sol:ColdChainTest",
        "[PASS] test_RevertWhen_TempExceedsRange() (gas: 28412)",
        "  ├─ [24102] ColdChainTracker::recordTelemetry(\"LOT-7741\", 92)",
        "  │   ├─ emit ColdChainBreached(\"LOT-7741\", 92)",
        "  │   └─ ← [Return] Status.QUARANTINE",
        "[PASS] test_SafeRange_MaintainsActiveStatus() (gas: 31209)",
        "[PASS] test_Fuzz_TemperatureThresholds(int256) (runs: 512, μ: 29810, ~: 30000)",
        "Suite result: ok. 3 passed; 0 failed; 0 skipped; finished in 18.2ms"
      ]
    },
    wokwi: {
      title: "wokwi-cli: ESP32 + PT100 + ATECC608A Emulation",
      lines: [
        "$ wokwi-cli --chip esp32 --diagram ./diagram.json",
        "Starting Wokwi IoT Hardware Simulation Engine v1.8...",
        "[ESP32] I2C Bus Initialized at SDA:GPIO21, SCL:GPIO22 (400kHz)",
        "[ATECC608A] Cryptographic Co-processor detected at address 0x60",
        "[ATECC608A] Reading Serial Number: 0x012358890ABCDEF001",
        "[SENSOR PT100] ADC Value 1824 -> Calibrated Temp: 4.25 C",
        "[CRYPTO] Signing SHA256(payload) with Slot 0 Private Key...",
        "[CRYPTO] Generated Signature (r,s): 64 bytes generated in 1.2ms",
        "[WIFI/MQTT] Connecting to simulated broker at ws://127.0.0.1:8545...",
        "[WIFI/MQTT] Packet published: 88 bytes sent over CoAP/TLS."
      ]
    },
    circom: {
      title: "circom: Zero-Knowledge Circuit Compilation & Groth16 Setup",
      lines: [
        "$ circom voting_nullifier.circom --r1cs --wasm --sym",
        "Template instances: 3",
        "Non-linear constraints: 1,842",
        "Linear constraints: 2,109",
        "Public inputs: 2 (nullifierHash, candidateId)",
        "Private inputs: 1 (voterSecretKey)",
        "Written R1CS to voting_nullifier.r1cs",
        "Written WASM code to voting_nullifier_js/voting_nullifier.wasm",
        "$ snarkjs groth16 setup voting_nullifier.r1cs ptau_final.ptau circuit_0000.zkey",
        "[INFO] snarkjs: ZKey generated. Exporting Verifier.sol ready for Remix/Foundry!"
      ]
    },
    nfc: {
      title: "node mock-nfc-ntag424.js: APDU Cryptographic Simulator",
      lines: [
        "$ node scripts/mock-nfc-ntag424.js",
        "[NFC READER] Polling for ISO/IEC 14443 Type A tags...",
        "[NFC TAG FOUND] UID: 04:A2:81:9B:7C:10:80",
        "Sending APDU: 00 A4 04 00 07 D2 76 00 00 85 01 01 00 (Select App)",
        "Tag Response: 90 00 (SW_OK)",
        "Sending APDU: 90 C7 00 00 05 (AuthenticateEV2First)",
        "Tag Response: Session Key established using AES-128 CMAC",
        "[SUN PROTOCOL] Generated dynamic MIRROR code: https://pharma.verify/?picc_data=8F12...&cmac=99B1...",
        "[RESULT] URL changes on every tap. Physical tag cloning impossible."
      ]
    },
    slither: {
      title: "slither: Static Security Analyzer Output",
      lines: [
        "$ slither contracts/ColdChainTracker.sol --checklist",
        "INFO:Detectors: Running 89 detectors on contracts/ColdChainTracker.sol...",
        "INFO:Detectors:",
        "  [✓] reentrancy-eth: No reentrancy issues detected",
        "  [✓] arbitrary-send-erc20: No unprotected transfers found",
        "  [✓] timestamp: block.timestamp usage does not affect critical flow",
        "  [✓] uninitialized-state: All mappings and variables initialized",
        "INFO:Slither: contracts/ColdChainTracker.sol analyzed (1 contracts)",
        "Result: 0 High Vulnerabilities, 0 Medium Vulnerabilities, 0 Informational."
      ]
    },
    besu: {
      title: "docker compose: 4-Node QBFT Private Consortium Network",
      lines: [
        "$ docker compose -f consortium-besu-4nodes.yml up -d",
        "Creating network 'besu-consortium' with driver 'bridge'",
        "Creating node1-validator ... done (Port 8545: HTTP JSON-RPC)",
        "Creating node2-validator ... done (Port 8546: P2P Peer)",
        "Creating node3-validator ... done (Port 8547: P2P Peer)",
        "Creating node4-validator ... done (Port 8548: P2P Peer)",
        "[INFO] Consenso QBFT activado. Tiempo entre bloques: 2.0s.",
        "[INFO] Gas Limit: 30,000,000. Gas Price Base: 0 Gwei (Red permisionada)."
      ]
    }
  };

  // Notificación Toast Integrada
  function openToast(msg, title = "Operación Exitosa", icon = "fa-circle-check", isError = false) {
    let container = document.getElementById('sovereign-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sovereign-toast-container';
      container.className = 'sovereign-toast-container';
      container.innerHTML = `
        <div id="sovereign-toast-box" class="sovereign-toast-box">
          <div id="sovereign-toast-icon" style="font-size:20px;">⚡</div>
          <div>
            <strong id="sovereign-toast-title" style="display:block; font-size:13px; color:#fff;">Notificación</strong>
            <span id="sovereign-toast-msg" style="color:#94a3b8; font-size:12px;">Mensaje</span>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    }

    const box = document.getElementById('sovereign-toast-box');
    const titleEl = document.getElementById('sovereign-toast-title');
    const msgEl = document.getElementById('sovereign-toast-msg');
    const iconEl = document.getElementById('sovereign-toast-icon');

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = msg;
    if (iconEl) iconEl.innerText = isError ? '⚠️' : '✅';
    if (box) {
      if (isError) {
        box.classList.add('error');
      } else {
        box.classList.remove('error');
      }
    }

    container.classList.add('active');
    setTimeout(() => {
      container.classList.remove('active');
    }, 3800);
  }

  function switchMultiSimTab(tabId) {
    document.querySelectorAll('.multisim-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.multisim-tab-btn').forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById(`msim-${tabId}`);
    const btn = document.getElementById(`msim-btn-${tabId}`);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');
  }

  function updateVoterCredentials() {
    const select = document.getElementById('voter-select');
    if (!select) return;
    currentVoterIdx = parseInt(select.value, 10);
    const voter = votersData[currentVoterIdx];

    const statusEl = document.getElementById('voter-token-status');
    const nullifierEl = document.getElementById('voter-nullifier');
    const zkStatusEl = document.getElementById('voter-zk-status');

    if (statusEl) {
      if (voter.tokenActive) {
        statusEl.innerText = "1 TOKEN ACTIVO (No Quemado)";
        statusEl.style.color = "#34d399";
      } else {
        statusEl.innerText = "0 TOKENS (VOTO YA QUEMADO)";
        statusEl.style.color = "#f43f5e";
      }
    }

    if (nullifierEl) nullifierEl.innerText = voter.nullifier;
    zkProofReady = false;
    if (zkStatusEl) {
      zkStatusEl.innerText = "Pendiente de Cálculo";
      zkStatusEl.style.color = "#f59e0b";
    }
  }

  function generateZKProof() {
    const voter = votersData[currentVoterIdx];
    if (!voter.tokenActive) {
      openToast("Este elector ya ejerció su voto. El token fue quemado.", "Credencial Inválida", "fa-ban", true);
      return;
    }

    const zkStatusEl = document.getElementById('voter-zk-status');
    if (zkStatusEl) {
      zkStatusEl.innerHTML = `Computando curvas R1CS en WebAssembly...`;
      zkStatusEl.style.color = "#818cf8";
    }

    setTimeout(() => {
      zkProofReady = true;
      if (zkStatusEl) {
        zkStatusEl.innerText = "Prueba Groth16 Generada (π_A, π_B, π_C)";
        zkStatusEl.style.color = "#34d399";
      }
      openToast("Prueba ZK-SNARK computada en el navegador", "ZK-Proof Lista", "fa-atom");
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(35, "Prueba Groth16 ZK-SNARK generada en navegador");
    }, 600);
  }

  function castVote() {
    const voter = votersData[currentVoterIdx];
    if (!voter.tokenActive) {
      openToast("Ataque de Doble Voto detectado: El Nullifier ya existe en el mapping on-chain.", "Reversión Criptográfica", "fa-shield-halved", true);
      return;
    }

    if (!zkProofReady) {
      openToast("Debes generar la prueba ZK antes de emitir la transacción.", "Prueba Requerida", "fa-triangle-exclamation", true);
      return;
    }

    const checked = document.querySelector('input[name="candidate-choice"]:checked');
    const candidate = checked ? checked.value : "1";
    electoralCounts[candidate]++;
    voter.tokenActive = false;
    registeredNullifiers.push({
      block: currentBlockHeight,
      nullifier: voter.nullifier,
      zk: "Groth16 VALID"
    });

    currentBlockHeight++;
    const counter = document.getElementById('global-block-counter');
    if (counter) counter.innerText = `#${currentBlockHeight.toLocaleString('es-CO')}`;

    updateVoterCredentials();
    renderElectoralResults();
    openToast(`Voto emitido para opción ${candidate}. Nullifier registrado inmutablemente.`, "Voto Confirmado", "fa-check-double");
    if (window.GAMIFICATION) window.GAMIFICATION.addXP(45, "Voto electoral ZK emitido con protección anti-replay");
  }

  function renderElectoralResults() {
    const total = electoralCounts[1] + electoralCounts[2] + electoralCounts[3];
    const totalEl = document.getElementById('elections-total-votes');
    if (totalEl) totalEl.innerText = total;

    const p1 = total > 0 ? ((electoralCounts[1] / total) * 100).toFixed(1) : 0;
    const p2 = total > 0 ? ((electoralCounts[2] / total) * 100).toFixed(1) : 0;
    const p3 = total > 0 ? ((electoralCounts[3] / total) * 100).toFixed(1) : 0;

    const c1Pct = document.getElementById('votes-c1-pct');
    const c1Bar = document.getElementById('votes-c1-bar');
    if (c1Pct) c1Pct.innerText = `${p1}% (${electoralCounts[1]} votos)`;
    if (c1Bar) c1Bar.style.width = `${p1}%`;

    const c2Pct = document.getElementById('votes-c2-pct');
    const c2Bar = document.getElementById('votes-c2-bar');
    if (c2Pct) c2Pct.innerText = `${p2}% (${electoralCounts[2]} votos)`;
    if (c2Bar) c2Bar.style.width = `${p2}%`;

    const c3Pct = document.getElementById('votes-c3-pct');
    const c3Bar = document.getElementById('votes-c3-bar');
    if (c3Pct) c3Pct.innerText = `${p3}% (${electoralCounts[3]} votos)`;
    if (c3Bar) c3Bar.style.width = `${p3}%`;

    const tbody = document.getElementById('nullifier-table-body');
    if (tbody) {
      tbody.innerHTML = "";
      registeredNullifiers.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding:4px 8px; color:var(--accent-cyan); font-weight:bold;">#${item.block}</td>
          <td style="padding:4px 8px; font-family:monospace; color:#cbd5e1;">${item.nullifier.substring(0, 16)}...</td>
          <td style="padding:4px 8px; color:#34d399;">${item.zk}</td>
          <td style="padding:4px 8px;"><span style="background:rgba(244,63,94,0.2); color:#fb7185; border:1px solid #e11d48; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">QUEMADO</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  function setPipelineStep(step) {
    activePipelineStep = step;
    for (let i = 1; i <= 6; i++) {
      const btn = document.getElementById(`pipe-btn-${i}`);
      if (btn) {
        if (i === step) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }

    const data = pipelineSteps[step - 1];
    const badge = document.getElementById('pipe-step-badge');
    const title = document.getElementById('pipe-step-title');
    const role = document.getElementById('pipe-step-role');
    const desc = document.getElementById('pipe-step-desc');
    const hw = document.getElementById('pipe-step-hw');
    const code = document.getElementById('pipe-step-code');

    if (badge) badge.innerText = `ETAPA ${step} DE 6`;
    if (title) title.innerText = data.title;
    if (role) role.innerText = data.role;
    if (desc) desc.innerText = data.desc;
    if (hw) hw.innerText = data.hw;
    if (code) code.innerText = data.code;
  }

  function prevPipelineStep() {
    if (activePipelineStep > 1) {
      setPipelineStep(activePipelineStep - 1);
    }
  }

  function nextPipelineStep() {
    if (activePipelineStep < 6) {
      setPipelineStep(activePipelineStep + 1);
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(15, `Exploración de etapa ${activePipelineStep} del pipeline`);
    }
  }

  function loadPharmaBatchData() {
    const sel = document.getElementById('pharma-batch-select');
    if (!sel) return;
    activePharmaBatch = sel.value;
    const batch = pharmaBatches[activePharmaBatch];
    const slider = document.getElementById('temp-slider');
    if (slider) {
      slider.value = batch.temp;
      handleTemperatureChange(batch.temp);
    }
  }

  function handleTemperatureChange(val) {
    const temp = parseFloat(val);
    const display = document.getElementById('temp-display-val');
    if (display) display.innerText = `${temp.toFixed(1)}°C`;

    const badge = document.getElementById('pharma-contract-status-badge');
    const scanVerdict = document.getElementById('pharma-scan-verdict');

    if (temp >= 2.0 && temp <= 8.0) {
      if (display) display.style.color = "#34d399";
      if (badge) {
        badge.style.background = "rgba(16, 185, 129, 0.2)";
        badge.style.color = "#34d399";
        badge.style.borderColor = "#059669";
        badge.innerText = "ESTADO: APTO PARA USO CLÍNICO";
      }
      if (scanVerdict) scanVerdict.innerText = `El lote ${activePharmaBatch} se mantiene dentro del rango seguro (+2°C a +8°C). Apto para aplicación.`;
    } else {
      if (display) display.style.color = "#f43f5e";
      if (badge) {
        badge.style.background = "rgba(244, 63, 94, 0.2)";
        badge.style.color = "#fb7185";
        badge.style.borderColor = "#e11d48";
        badge.innerText = "ESTADO: EN CUARENTENA (CADENA ROTA)";
      }
      if (scanVerdict) scanVerdict.innerText = `¡ALERTA CRÍTICA! Lote ${activePharmaBatch} comprometido térmicamente. El Smart Contract ha bloqueado su aplicación.`;
    }

    const sig = document.getElementById('pharma-signature-display');
    if (sig) sig.innerText = "0x" + Math.random().toString(16).substring(2, 14) + "...";
  }

  function commitPharmaTelemetry() {
    const slider = document.getElementById('temp-slider');
    const temp = slider ? parseFloat(slider.value) : 4.2;
    const historyBody = document.getElementById('pharma-history-body');
    const now = new Date().toTimeString().split(' ')[0];

    currentBlockHeight++;
    const counter = document.getElementById('global-block-counter');
    if (counter) counter.innerText = `#${currentBlockHeight.toLocaleString('es-CO')}`;

    if (historyBody) {
      const tr = document.createElement('tr');
      if (temp >= 2.0 && temp <= 8.0) {
        tr.innerHTML = `
          <td style="padding:6px 8px; color:#64748b;">${now}</td>
          <td style="padding:6px 8px; color:#34d399; font-weight:bold;">${temp.toFixed(1)}°C</td>
          <td style="padding:6px 8px; color:var(--accent-cyan); font-family:monospace;">0x${Math.random().toString(16).substring(2, 8)}...ok</td>
          <td style="padding:6px 8px; color:#34d399; font-weight:600;">VALID_RANGE</td>
        `;
        openToast(`Telemetría registrada para ${activePharmaBatch}. Temperatura segura.`, "Telemetría OK", "fa-temperature-half");
        if (window.GAMIFICATION) window.GAMIFICATION.addXP(40, "Telemetría médica validada por smart contract");
      } else {
        tr.innerHTML = `
          <td style="padding:6px 8px; color:#64748b;">${now}</td>
          <td style="padding:6px 8px; color:#fb7185; font-weight:bold;">${temp.toFixed(1)}°C</td>
          <td style="padding:6px 8px; color:#fb7185; font-family:monospace;">0x${Math.random().toString(16).substring(2, 8)}...ok</td>
          <td style="padding:6px 8px; color:#fb7185; font-weight:bold;">BREACH_DETECTED</td>
        `;
        openToast(`¡Ruptura de cadena de frío! Lote puesto en cuarentena en bloque #${currentBlockHeight}`, "Alerta Sanitaria", "fa-triangle-exclamation", true);
        if (window.GAMIFICATION) window.GAMIFICATION.addXP(50, "Detección y bloqueo automático de lote comprometido");
      }
      historyBody.prepend(tr);
    }
  }

  function loadHoneyPreset(type) {
    const humEl = document.getElementById('honey-humidity');
    const hmfEl = document.getElementById('honey-hmf');
    const deltaEl = document.getElementById('honey-delta-c');

    if (type === 'pure') {
      if (humEl) humEl.value = "17.2";
      if (hmfEl) hmfEl.value = "14.0";
      if (deltaEl) deltaEl.value = "-26.4";
    } else if (type === 'c4') {
      if (humEl) humEl.value = "18.5";
      if (hmfEl) hmfEl.value = "22.0";
      if (deltaEl) deltaEl.value = "-22.1";
    } else if (type === 'heated') {
      if (humEl) humEl.value = "16.1";
      if (hmfEl) hmfEl.value = "58.0";
      if (deltaEl) deltaEl.value = "-26.2";
    }
    evaluateHoneySmartContract();
  }

  function evaluateHoneySmartContract() {
    const humEl = document.getElementById('honey-humidity');
    const hmfEl = document.getElementById('honey-hmf');
    const deltaEl = document.getElementById('honey-delta-c');

    const hum = humEl ? parseFloat(humEl.value) : 17.2;
    const hmf = hmfEl ? parseFloat(hmfEl.value) : 14.0;
    const delta = deltaEl ? parseFloat(deltaEl.value) : -26.4;

    const badge = document.getElementById('honey-nft-status-badge');
    const box = document.getElementById('honey-verdict-box');
    const title = document.getElementById('honey-verdict-title');
    const text = document.getElementById('honey-verdict-text');

    const certHum = document.getElementById('cert-humidity-val');
    const certHmf = document.getElementById('cert-hmf-val');
    const certC4 = document.getElementById('cert-c4-val');

    if (certHum) certHum.innerText = `${hum.toFixed(1)}%`;
    if (certHmf) certHmf.innerText = `${hmf.toFixed(1)} mg/kg`;

    const humValid = hum <= 20.0;
    const hmfValid = hmf <= 40.0;
    const c4Valid = delta <= -24.5;

    if (humValid && hmfValid && c4Valid) {
      if (badge) {
        badge.style.background = "rgba(16, 185, 129, 0.2)";
        badge.style.color = "#34d399";
        badge.style.borderColor = "#059669";
        badge.innerText = "NFT MINT: APROBADO";
      }
      if (box) {
        box.style.background = "rgba(16, 185, 129, 0.1)";
        box.style.borderColor = "rgba(16, 185, 129, 0.4)";
      }
      if (title) {
        title.style.color = "#34d399";
        title.innerHTML = `✅ Miel 100% Pura de Floración Nativa Certificada`;
      }
      if (text) text.innerText = "Todos los parámetros físico-químicos cumplen los estándares del Codex Alimentarius. Se ha acuñado el NFT de Denominación de Origen en la red.";
      if (certC4) {
        certC4.innerText = "0.2‰ (Negativo para jarabes C4)";
        certC4.style.color = "#34d399";
      }
      openToast("Certificado de Miel Pura emitido en el bloque actual", "NFT Acuñado", "fa-certificate");
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(45, "Acuñación de certificado NFT para lote de miel pura");
    } else {
      if (badge) {
        badge.style.background = "rgba(244, 63, 94, 0.2)";
        badge.style.color = "#fb7185";
        badge.style.borderColor = "#e11d48";
        badge.innerText = "NFT MINT: RECHAZADO";
      }
      if (box) {
        box.style.background = "rgba(244, 63, 94, 0.1)";
        box.style.borderColor = "rgba(244, 63, 94, 0.4)";
      }
      if (title) {
        title.style.color = "#fb7185";
        title.innerHTML = `❌ Miel No Apta: Fraude o Sobrecalentamiento Detectado`;
      }
      let reasons = [];
      if (!humValid) reasons.push("Exceso de humedad (>20%) riesgo de fermentación");
      if (!hmfValid) reasons.push("HMF sobrepasa 40 mg/kg (indica sobrecalentamiento)");
      if (!c4Valid) reasons.push("Firma delta 13C positiva para adulteración con jarabe de maíz C4");
      if (text) text.innerText = "Motivos de rechazo: " + reasons.join("; ") + ". Transacción revertida por el Smart Contract.";
      if (certC4) {
        certC4.innerText = !c4Valid ? "POSITIVO ADULTERACIÓN C4" : "Normal";
        certC4.style.color = "#fb7185";
      }
      openToast("El Smart Contract revirtió el minado de la miel. Parámetros adulterados.", "Fraude Detectado", "fa-ban", true);
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(40, "Detección de fraude alimentario con espectrometría");
    }
  }

  function runAuditorTest(testType) {
    const out = document.getElementById('auditor-terminal-output');
    const now = new Date().toTimeString().split(' ')[0];

    let html = "";
    if (testType === 'reentrancy') {
      html = `
        <div style="color:#f59e0b; font-weight:bold;">[TEST: REENTRANCY INJECTION] [${now}]</div>
        <div style="color:#cbd5e1;">> Deploying AttackerContract.sol with fallback() loop...</div>
        <div style="color:var(--accent-cyan);">> Invoking castVote() recursively before state update...</div>
        <div style="color:#34d399; font-weight:bold;">> [PASSED] ReentrancyGuard: Transaction reverted with 'ReentrancyGuardReentrantCall()'. Gas: 21,304.</div>
      `;
    } else if (testType === 'replay') {
      html = `
        <div style="color:#f59e0b; font-weight:bold;">[TEST: REPLAY ATTACK WITH REUSED NULLIFIER] [${now}]</div>
        <div style="color:#cbd5e1;">> Resending signature 0x3b89994e... on block #${currentBlockHeight + 1}</div>
        <div style="color:#fb7185;">> EVM Execution reverted: require(!usedNullifiers[nullifier]) FAILED.</div>
        <div style="color:#34d399; font-weight:bold;">> [PASSED] Anti-replay mapping validated. Double voting is mathematically impossible.</div>
      `;
    } else if (testType === 'oracle') {
      html = `
        <div style="color:#f59e0b; font-weight:bold;">[TEST: ROGUE IOT ORACLE INJECTION] [${now}]</div>
        <div style="color:#cbd5e1;">> Generating unauthorized ECDSA keypair (0xBadF00d...)</div>
        <div style="color:#cbd5e1;">> Attempting to push fake temperature: 4.0°C to LOT-7741</div>
        <div style="color:#fb7185;">> EVM Execution reverted: onlyCertifiedLabOrSensor() FAILED.</div>
        <div style="color:#34d399; font-weight:bold;">> [PASSED] Access Control list in Smart Contract rejected rogue oracle key.</div>
      `;
    } else if (testType === 'mitm') {
      html = `
        <div style="color:#f59e0b; font-weight:bold;">[TEST: MAN-IN-THE-MIDDLE PAYLOAD TAMPERING] [${now}]</div>
        <div style="color:#cbd5e1;">> Intercepting LIMS payload. Flipping 1 bit in HMF field: 14.0 -> 54.0 mg/kg</div>
        <div style="color:#cbd5e1;">> Submitting altered data with original signature...</div>
        <div style="color:#fb7185;">> EVM Execution reverted: ecrecover mismatch. Hash does not match signature.</div>
        <div style="color:#34d399; font-weight:bold;">> [PASSED] Cryptographic integrity intact. Modified payload rejected.</div>
      `;
    }

    if (out) out.innerHTML = html + out.innerHTML;
    openToast(`Prueba de seguridad '${testType}' completada con éxito.`, "Auditoría Slither", "fa-user-shield");
    if (window.GAMIFICATION) window.GAMIFICATION.addXP(40, `Prueba de seguridad '${testType}' ejecutada`);
  }

  function generateAuditReport() {
    openToast("Dictamen formal de auditoría generado: '0 High, 0 Medium, 0 Low'.", "Reporte Emitido", "fa-file-shield");
    if (window.GAMIFICATION) window.GAMIFICATION.addXP(50, "Emisión de dictamen de auditoría formal");
  }

  function switchContractCode(type) {
    const display = document.getElementById('apprentice-code-display');
    const title = document.getElementById('apprentice-code-title');
    const lbl1 = document.getElementById('lbl-app-param1');
    const lbl2 = document.getElementById('lbl-app-param2');
    const inp1 = document.getElementById('app-input-1');
    const inp2 = document.getElementById('app-input-2');

    if (display) display.innerText = contractSnippets[type] || "";
    if (type === 'pharma') {
      if (title) title.innerText = "ColdChainTracker.sol";
      if (lbl1) lbl1.innerText = "ID del Lote (string):";
      if (lbl2) lbl2.innerText = "Temperatura en Décimas (int256, ej 45 = 4.5°C):";
      if (inp1) inp1.value = "LOT-7741";
      if (inp2) inp2.value = "45";
    } else if (type === 'voting') {
      if (title) title.innerText = "AnonymousVotingZK.sol";
      if (lbl1) lbl1.innerText = "Nullifier Hash (bytes32):";
      if (lbl2) lbl2.innerText = "ID del Candidato (uint256):";
      if (inp1) inp1.value = "0x3b89994e72a088cd91fe112345bcda01";
      if (inp2) inp2.value = "1";
    } else if (type === 'honey') {
      if (title) title.innerText = "PureHoneyCertification.sol";
      if (lbl1) lbl1.innerText = "Hash del Lote de Miel (bytes32):";
      if (lbl2) lbl2.innerText = "HMF en mg/kg (uint256):";
      if (inp1) inp1.value = "0xfa8921ec490a...b01";
      if (inp2) inp2.value = "14";
    }
  }

  function runApprenticeContractTest() {
    const inp1 = document.getElementById('app-input-1');
    const inp2 = document.getElementById('app-input-2');
    const val1 = inp1 ? inp1.value : "LOT-7741";
    const val2 = inp2 ? inp2.value : "45";
    const log = document.getElementById('app-test-log');
    const gasEl = document.getElementById('app-gas-used');

    currentBlockHeight++;
    const counter = document.getElementById('global-block-counter');
    if (counter) counter.innerText = `#${currentBlockHeight.toLocaleString('es-CO')}`;

    const gas = Math.floor(Math.random() * 8000) + 38000;
    if (gasEl) gasEl.innerText = `Gas: ${gas.toLocaleString('es-CO')}`;

    const time = new Date().toTimeString().split(' ')[0];
    if (log) {
      log.innerHTML = `
        <div style="color:#34d399; font-weight:bold;">[TX SUCCESS] [${time}] Hash: 0x${Math.random().toString(16).substring(2, 10)}...</div>
        <div style="color:var(--accent-cyan);">> Params: arg0="${val1}", arg1=${val2}</div>
        <div style="color:#cbd5e1;">> Block #${currentBlockHeight} confirmed with 0 reversions.</div>
        <div style="color:#c084fc;">> Event Emitted: Logged(batch="${val1}", val=${val2})</div>
      `;
    }
    openToast(`Transacción ejecutada en la EVM local en bloque #${currentBlockHeight}`, "EVM Success", "fa-bolt");
    if (window.GAMIFICATION) window.GAMIFICATION.addXP(40, "Función ejecutada exitosamente en EVM local");
  }

  function resetApprenticeState() {
    const log = document.getElementById('app-test-log');
    if (log) log.innerHTML = `<div style="color:#64748b;">// Estado de memoria de la EVM reiniciado.</div>`;
    openToast("Estado de la EVM local reiniciado a génesis.", "Reset OK", "fa-rotate-left");
  }

  function loadTerminalCommand(cmdKey) {
    const cmd = terminalCommands[cmdKey];
    if (!cmd) return;

    const title = document.getElementById('terminal-session-title');
    if (title) title.innerText = cmd.title;
    const screen = document.getElementById('terminal-screen');
    if (!screen) return;
    screen.innerHTML = "";

    cmd.lines.forEach((line) => {
      const div = document.createElement('div');
      div.style.color = line.startsWith('$') ? "var(--accent-cyan)" : (line.includes('[PASS]') || line.includes('done') ? "#34d399" : "#cbd5e1");
      if (line.startsWith('$')) div.style.fontWeight = "bold";
      div.innerText = line;
      screen.appendChild(div);
    });
    openToast(`Comando '${cmdKey}' cargado en la consola interactiva.`, "Terminal Lista", "fa-terminal");
    if (window.GAMIFICATION) window.GAMIFICATION.addXP(25, `Inspección de herramienta de desarrollo: ${cmdKey}`);
  }

  function simulateDAppInteraction(type) {
    const statusEl = document.getElementById('dapp-mock-status');
    const descEl = document.getElementById('dapp-mock-desc');

    if (type === 'passkey') {
      if (statusEl) statusEl.innerText = "Verificando FaceID / Passkey...";
      if (descEl) descEl.innerText = "Computando firma de curva elíptica secp256r1 en enclave seguro...";
      setTimeout(() => {
        if (statusEl) statusEl.innerText = "¡Autenticado con FaceID!";
        if (descEl) descEl.innerText = "UserOp firmado. Paymaster ha cubierto la tarifa de gas.";
        openToast("Autenticación biométrica WebAuthn exitosa sin frases semilla.", "Passkey OK", "fa-fingerprint");
        if (window.GAMIFICATION) window.GAMIFICATION.addXP(45, "Firma WebAuthn con Passkeys (ERC-4337)");
      }, 700);
    } else if (type === 'nfc') {
      openToast("Etiqueta NFC leída: Firma dinámica SUN validada con la fábrica.", "NFC Auténtico", "fa-qrcode");
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(30, "Lectura de NFC NTAG 424 DNA con SUN");
    }
  }

  function simulateDatabaseSync(actionType) {
    currentBlockHeight++;
    const counter = document.getElementById('global-block-counter');
    if (counter) counter.innerText = `#${currentBlockHeight.toLocaleString('es-CO')}`;

    const liveView = document.getElementById('postgres-live-view');
    const latencyEl = document.getElementById('sql-latency-display');
    if (!liveView) return;

    const latency = (Math.random() * 1.2 + 0.4).toFixed(2);
    if (latencyEl) latencyEl.innerText = `Latencia: ${latency} ms`;

    if (actionType === 'vote') {
      const randomHex = "0x" + Math.random().toString(16).substring(2, 10) + "...";
      liveView.innerHTML = `
        <div style="color:#34d399; font-weight:bold;">[EVENT CAPTURED] VoteCast(nullifier: ${randomHex}, block: ${currentBlockHeight})</div>
        <div style="color:var(--accent-cyan);">> INSERT INTO electoral_nullifiers (nullifier_hash, block_number, candidate_id) VALUES ('${randomHex}', ${currentBlockHeight}, 1) ON CONFLICT DO NOTHING;</div>
        <div style="color:#fff; font-weight:bold; margin-top:4px;">> SELECT COUNT(*), candidate_id FROM electoral_nullifiers GROUP BY candidate_id;</div>
        <div style="color:#cbd5e1;">Candidato 1: 4 votos | Candidato 2: 2 votos (Query time: ${latency}ms)</div>
      `;
      openToast(`Evento VoteCast indizado en PostgreSQL en ${latency}ms`, "PostgreSQL Sync OK", "fa-database");
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(40, "Sincronización CQRS: Evento on-chain indexado a PostgreSQL");
    } else if (actionType === 'pharma') {
      liveView.innerHTML = `
        <div style="color:#fb7185; font-weight:bold;">[EVENT CAPTURED] ColdChainBreached(batch: 'LOT-7741', temp: 9.20 C)</div>
        <div style="color:var(--accent-cyan);">> INSERT INTO pharma_coldchain_telemetry (batch_id, recorded_temp_c, status, block_number) VALUES ('LOT-7741', 9.20, 'QUARANTINE', ${currentBlockHeight});</div>
        <div style="color:#f59e0b;">> UPDATE tokens_registry SET is_burned = TRUE WHERE token_id = 7741;</div>
        <div style="color:#fb7185; font-weight:bold;">> UPDATE 1 row in 0.91ms. Estado del lote bloqueado en la vista de la farmacia.</div>
      `;
      openToast("Telemetría crítica sincronizada: Lote puesto en cuarentena en PostgreSQL", "PostgreSQL Alerta", "fa-triangle-exclamation", true);
      if (window.GAMIFICATION) window.GAMIFICATION.addXP(45, "Alerta sanitaria reflejada en réplica de lectura PostgreSQL");
    }
  }

  function initMultiSim() {
    updateVoterCredentials();
    switchContractCode('pharma');
    setPipelineStep(1);
    loadTerminalCommand('foundry');
  }

  return {
    init: function() {
      renderChain();
      updateReentrancyBalances();
    },
    initMultiSim: initMultiSim,
    mineNewBlock: mineNewBlock,
    corruptBlock: corruptBlock,
    toggleCEIPattern: toggleCEIPattern,
    launchReentrancyExploit: launchReentrancyExploit,
    resetReentrancyLab: resetReentrancyLab,
    evaluateAgroBatch: evaluateAgroBatch,
    handleCliInput: handleCliInput,

    // Métodos del Ecosistema Multi-Industria
    switchMultiSimTab: switchMultiSimTab,
    updateVoterCredentials: updateVoterCredentials,
    generateZKProof: generateZKProof,
    castVote: castVote,
    renderElectoralResults: renderElectoralResults,
    setPipelineStep: setPipelineStep,
    nextPipelineStep: nextPipelineStep,
    prevPipelineStep: prevPipelineStep,
    loadPharmaBatchData: loadPharmaBatchData,
    handleTemperatureChange: handleTemperatureChange,
    commitPharmaTelemetry: commitPharmaTelemetry,
    loadHoneyPreset: loadHoneyPreset,
    evaluateHoneySmartContract: evaluateHoneySmartContract,
    runAuditorTest: runAuditorTest,
    generateAuditReport: generateAuditReport,
    switchContractCode: switchContractCode,
    runApprenticeContractTest: runApprenticeContractTest,
    resetApprenticeState: resetApprenticeState,
    loadTerminalCommand: loadTerminalCommand,
    simulateDAppInteraction: simulateDAppInteraction,
    simulateDatabaseSync: simulateDatabaseSync,
    openToast: openToast
  };
})();

