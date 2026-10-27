// Etapas 0 y 1 del taller: preparar el proyecto y analizar reglas puras en JavaScript.
// Las salidas esperadas se copiaron de ejecuciones reales del taller.
export const etapa0 = {
  numero: 0,
  titulo: 'Prepara el proyecto',
  modulo: 'm1',
  minutos: 30,
  labs: ['pc'],
  evidencia: null,
  objetivo: 'Descargar el taller completo en tu equipo y comprobar que compila y ejecuta pruebas exitosamente.',
  lenguajes: 'PowerShell solo para ejecutar comandos',
  archivos: [
    ['package.json', 'Lista de dependencias y scripts de prueba e inspección.'],
    ['hardhat.config.js', 'Configura el compilador Solidity 0.8.24 y la red local 31337.'],
    ['contracts/', 'Contrato GarantiaAgroPay.sol y contratos de simulación de atacantes.'],
    ['src/', 'Lógica JavaScript: reglas puras, oráculo firmado, indexador y recorrido.'],
    ['scripts/', 'Herramientas de demostración, inspección de 3 capas y experimentos de seguridad.'],
    ['test/', 'Suites de pruebas automatizadas que verifican cada comportamiento observable.'],
    ['sql/', 'Script DDL de la tabla en PostgreSQL con deduplicación por clave única.'],
  ],
  conceptos: '<p>Un proyecto de Hardhat reúne contratos, pruebas y scripts. <strong>Hardhat</strong> compila Solidity, crea una red local en memoria con cuentas de práctica y ejecuta pruebas con Mocha y Chai. <strong>ethers</strong> es la biblioteca de JavaScript que conversa con esa red.</p><p>No tienes que programar el proyecto desde cero: el paquete del taller ya viene completamente construido y funcional con el 100 % de funciones probadas. Así te concentras en analizar la arquitectura, inspeccionar el almacenamiento y comprender cómo esta nueva capa asegura la verdad de la información.</p>',
  pasos: [
    'Completa la sección <a href="#preparar">Prepara tu equipo</a>: necesitas Node.js 24 o superior y VS Code.',
    'Descarga el <a href="descargas/taller-agropay.zip" download>paquete del taller completo (ZIP)</a> y guárdalo en tu carpeta de Descargas.',
    'Abre PowerShell y extrae el paquete en Documentos con el primer bloque de comandos. Se crea la carpeta <code>agropay-taller</code>.',
    'Instala las dependencias con <code>npm install</code>. Tarda unos minutos la primera vez y necesita internet.',
    'Abre la carpeta en VS Code con <code>code .</code> y revisa la estructura de archivos descrita arriba.',
    'Ejecuta la comprobación del entorno y la etapa 0. Las dos terminarán en verde demostrando que el entorno está listo.',
  ],
  codigo: [
    { titulo: 'Extraer e instalar (PowerShell)', texto: 'Expand-Archive "$HOME\\Downloads\\taller-agropay.zip" "$HOME\\Documents"\ncd "$HOME\\Documents\\agropay-taller"\nnpm install\ncode .' },
  ],
  desdeCero: '<p>Si quieres saber cómo se creó la estructura inicial, estos son los pasos equivalentes que se ejecutaron al inicio del proyecto. No los ejecutes en la carpeta del taller.</p><pre><code>mkdir mi-proyecto; cd mi-proyecto\nnpm init -y\nnpm install --save-dev hardhat@2.29.1 @nomicfoundation/hardhat-toolbox@5.0.0 solc@0.8.24\nnpx hardhat init</code></pre><p><code>npm init</code> crea <code>package.json</code>; <code>npm install</code> descarga las bibliotecas en <code>node_modules</code>; <code>npx hardhat init</code> genera las carpetas <code>contracts</code>, <code>test</code> y el archivo de configuración.</p>',
  comprobar: {
    comando: 'npm run verificar\nnpm run etapa:0',
    antes: null,
    despues: 'OK    Node.js 24 o superior (v24.22.1)\nOK    Paquete hardhat (instalado)\nOK    Paquete ethers (instalado)\nOK    Paquete solc (instalado)\nEntorno listo. Continúa con la etapa 1.\n\nCompiled 3 Solidity files successfully (evm target: paris).\n\n  Etapa 0 · Entorno\n    √ acepta Node.js 24 y los paquetes instalados\n    √ señala una versión antigua de Node.js y un paquete faltante\n    √ el equipo actual cumple los requisitos\n    √ informa el resultado y fija el código de salida\n\n  4 passing',
  },
  notas: '<p>Al instalar, npm puede informar avisos en dependencias de desarrollo de Hardhat 2. No afectan la práctica local. <strong>No ejecutes <code>npm audit fix --force</code>:</strong> cambia versiones y desconfigura el taller.</p>',
  siFalla: [
    ['«node» no se reconoce como comando', 'Cierra y abre PowerShell después de instalar Node.js. Si persiste, reinstala con winget.'],
    ['«La ejecución de scripts está deshabilitada en este sistema»', 'Ejecuta una vez <code>Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned</code> o usa <code>npm.cmd</code> en lugar de <code>npm</code>.'],
    ['FALTA Paquete hardhat', 'No estás en la carpeta del taller o falta <code>npm install</code>. Ejecuta <code>cd "$HOME\\Documents\\agropay-taller"</code> y repite.'],
    ['npm ERR! network o ETIMEDOUT', 'Revisa la conexión. En una red con proxy, pide la dirección al instructor y configúrala con <code>npm config set proxy</code>.'],
  ],
  evidenciaTexto: 'Esta etapa asegura tu base técnica. Conserva la salida de <code>npm run verificar</code>: te servirá en el bloque 3 · Tu proyecto de MG-A05, cuando describas cómo reproducir tu entrega.',
};

