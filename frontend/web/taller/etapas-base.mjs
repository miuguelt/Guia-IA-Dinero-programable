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
  evidenciaTexto: 'Esta etapa asegura tu base técnica. Conserva la salida de <code>npm run verificar</code>; te servirá para describir tu entorno en MG-A05.',
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
  conceptos: '<p><strong>¿Dónde se guardan los datos en esta etapa?</strong> En esta capa la lógica es <em>stateless</em> (sin estado persistente). No vive en una base de datos ni en la blockchain: es una función matemática pura que procesa una entrada y produce un dictamen determinista.</p><p>Antes de interactuar con la red, la regla de negocio debe aislarse de la infraestructura. La función <code>evaluarLectura()</code> recibe mediciones físicas (temperatura y acidez) y devuelve un dictamen <strong>explicable</strong>: un booleano <code>aprobada</code> y una lista de <code>motivos</code> en caso de rechazo. Separar el dictamen de la custodia de fondos evita gastar gas innecesario en la blockchain si la calidad del lote no es óptima.</p><p>Los límites del ejercicio son: temperatura máxima de 4 °C y acidez entre 14 y 18 grados Dornic. Son parámetros didácticos para ilustrar la preservación de la cadena de frío.</p>',
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
  evidenciaTexto: 'En tu portafolio MG-A02, explica cómo esta regla desacoplada separa la captura física de la decisión de pago. Describe un caso aprobado y uno rechazado con sus motivos técnicos.',
};
