// Anexo: publicar la red blockchain propia y la guía en un VPS con Coolify.
import { escapeHtml } from '../dom.mjs';

const composeAnvil = `services:
  anvil:
    image: ghcr.io/foundry-rs/foundry:latest
    entrypoint: ["anvil"]
    command:
      - "--host"
      - "0.0.0.0"
      - "--port"
      - "8545"
      - "--chain-id"
      - "\${ANVIL_CHAIN_ID:-31338}"
      - "--block-time"
      - "\${ANVIL_BLOCK_TIME:-2}"
      - "--state"
      - "/data/anvil-state.json"
      - "--state-interval"
      - "10"
    restart: unless-stopped
    expose:
      - "8545"
    volumes:
      - anvil_data:/data
    healthcheck:
      test: ["CMD-SHELL", "cast block-number --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=coolify"
      - "traefik.http.middlewares.anvil-auth.basicauth.users=\${ANVIL_BASIC_AUTH:?Define ANVIL_BASIC_AUTH}"
      - "traefik.http.routers.anvil-rpc.rule=Host(\`\${ANVIL_RPC_DOMAIN:?Define ANVIL_RPC_DOMAIN}\`)"
      - "traefik.http.routers.anvil-rpc.entrypoints=https"
      - "traefik.http.routers.anvil-rpc.tls=true"
      - "traefik.http.routers.anvil-rpc.tls.certresolver=letsencrypt"
      - "traefik.http.routers.anvil-rpc.middlewares=anvil-auth"
      - "traefik.http.routers.anvil-rpc.service=anvil"
      - "traefik.http.services.anvil.loadbalancer.server.port=8545"
    networks:
      - coolify

volumes:
  anvil_data:
    driver: local

networks:
  coolify:
    external: true`;

const contratoEjemplo = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title CertificadosInmutables - Registro infalsificable de acreditaciones y lotes
/// @notice Permite emitir y verificar certificados sin intermediarios ni cobro de gas.
contract CertificadosInmutables {
    struct Certificado {
        bytes32 hashDocumento; // Hash SHA-256 del diploma o lote
        address emisor;        // Cuenta institucional autorizada
        uint64 fechaEmision;   // Sello de tiempo del bloque (Unix)
        bool revocado;         // Estado de vigencia
    }

    address public immutable autoridad;
    mapping(bytes32 => Certificado) public certificados;

    event CertificadoEmitido(bytes32 indexed hashDocumento, address indexed emisor, uint64 fechaEmision);
    event CertificadoRevocado(bytes32 indexed hashDocumento, address indexed emisor);

    error NoAutorizado();
    error YaExiste();
    error NoExiste();

    modifier soloAutoridad() {
        if (msg.sender != autoridad) revert NoAutorizado();
        _;
    }

    constructor() {
        autoridad = msg.sender;
    }

    function emitirCertificado(bytes32 hashDoc) external soloAutoridad {
        if (certificados[hashDoc].emisor != address(0)) revert YaExiste();
        certificados[hashDoc] = Certificado(hashDoc, msg.sender, uint64(block.timestamp), false);
        emit CertificadoEmitido(hashDoc, msg.sender, uint64(block.timestamp));
    }

    function esValido(bytes32 hashDoc) external view returns (bool) {
        Certificado memory cert = certificados[hashDoc];
        return cert.emisor != address(0) && !cert.revocado;
    }
}`;

const comandosDespliegueVerificacion = `# 1. Configura en PowerShell 7 la URL HTTPS de tu nodo Anvil con credenciales de práctica
$env:VPS_RPC_URL = "https://aprendiz:tu_token_seguro@rpc.tudominio.com"
$env:VPS_CHAIN_ID = "31338"
$env:VPS_PRIVATE_KEY = Read-Host "Clave privada de práctica (administración)" -MaskInput
$env:VPS_ORACLE_PRIVATE_KEY = Read-Host "Clave privada de práctica (oráculo)" -MaskInput

# 2. Comprueba que hablas con el VPS: chainId 31338, cliente anvil y 401 sin credenciales
npm run red:verificar -- --red vps

# 3. Compila los contratos con Hardhat
npm run compile

# 4. Despliega en el VPS; el manifiesto queda en artifacts/deployment.vps.json
npx hardhat run scripts/deploy.js --network vps

# 5. Repite la verificación: ahora también confirma el código del contrato desplegado
npm run red:verificar -- --red vps