export const etapa1 = {
  numero: 1,
  titulo: 'Reglas de negocio puras en JavaScript',
  modulo: 'm2',
  minutos: 45,
  labs: ['myths', 'pharma'],
  evidencia: 'MG-A02',
  objetivo: 'Inspeccionar la regla que decide si una lectura de leche cumple el ejercicio y analizar cómo genera un dictamen explicable.',
  lenguajes: 'JavaScript',
  archivos: [
    ['src/reglas.js', 'Inspecciona la función pura evaluarLectura() y el objeto congelado LIMITES.'],
    ['test/etapa-1.reglas.test.js', 'Revisa las 6 pruebas que validan los límites y los tipos de error.'],
    ['test/mis-pruebas.test.js', 'Observa cómo se prueban los casos de frontera como temperaturas bajo cero.'],
  ],
  conceptos: `<p><strong>¿Dónde se guardan los datos en esta etapa?</strong> En esta capa la lógica es <em>stateless</em> (sin estado persistente). No vive en una base de datos ni en la blockchain: es una función matemática pura que procesa una entrada y produce un dictamen determinista.</p>
<div class="insight"><strong>Analogía del mundo real: El filtro de recepción en el centro de acopio</strong><p>Cuando un camión cisterna con leche fresca llega a una cooperativa agropecuaria, el operario de recibo no emite de inmediato la orden de pago bancario ni registra la compra definitiva en el sistema financiero. Primero, con el vehículo detenido en la bahía de recepción, toma una muestra directa y mide dos variables críticas: temperatura y acidez.</p><p>Si la leche perdió frío (> 4 °C) o la acidez está fuera del rango normal (14 a 18 °Dornic por proliferación bacteriana), el lote se rechaza en la puerta. No se emite cheque, no se procesa la leche y no se compromete dinero.</p><p>En el software, la función <code>evaluarLectura()</code> cumple exactamente ese papel: se ejecuta en JavaScript puro fuera de la cadena (<em>Off-chain</em>), tarda menos de 1 milisegundo y tiene <strong>costo cero en gas ($0)</strong>. Si el lote no satisface los estándares, el proceso se aborta de inmediato con una explicación clara y jamás llega a la blockchain, evitando saturar la red con transacciones destinadas al fracaso.</p></div>

<div class="hero-diagram" aria-label="Diagrama del pipeline de evaluación en JavaScript puro y dictamen explicable">
  <div class="diagram-label">PIPELINE DE EVALUACIÓN OFF-CHAIN · DESACOPLAMIENTO Y DICTAMEN EXPLICABLE</div>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 330" width="100%" height="auto" role="img" aria-label="Diagrama del pipeline de evaluación en JavaScript puro y dictamen explicable" style="max-width:840px;height:auto;display:block;margin:1rem auto;border-radius:12px;background:#0f172a;border:1px solid #334155;">
    <defs>
      <linearGradient id="gradPura" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="gradAprobado" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <linearGradient id="gradRechazado" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7f1d1d"/>
        <stop offset="100%" stop-color="#450a0a"/>
      </linearGradient>
    </defs>
    <!-- Paso 1: Entrada Física -->
    <g transform="translate(24, 40)">
      <rect width="210" height="190" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="1.8"/>
      <rect x="14" y="14" width="48" height="24" rx="5" fill="#38bdf8" fill-opacity="0.2"/>
      <text x="38" y="30" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">PASO 1</text>
      <text x="70" y="30" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">Muestra física</text>
      <text x="14" y="60" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Sensor o inspección en lote</text>
      <rect x="14" y="74" width="182" height="96" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1"/>
      <text x="24" y="98" fill="#38bdf8" font-family="monospace" font-size="11">{</text>
      <text x="36" y="120" fill="#f8fafc" font-family="monospace" font-size="11">temperatura: 3.5,</text>
      <text x="36" y="142" fill="#f8fafc" font-family="monospace" font-size="11">acidez: 16</text>
      <text x="24" y="160" fill="#38bdf8" font-family="monospace" font-size="11">}</text>
    </g>

    <!-- Conector 1 a 2 -->
    <path d="M 236 135 L 276 135" stroke="#38bdf8" stroke-width="2.5"/>
    <polygon points="274,130 284,135 274,140" fill="#38bdf8"/>

    <!-- Paso 2: Regla pura JS -->
    <g transform="translate(286, 40)">
      <rect width="260" height="190" rx="10" fill="url(#gradPura)" stroke="#10b981" stroke-width="1.8"/>
      <rect x="14" y="14" width="48" height="24" rx="5" fill="#10b981" fill-opacity="0.2"/>
      <text x="38" y="30" text-anchor="middle" fill="#10b981" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">PASO 2</text>
      <text x="70" y="30" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">evaluarLectura()</text>
      <text x="14" y="58" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="10" font-weight="600">JavaScript puro · Off-Chain · $0 Gas</text>
      <!-- Sub-reglas -->
      <rect x="14" y="74" width="232" height="44" rx="6" fill="#0f172a" stroke="#334155"/>
      <text x="24" y="94" fill="#67e8f9" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">Regla 1 · Cadena de frío:</text>
      <text x="24" y="110" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="10">temperatura ≤ 4 °C</text>

      <rect x="14" y="126" width="232" height="44" rx="6" fill="#0f172a" stroke="#334155"/>
      <text x="24" y="146" fill="#67e8f9" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">Regla 2 · Acidez química:</text>
      <text x="24" y="162" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="10">14 ≤ acidez ≤ 18 °Dornic</text>
      <text x="14" y="185" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="9">Función sin efectos colaterales (stateless)</text>
    </g>

    <!-- Bifurcaciones hacia resultados -->
    <!-- Flecha a Aprobado -->
    <path d="M 548 100 L 590 75" stroke="#10b981" stroke-width="2.5"/>
    <polygon points="585,69 598,70 591,80" fill="#10b981"/>

    <!-- Flecha a Rechazado -->
    <path d="M 548 170 L 590 195" stroke="#ef4444" stroke-width="2.5"/>
    <polygon points="591,190 598,200 585,201" fill="#ef4444"/>

    <!-- Paso 3A: Dictamen Aprobado -->
    <g transform="translate(600, 25)">
      <rect width="216" height="100" rx="9" fill="url(#gradAprobado)" stroke="#10b981" stroke-width="1.8"/>
      <text x="16" y="28" fill="#34d399" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">✓ APROBADO (Cumple)</text>
      <text x="16" y="48" fill="#e2e8f0" font-family="monospace" font-size="10">{ aprobada: true, motivos: [] }</text>
      <line x1="16" y1="58" x2="200" y2="58" stroke="#047857" stroke-width="1"/>
      <text x="16" y="74" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="10" font-weight="600">→ Habilita firma del Oráculo</text>
      <text x="16" y="88" fill="#6ee7b7" font-family="system-ui, sans-serif" font-size="9">Autoriza pago en GarantiaAgroPay</text>
    </g>

    <!-- Paso 3B: Dictamen Rechazado -->
    <g transform="translate(600, 145)">
      <rect width="216" height="100" rx="9" fill="url(#gradRechazado)" stroke="#ef4444" stroke-width="1.8"/>
      <text x="16" y="28" fill="#f87171" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">✕ RECHAZADO (Explicable)</text>
      <text x="16" y="48" fill="#fecaca" font-family="monospace" font-size="9.5">{ aprobada: false, motivos: [...] }</text>
      <line x1="16" y1="58" x2="200" y2="58" stroke="#991b1b" stroke-width="1"/>
      <text x="16" y="74" fill="#fca5a5" font-family="system-ui, sans-serif" font-size="10" font-weight="600">→ Se aborta en recepción</text>
      <text x="16" y="88" fill="#f87171" font-family="system-ui, sans-serif" font-size="9">Ahorro del 100 % de gas · Sin transacción</text>
    </g>

    <!-- Barra inferior resumen invariante -->
    <rect x="24" y="250" width="792" height="60" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1"/>
    <text x="44" y="274" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold">Invariante de persistencia y economía de gas:</text>
    <text x="44" y="295" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="11">La regla se evalúa sin estado en JavaScript. Si la calidad falla, se entrega una lista de motivos explicables y nunca se envía una transacción a la red.</text>
  </svg>
  <p>El diagrama ilustra cómo la regla pura filtra las mediciones físicas antes de cualquier interacción criptográfica con la blockchain.</p>
</div>

<h3>Límites de calidad verificados en el ejercicio</h3>
<div class="table-scroll"><table><caption>Parámetros de calidad en la Etapa 1</caption><thead><tr><th scope="col">Parámetro</th><th scope="col">Rango aceptado</th><th scope="col">Causa de rechazo</th><th scope="col">Impacto pedagógico</th></tr></thead><tbody>
<tr><td><strong>Temperatura</strong></td><td>≤ 4,0 °C</td><td>&gt; 4,0 °C</td><td>Demuestra el límite superior de la cadena de frío para evitar proliferación microbiana.</td></tr>
<tr><td><strong>Acidez química</strong></td><td>14,0 a 18,0 °Dornic</td><td>&lt; 14,0 °D o &gt; 18,0 °D</td><td>Demuestra una ventana con límite inferior y superior (leche aguada o leche fermentada).</td></tr>
<tr><td><strong>Tipo de dato</strong></td><td>Número finito estricto</td><td>NaN, cadenas, objetos o nulos</td><td>Garantiza robustez mediante <code>comprobarNumero()</code> antes de operar.</td></tr>
</tbody></table></div>

<h3>¿Por qué un dictamen explicable y no solo true o false?</h3>
<p>Un sistema profesional no se limita a responder «aprobado» o «rechazado». Si la leche de un productor no cumple, el software debe emitir las causas exactas (por ejemplo: <em>«Temperatura 9 °C supera el máximo de 4 °C»</em>) para que el operario y el proveedor sepan qué corregir. Además, la función acumula <strong>todos</strong> los motivos que fallen simultáneamente en un arreglo, permitiendo auditorías claras y sin ambigüedades.</p>`,
  pasos: [
    'Abre <code>src/reglas.js</code> en VS Code e inspecciona cómo la función valida que las entradas sean números finitos y acumula motivos de rechazo.',
    'Abre <code>test/etapa-1.reglas.test.js</code> y lee cada aserción para entender cómo se prueban los límites exactos y los tipos de excepción (<code>TypeError</code>).',
    'Abre <code>test/mis-pruebas.test.js</code> y analiza cómo se evalúan valores de frontera como temperaturas de refrigeración bajo cero (-1.5 °C).',
    'Ejecuta <code>npm run etapa:1</code> en PowerShell: verás pasar las seis pruebas de inmediato confirmando el comportamiento esperado.',
    'Ejecuta <code>npm run mis-pruebas</code> para comprobar que los casos de frontera analizados también pasan sin errores.',
  ],
  codigo: [
    { titulo: 'Lógica pura y dictamen explicable (src/reglas.js)', texto: "const motivos = [];\nif (lectura.temperatura > LIMITES.temperaturaMaxima) {\n  motivos.push(`Temperatura ${lectura.temperatura} °C supera el máximo de ${LIMITES.temperaturaMaxima} °C.`);\n}\nif (lectura.acidez < LIMITES.acidezMinima || lectura.acidez > LIMITES.acidezMaxima) {\n  motivos.push(`Acidez ${lectura.acidez} fuera del rango ${LIMITES.acidezMinima}–${LIMITES.acidezMaxima}.`);\n}\nreturn { aprobada: motivos.length === 0, motivos };" },
  ],
  comprobar: {
    comando: 'npm run etapa:1',
    antes: null,
    despues: '  Etapa 1 · Reglas en JavaScript\n    √ aprueba una lectura dentro de los límites del ejercicio\n    √ acepta los valores exactos de los límites\n    √ rechaza una temperatura alta y explica el motivo\n    √ rechaza una acidez fuera de rango por debajo y por encima\n    √ acumula todos los motivos cuando fallan ambas reglas\n    √ rechaza entradas que no son lecturas válidas\n\n  6 passing',
  },
  siFalla: [
    ['expected … to deeply equal …', 'Verifica que no se hayan modificado los textos en <code>src/reglas.js</code>; el mensaje de error está normalizado con tildes y guiones.'],
    ['TypeError: comprobarNumero is not a function', 'Confirma que las funciones auxiliares se conserven intactas en <code>src/reglas.js</code>.'],
  ],
  evidenciaTexto: 'Copia un dictamen aprobado y uno rechazado de <code>npm run etapa:1</code> en el bloque 1 · Observa de MG-A02. En el bloque 2, explica cómo esta regla separa la captura física de la decisión de pago.',
};
