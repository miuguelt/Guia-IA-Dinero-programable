// Página «Prepara tu equipo»: instalación en dos niveles, lenguajes, glosario y problemas frecuentes.
const fila = celdas => `<tr>${celdas.map(celda => `<td>${celda}</td>`).join('')}</tr>`;
const tabla = (caption, encabezados, filas) => `<div class="table-scroll"><table><caption>${caption}</caption><thead><tr>${encabezados.map(e => `<th scope="col">${e}</th>`).join('')}</tr></thead><tbody>${filas.map(fila).join('')}</tbody></table></div>`;

export const lenguajes = [
  ['<strong>JavaScript</strong> (principal)', 'Reglas, pruebas, oráculo, indexador, scripts de inspección y experimentos.', 'No programas desde cero; inspeccionas su lógica y ejecutas sus pruebas y comandos.'],
  ['<strong>Solidity</strong>', 'Contrato de garantía <code>GarantiaAgroPay.sol</code>.', 'Viene completamente construido; analizas cómo la EVM gestiona el storage y los permisos.'],
  ['<strong>SQL</strong>', 'Tabla de proyección e inserción sin duplicados (PostgreSQL).', 'Viene resuelta; comprendes el patrón CQRS y la idempotencia con <code>ON CONFLICT DO NOTHING</code>.'],
  ['PowerShell', 'Ejecutar comandos del taller, pruebas e inspección.', 'No escribes scripts; ejecutas los comandos guiados.'],
  ['Python', 'Lo usa Slither por dentro en el laboratorio Auditoría.', 'No. Es opcional y se instala con <code>uv</code>.'],
  ['Semaphore y WebAuthn', 'Laboratorios de elecciones y de claves de acceso.', 'No se programan; se usan para entender qué demuestran.'],
];

const equivalencias = [
  ['<code>class Garantia { }</code>', '<code>contract GarantiaAgroPay { }</code>', 'Agrupa estado y funciones; se despliega en una dirección.'],
  ['<code>this.total = 0</code>', '<code>uint256 public garantiaDisponible;</code>', 'Variable de estado que persiste en la red. <code>public</code> crea un método de lectura.'],
  ['<code>new Map()</code>', '<code>mapping(address =&gt; uint256)</code>', 'Diccionario; una clave inexistente devuelve 0.'],
  ['<code>throw new Error()</code>', '<code>revert MontoInvalido();</code>', 'Cancela la transacción y deshace todos sus cambios.'],
  ['<code>emitter.emit(\'x\')</code>', '<code>emit GarantiaDepositada(...)</code>', 'Publica un evento que leen las aplicaciones y el indexador.'],
  ['quien hace la petición', '<code>msg.sender</code>', 'Cuenta que llama la función; base de los permisos.'],
  ['monto recibido', '<code>msg.value</code>', 'Dinero enviado con la llamada, en wei. Requiere <code>payable</code>.'],
  ['<code>Number</code> / <code>BigInt</code>', '<code>uint256</code>', 'Entero sin signo de 256 bits. En JavaScript usa <code>BigInt</code> o texto.'],
];

const glosario = [
  ['Cuenta y dirección', 'Identidad en la red (<code>0x</code> y 40 caracteres hexadecimales). La red local de Hardhat crea cuentas de práctica.'],
  ['Wei', 'Unidad mínima: 1 ETH = 10<sup>18</sup> wei. Los montos de práctica no tienen valor monetario.'],
  ['Transacción y recibo', 'Una transacción cambia el estado; el recibo confirma que se incluyó en un bloque y registra sus eventos.'],
  ['Evento', 'Registro que emite un contrato. No cambia el estado; sirve para consultar e indexar.'],
  ['Oráculo', 'Servicio que lleva datos externos al contrato. En este taller, una cuenta autorizada que firma lecturas.'],
  ['Firma y nonce', 'La firma identifica a quien firmó y detecta cambios; el nonce impide reutilizar la misma lectura.'],
  ['Reentrada', 'Ataque en el que un contrato vuelve a llamar a otro antes de que este actualice su estado.'],
  ['Proyección', 'Copia de los eventos en una base de datos para consultarlos con rapidez. Se puede reconstruir.'],
];