# 6. Realiza una llamada de consulta (view) al contrato desplegado
node -e "const {JsonRpcProvider,Contract}=require('ethers');const m=require('./artifacts/deployment.vps.json');const c=m.contracts.DineroProgramableBase;new Contract(c.address,c.abi,new JsonRpcProvider(process.env.VPS_RPC_URL)).administrador().then(console.log)"`;

const ejemploIntegracion = `const { JsonRpcProvider, Contract, Wallet } = require('ethers');
const { Pool } = require('pg');
const manifest = require('./artifacts/deployment.json');

async function registrarEnBlockchainYBaseDeDatos() {
  // 1. Conexión al nodo privado en el VPS con credenciales seguras
  const rpcUrl = process.env.VPS_RPC_URL || 'https://aprendiz:token@rpc.tudominio.com';
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(process.env.VPS_PRIVATE_KEY, provider);

  const info = manifest.contracts.CertificadosInmutables;
  const contrato = new Contract(info.address, info.abi, signer);

  // 2. Hash SHA-256 del diploma o lote generado por el sistema de gestión
  const hashDiploma = '0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';

  console.log('Emitiendo certificado en la red blockchain del VPS...');
  const tx = await contrato.emitirCertificado(hashDiploma);
  const recibo = await tx.wait();
  console.log('Transacción confirmada en bloque:', recibo.blockNumber);

  // 3. Proyección CQRS en PostgreSQL 18 para consultas en menos de 5 ms
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const query = \`
    INSERT INTO certificados_proyeccion (hash_documento, emisor, bloque, fecha_registro)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (hash_documento) DO NOTHING;
  \`;
  await pool.query(query, [hashDiploma, signer.address, recibo.blockNumber]);
  console.log('Certificado indexado en PostgreSQL con idempotencia (ON CONFLICT DO NOTHING).');
  await pool.end();
}`;

export const publicarView = () => `<section class="module-page" id="publicar" data-reader-page data-reader-kind="resources"><header class="page-heading"><p class="eyebrow">Anexo · Despliegue, Red Blockchain y Contratos en Coolify</p><h1 tabindex="-1">Publica la guía en tu VPS</h1><p>Desarrolla en tu equipo con Node.js 24 y PostgreSQL 18 nativos. Despliega tu propia red blockchain privada en tu VPS con Coolify para crear, verificar y conectar contratos inteligentes en sistemas reales sin gastar dinero.</p></header>
  <article class="lesson-body surface">
    <h2>Arquitectura de red propia y separación de responsabilidades</h2>
    <p>Los casos y archivos se prepararon para aprender y no contienen registros reales. Tu VPS con Coolify te permite dos funciones independientes: publicar la web interactiva de la guía (con <code>/docker-compose.yml</code>) y alojar tu propio servidor de red blockchain EVM persistente con <strong>Foundry Anvil</strong> (con <code>/docker-compose.anvil.yml</code>), protegido mediante <strong>Traefik Basic Auth</strong>. Así practicas el ciclo de vida completo de un contrato inteligente sin pagar tarifas de gas ni depender de dispensadores públicos.</p>
    <div class="table-scroll"><table><caption>Distribución de componentes en la arquitectura híbrida</caption><thead><tr><th scope="col">Componente</th><th scope="col">En tu computador local</th><th scope="col">En tu VPS con Coolify</th></tr></thead><tbody>
      <tr><td>Portal de la guía y simulador</td><td><code>npm run build</code> y <code>pwsh ./start-windows.ps1</code></td><td>Contenedor web Nginx (<code>/docker-compose.yml</code>)</td></tr>
      <tr><td>Red blockchain propia (EVM)</td><td>Hardhat en memoria para pruebas rápidas</td><td>Contenedor <code>anvil</code> con Foundry Anvil persistente (<code>/docker-compose.anvil.yml</code>)</td></tr>
      <tr><td>Creación, compilación y pruebas</td><td>Solidity 0.8.28, Hardhat, Slither y pruebas nativas</td><td>Recibe transacciones firmadas por HTTPS con Traefik Basic Auth</td></tr>
      <tr><td>Capa de lectura y auditoría</td><td>PostgreSQL 18 local con <code>ON CONFLICT DO NOTHING</code></td><td>Base de datos del proyecto o proyección CQRS dedicada</td></tr>
    </tbody></table></div>

    <h2>Paso 1. Crear y desplegar tu propia red blockchain en Coolify</h2>
    <p>Para tener tu red activa las 24 horas con un consumo menor a 50 MB de memoria RAM y sin costo alguno, el proyecto incluye la plantilla <code>/docker-compose.anvil.yml</code> basada en <strong>Foundry Anvil</strong>. No necesitas instalar Docker en tu equipo local: Coolify interpreta el archivo y construye el servicio en tu servidor.</p>
    <ol>
      <li><strong>Configura el subdominio DNS:</strong> En tu panel de dominio, crea un registro tipo A (por ejemplo <code>rpc.tudominio.com</code>) apuntando a la dirección IP pública de tu VPS.</li>
      <li><strong>Crea el servicio en Coolify:</strong> Agrega un recurso de tipo <strong>Docker Compose</strong> conectado al repositorio y especifica <code>/docker-compose.anvil.yml</code> en el campo <strong>Docker Compose Location</strong> (con la barra inicial obligatoria).</li>
      <li><strong>Define el dominio y protege con Traefik Basic Auth:</strong> Deja vacío el campo de dominio del servicio <code>anvil</code> en Coolify y escribe <code>rpc.tudominio.com</code> en la variable <code>ANVIL_RPC_DOMAIN</code>; así solo existe el enrutador <code>anvil-rpc</code>, que exige credenciales. Genera una credencial en tu terminal con <code>htpasswd -nbB aprendiz TuClaveSegura</code> y agrégala en las variables de entorno de Coolify bajo <code>ANVIL_BASIC_AUTH</code>.</li>
      <li><strong>Parámetros de red y persistencia:</strong> Define <code>ANVIL_CHAIN_ID=31338</code>, distinto del nodo local del aula, y <code>ANVIL_BLOCK_TIME=2</code> para que los bloques se generen cada 2 segundos simulando una red de producción. El volumen <code>anvil_data:/data</code> guarda el estado en <code>/data/anvil-state.json</code> cada 10 segundos para que las cuentas y contratos sobrevivan a cualquier reinicio.</li>
    </ol>
    <pre><code>${escapeHtml(composeAnvil)}</code></pre>

    <h2>Paso 2. Crear y compilar contratos inteligentes para casos reales</h2>
    <p>Un contrato inteligente en un entorno empresarial no requiere especular con criptomonedas: su valor radica en garantizar <strong>inmutabilidad, reglas estrictas de negocio y auditoría pública sin intermediarios</strong>. Un ejemplo claro es la emisión de certificados de calidad de lotes agrícolas o acreditaciones académicas, donde nadie (ni siquiera el administrador de la base de datos) puede alterar una fecha o falsificar una firma retroactivamente.</p>
    <p>A continuación se muestra el contrato <code>CertificadosInmutables.sol</code>, diseñado bajo las mejores prácticas de Solidity 0.8.28:</p>
    <pre><code>${escapeHtml(contratoEjemplo)}</code></pre>
    <p>Para compilar el contrato y verificar que no existan errores sintácticos ni advertencias de seguridad, ejecuta en la raíz del proyecto:</p>
    <pre><code>npm run compile</code></pre>

    <h2>Paso 3. Desplegar y verificar el contrato en el VPS con Hardhat y Cast</h2>
    <p>El archivo <code>hardhat.config.js</code> incluye la configuración para la red <code>vps</code>. Al desplegar en tu propio nodo privado, la <strong>verificación del contrato</strong> se realiza demostrando que el código en bytecode alojado en la dirección de la red corresponde exactamente al código fuente compilado y que su ABI responde correctamente.</p>
    <ol>
      <li><strong>Establece las credenciales en PowerShell 7:</strong> Incluye tu usuario y contraseña de Basic Auth en la variable de conexión para que las herramientas atraviesen el proxy Traefik sin fricción.</li>
      <li><strong>Verifica la red:</strong> Ejecuta <code>npm run red:verificar -- --red vps</code>. Debe mostrar chainId 31338, cliente <code>anvil</code>, bloques que avanzan y un 401 para peticiones sin credenciales.</li>
      <li><strong>Ejecuta el despliegue:</strong> Despliega apuntando a <code>--network vps</code>. El script escribe <code>artifacts/deployment.vps.json</code> y conserva el manifiesto del aula local.</li>
      <li><strong>Verifica el contrato:</strong> El verificador confirma que hay código en la dirección del manifiesto. Una llamada de solo lectura (<code>view</code>) a <code>administrador()</code> certifica la cuenta configurada al desplegar.</li>
    </ol>
    <pre><code>${escapeHtml(comandosDespliegueVerificacion)}</code></pre>

    <h2>Paso 4. Conectar la red blockchain a sistemas reales (Arquitectura Full-Stack)</h2>
    <p>En un sistema de producción, la red blockchain del VPS se complementa con tu aplicación web y tus bases de datos relacionales:</p>
    <ol>
      <li><strong>Backend (Escritura inmutable):</strong> Tu servicio backend en Node.js o Python recibe la solicitud del usuario, valida permisos internos y emite la transacción hacia la red del VPS con Ethers.js.</li>
      <li><strong>Base de datos (Lectura rápida CQRS):</strong> Cuando la transacción es confirmada, los eventos emitidos se indexan en <strong>PostgreSQL 18</strong> aplicando <code>ON CONFLICT DO NOTHING</code>. Esto permite que el sistema responda búsquedas, filtros y reportes en menos de 5 ms sin sobrecargar el nodo RPC.</li>
      <li><strong>Frontend y verificación con MetaMask:</strong> Los aprendices y usuarios finales pueden agregar la red del VPS a MetaMask configurando el RPC con Basic Auth (<code>https://aprendiz:token@rpc.tudominio.com</code>), el Chain ID <code>31338</code> y el símbolo <code>ETH</code>. Cualquier usuario puede validar la autenticidad de un documento con un solo clic.</li>
    </ol>
    <pre><code>${escapeHtml(ejemploIntegracion)}</code></pre>

    <h2>Publicar también el portal web de la guía (<code>/docker-compose.yml</code>)</h2>
    <p>Si deseas que tus compañeros o instructores consulten la web de la guía desde internet:</p>
    <ol>
      <li>Sube tus cambios a GitHub. No necesitas Docker en tu computador: Coolify se encarga de la compilación en el servidor.</li>
      <li>Crea otro recurso <strong>Docker Compose</strong> en Coolify indicando <code>/docker-compose.yml</code> como ubicación.</li>
      <li>Asigna el dominio principal al contenedor <code>frontend</code> y despliega. La web quedará accesible con modo claro, modo oscuro suave y descarga del paquete de inicio.</li>
    </ol>

    <h2>Diagnóstico y solución de problemas con el VPS</h2>
    <div class="table-scroll"><table><caption>Errores frecuentes al operar la red en Coolify y soluciones paso a paso</caption><thead><tr><th scope="col">Síntoma o mensaje</th><th scope="col">Causa probable</th><th scope="col">Solución paso a paso</th></tr></thead><tbody>
      <tr><td><code>401 Unauthorized</code></td><td>Faltan credenciales en <code>VPS_RPC_URL</code> o el hash de <code>ANVIL_BASIC_AUTH</code> no coincide.</td><td>Usa el formato <code>https://usuario:token@rpc.tudominio.com</code> y regenera la contraseña con <code>htpasswd -nbB</code>.</td></tr>
      <tr><td><code>502 Bad Gateway</code></td><td>Traefik no alcanza el puerto 8545 del contenedor Anvil.</td><td>Comprueba que el servicio esté en la red <code>coolify</code> y que el comando incluya <code>--host 0.0.0.0 --port 8545</code>.</td></tr>
      <tr><td><code>nonce has already been used</code></td><td>MetaMask guardó un nonce desfasado o se reinició el contenedor sin volumen.</td><td>En MetaMask entra a <em>Configuración &gt; Avanzado &gt; Borrar datos de actividad</em>. En Coolify confirma que <code>anvil_data:/data</code> esté montado.</td></tr>
      <tr><td><code>insufficient funds for gas</code></td><td>La cuenta seleccionada no dispone de ether de práctica en el nodo Anvil.</td><td>Las 10 primeras cuentas generadas por Anvil cuentan con 10.000 ETH de práctica cada una. Usa una de esas claves para tus pruebas.</td></tr>
    </tbody></table></div>
    <p>Para profundizar en los comandos avanzados y la sincronización híbrida, revisa la documentación técnica en <code>docs/GUIA_SERVIDOR_EVM_COOLIFY_Y_USO_LOCAL.md</code>.</p>
  </article></section>`;