const problemas = [
  ['«node» o «npm» no se reconoce', 'Cierra y abre la terminal después de instalar. Si continúa, reinstala Node.js con winget.'],
  ['«La ejecución de scripts está deshabilitada»', 'Ejecuta una vez <code>Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned</code> o usa <code>npm.cmd</code>.'],
  ['<code>npm install</code> informa vulnerabilidades', 'Son avisos de dependencias de desarrollo de Hardhat 2. No ejecutes <code>npm audit fix --force</code>: rompe las versiones del taller.'],
  ['npm ERR! network o ETIMEDOUT', 'Revisa la conexión. Si tu red usa proxy, pide la dirección al instructor y configúrala con <code>npm config set proxy</code>.'],
  ['ECONNREFUSED 127.0.0.1:5432', 'PostgreSQL no está iniciado o usa otro puerto. Revisa el servicio <code>postgresql-x64-18</code> en Servicios de Windows.'],
  ['password authentication failed', 'El usuario o la clave no coinciden. Vuelve a escribirlos; la clave no se guarda en ningún archivo.'],
];

export const prepararView = () => `<section class="module-page" id="preparar" data-reader-page data-reader-kind="orientation"><header class="page-heading"><p class="eyebrow">Antes de comenzar · Instalación y conceptos</p><h1 tabindex="-1">Prepara tu equipo</h1><p>Instala lo necesario en Windows, comprueba cada herramienta y comprende la arquitectura y el nuevo paradigma. No necesitas escribir código: el taller viene completamente construido para que inspecciones, pruebes y comprendas dónde se guardan los datos.</p></header>
  <article class="lesson-body surface">
    <h2>Dos niveles de instalación</h2>
    ${tabla('Qué permite cada nivel', ['Nivel', 'Instalas', 'Te permite'], [
      ['<strong>Mínimo</strong>', 'Node.js 24, VS Code y PowerShell 7. Git es opcional.', 'Leer la guía, usar los laboratorios en Simulación y ejecutar las siete etapas del taller con experimentos y proyecciones en memoria.'],
      ['<strong>Completo</strong>', 'Lo anterior, PostgreSQL 18 y, si lo pide tu instructor, uv con Slither.', 'Probar la etapa 5 con PostgreSQL nativo y ejecutar los laboratorios en modalidad Real local.'],
    ])}
    <h2>Nivel mínimo</h2>
    <h3>1. Instala las herramientas</h3>
    <p>Abre PowerShell y ejecuta estos comandos uno por uno. Cada instalador puede pedirte permiso de administrador.</p>
    <pre><code>winget install --id OpenJS.NodeJS.LTS -e\nwinget install --id Microsoft.VisualStudioCode -e\nwinget install --id Microsoft.PowerShell -e\nwinget install --id Git.Git -e</code></pre>
    <p>Cierra la terminal, abre <strong>PowerShell 7</strong> (aparece como «PowerShell» en el menú Inicio) e instala la extensión de Solidity para VS Code:</p>
    <pre><code>code --install-extension NomicFoundation.hardhat-solidity</code></pre>
    <h3>2. Comprueba las versiones</h3>
    <pre><code>node --version\nnpm --version\n$PSVersionTable.PSVersion</code></pre>
    <p>Debes ver <code>v24</code> o una versión mayor de Node.js, un número de versión de npm y PowerShell <code>7</code> o superior. Los números exactos pueden variar.</p>
    <h3>3. Descarga el taller</h3>
    <p>Descarga el <a href="descargas/taller-agropay.zip" download>paquete del taller (ZIP)</a> y sigue la <a href="#taller/0">etapa 0</a>. Viene completamente implementado para que lo extraigas, instales sus dependencias y ejecutes sus etapas y experimentos.</p>
    <h2>Nivel completo</h2>
    <h3>4. Instala PostgreSQL 18</h3>
    <pre><code>winget install --id PostgreSQL.PostgreSQL.18 -e</code></pre>
    <p>Durante la instalación, define la clave del usuario <code>postgres</code> y conserva el puerto 5432 o 5434. Guárdala en un lugar seguro; no la escribas en archivos del proyecto.</p>
    <h3>5. Crea la base del taller</h3>
    <p>Abre <code>psql</code> con el usuario administrador y crea un usuario propio para el taller. El comando <code>\\password</code> pide la clave sin mostrarla ni guardarla en el historial.</p>
    <pre><code>psql -U postgres -h 127.0.0.1\nCREATE ROLE agropay_taller LOGIN;\n\\password agropay_taller\nCREATE DATABASE agropay_taller OWNER agropay_taller;\n\\q</code></pre>
    <p>Si <code>psql</code> no se reconoce, agrégalo a la sesión con <code>$env:Path += ";C:\\Program Files\\PostgreSQL\\18\\bin"</code>. La etapa 5 explica cómo conectar el taller sin guardar la clave.</p>
    <h3>6. Laboratorios en modalidad Real local</h3>
    <p>Desde la carpeta de la guía, prepara su base una sola vez. El script te pide el servidor, el puerto, el usuario y la clave de PostgreSQL; guarda las credenciales en el Administrador de credenciales de Windows y no las muestra.</p>
    <pre><code>npm ci\npwsh ./start-windows.ps1 -InitializeDatabase</code></pre>
    <p>En los siguientes usos basta con <code>pwsh ./start-windows.ps1</code>. Abre <a href="http://localhost:8153/">http://localhost:8153/</a>. Para el laboratorio Auditoría instala también Slither:</p>
    <pre><code>winget install --id astral-sh.uv -e\nuv tool install slither-analyzer==0.11.6</code></pre>
    <h2 id="lenguajes">Lenguajes y roles en el taller</h2>
    <p>El código está completamente construido para que te concentres en comprender la arquitectura y no en escribir sintaxis desde cero.</p>
    ${tabla('Qué lenguaje ves y cómo lo utilizas', ['Lenguaje', 'Dónde aparece', 'Tu rol como aprendiz'], lenguajes)}
    <h3>JavaScript y Solidity</h3>
    <p>Si sabes programación orientada a objetos, ya conoces la mayoría de las ideas de Solidity. Esta tabla relaciona cada concepto con su equivalente.</p>
    ${tabla('Equivalencias entre JavaScript y Solidity', ['JavaScript', 'Solidity', 'Qué significa'], equivalencias)}
    <h3>SQL en la arquitectura Web3</h3>
    <p>En la etapa 5 inspeccionas una tabla con una restricción <code>UNIQUE</code> que inserta filas ignorando duplicados para garantizar idempotencia:</p>
    <pre><code>CREATE TABLE IF NOT EXISTS ejemplo (\n  id BIGSERIAL PRIMARY KEY,\n  codigo TEXT NOT NULL,\n  UNIQUE (codigo)\n);\nINSERT INTO ejemplo (codigo) VALUES ($1)\nON CONFLICT (codigo) DO NOTHING;</code></pre>
    <h2>Glosario de conceptos clave</h2>
    ${tabla('Términos esenciales del nuevo paradigma', ['Término', 'Significado'], glosario)}
    <h2>Si algo falla</h2>
    ${tabla('Problemas frecuentes y cómo resolverlos', ['Mensaje o síntoma', 'Qué hacer'], problemas)}
    <div class="actions"><a class="button primary" href="#taller/0">Empezar el taller</a><a class="button secondary" href="#taller">Ver las siete etapas</a></div>
  </article></section>`;
