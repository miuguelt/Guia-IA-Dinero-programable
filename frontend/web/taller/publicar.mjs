// Anexo: publicar la guía y un servidor EVM propio con Foundry Anvil en un VPS con Coolify.
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
      - "\${ANVIL_CHAIN_ID:-31337}"
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
      - "traefik.http.middlewares.anvil-auth.basicauth.users=\${ANVIL_BASIC_AUTH}"
      - "traefik.http.services.anvil.loadbalancer.server.port=8545"
    networks:
      - coolify

volumes:
  anvil_data:
    driver: local

networks:
  coolify:
    external: true`;

const comandosLocal = `# 1. Define en tu sesión de PowerShell 7 la URL autenticada de tu VPS
$env:VPS_RPC_URL = "https://aprendiz:tu_token_seguro@rpc.tudominio.com"
$env:VPS_CHAIN_ID = "31337"

# 2. Comprueba que el nodo responde con el número de bloque actual
$body = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
Invoke-RestMethod -Uri $env:VPS_RPC_URL -Method Post -ContentType "application/json" -Body $body

# 3. Compila y despliega los contratos desde tu computador hacia el VPS
npm run compile
npx hardhat run scripts/deploy.js --network vps`;

const ejemploSincronizacion = `const { JsonRpcProvider, Contract } = require('ethers');
const { Pool } = require('pg');
const { resolveVpsConfig, syncVpsEvents } = require('./backend/chain/vps-sync.cjs');
const { createEventStore } = require('./backend/persistence/event-store.cjs');
const manifest = require('./artifacts/deployment.json');

async function sincronizarDesdeVps() {
  const config = resolveVpsConfig(process.env);
  const provider = new JsonRpcProvider(config.rpcUrl);
  const base = manifest.contracts.DineroProgramableBase;
  const contract = new Contract(base.address, base.abi, provider);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const store = createEventStore(pool);

  // Lee eventos del VPS y aplica INSERT ... ON CONFLICT DO NOTHING en PostgreSQL 18
  const resultado = await syncVpsEvents({
    provider,
    contract,
    store,
    deploymentId: config.deploymentId,
  });
  console.log('Eventos sincronizados:', resultado.indexed, 'desde bloque', resultado.fromBlock);
  await pool.end();
}`;

export const publicarView = () => `<section class="module-page" id="publicar" data-reader-page data-reader-kind="resources"><header class="page-heading"><p class="eyebrow">Anexo · Despliegue y Servidor EVM en Coolify</p><h1 tabindex="-1">Publica la guía en tu VPS</h1><p>Desarrolla y prueba en tu equipo con Node.js 24 y PostgreSQL 18 nativos. Usa Coolify en tu VPS para publicar la guía web y para instalar tu propio servidor EVM persistente con Foundry Anvil.</p></header>
  <article class="lesson-body surface">
    <h2>Qué se publica y cómo se reparte la arquitectura</h2>
    <p>Tu VPS con Coolify cumple dos propósitos independientes: publicar el portal de lectura de la guía (con <code>/docker-compose.yml</code>) y alojar un nodo EVM privado y persistente con <strong>Foundry Anvil</strong> (con <code>/docker-compose.anvil.yml</code>) protegido por credenciales para desplegar contratos y probar casos de uso reales desde tu computador local.</p>
    <div class="table-scroll"><table><caption>Dónde corre cada parte en la arquitectura híbrida</caption><thead><tr><th scope="col">Componente</th><th scope="col">En tu computador local</th><th scope="col">En tu VPS con Coolify</th></tr></thead><tbody>
      <tr><td>Guía web y Simulación</td><td><code>npm run build</code> y <code>pwsh ./start-windows.ps1</code></td><td>Contenedor <code>frontend</code> con Nginx (<code>/docker-compose.yml</code>)</td></tr>
      <tr><td>Servidor de contratos inteligentes (EVM)</td><td>Hardhat en memoria con <code>npm run etapa:N</code></td><td>Contenedor <code>anvil</code> con Foundry Anvil persistente (<code>/docker-compose.anvil.yml</code>)</td></tr>
      <tr><td>Despliegue, pruebas y proyección SQL</td><td>Hardhat (red <code>vps</code>), indexador y PostgreSQL 18 con <code>ON CONFLICT DO NOTHING</code></td><td>Recibe transacciones firmadas por HTTPS con Traefik Basic Auth</td></tr>
      <tr><td>Backend de laboratorios locales</td><td>API, firmas de práctica y herramientas en <code>127.0.0.1</code></td><td>No se publica sin autenticación para evitar ejecución remota no autorizada</td></tr>
    </tbody></table></div>

    <h2>1. Publicar el portal web de la guía (<code>/docker-compose.yml</code>)</h2>
    <ol>
      <li>Ejecuta las pruebas en tu equipo: <code>npm test</code> y <code>npm run test:taller</code>.</li>
      <li>Sube los cambios a la rama que usará Coolify (<code>main</code> o <code>master</code>). No necesitas instalar Docker en tu equipo: Coolify construye la imagen en el servidor.</li>
      <li>Crea en Coolify un recurso de tipo <strong>Docker Compose</strong>, conecta el repositorio y escribe <code>/docker-compose.yml</code> en <strong>Docker Compose Location</strong> (con la barra inicial).</li>
      <li>Asigna el dominio al servicio <code>frontend</code> y despliega. La portada mostrará «Lectura y simulación» y permitirá descargar <a href="descargas/taller-agropay.zip" download>descargas/taller-agropay.zip</a>.</li>
    </ol>

    <h2>2. Instalar el servidor de contratos inteligentes en Coolify (<code>/docker-compose.anvil.yml</code>)</h2>
    <p>Para contar con tu propia cadena de bloques activa las 24 horas sin pagar gas real y con menos de 50 MB de consumo de RAM en el VPS, el repositorio incluye la plantilla <code>/docker-compose.anvil.yml</code> basada en <strong>Foundry Anvil</strong>.</p>
    <h3>Paso a paso para configurar el servidor en Coolify</h3>
    <ol>
      <li><strong>Crea el servicio en Coolify:</strong> En tu proyecto de Coolify, agrega un nuevo recurso de tipo <strong>Docker Compose</strong> conectado a tu repositorio y define <strong>Docker Compose Location</strong> como <code>/docker-compose.anvil.yml</code>.</li>
      <li><strong>Configura el subdominio HTTPS:</strong> En la configuración del servicio <code>anvil</code> dentro de Coolify, asigna un subdominio dedicado (por ejemplo, <code>https://rpc.tudominio.com</code>). Traefik emitirá automáticamente el certificado TLS y enrutará hacia el puerto interno <code>8545</code> sin abrir puertos directos en el firewall del VPS.</li>
      <li><strong>Protege el nodo con Traefik Basic Auth:</strong> En la pestaña <strong>Environment Variables</strong> de Coolify, define la variable <code>ANVIL_BASIC_AUTH</code> con tu usuario y hash bcrypt (generado con <code>htpasswd -nb aprendiz tu_token_seguro</code>). Así bloqueas bots y escaneos públicos en internet.</li>
      <li><strong>Verifica la persistencia y salud:</strong> El volumen <code>anvil_data:/data</code> guarda el estado de cuentas, saldos y contratos en <code>/data/anvil-state.json</code> cada 10 segundos. El <code>healthcheck</code> integrado ejecuta <code>cast block-number</code> para confirmar que la EVM responde.</li>
    </ol>
    <pre><code>${escapeHtml(composeAnvil)}</code></pre>

    <h2>3. Conectar tu computador local al VPS, desplegar y hacer pruebas</h2>
    <p>El archivo <code>hardhat.config.js</code> de este proyecto ya incorpora la red <code>vps</code>, que toma la dirección de <code>VPS_RPC_URL</code>, el identificador de cadena de <code>VPS_CHAIN_ID</code> y la clave privada de <code>VPS_PRIVATE_KEY</code>.</p>
    <ol>
      <li><strong>Configura tu sesión local en PowerShell 7:</strong> Exporta la URL incluyendo tus credenciales de Basic Auth (<code>https://usuario:token@rpc.tudominio.com</code>) para que Hardhat, Ethers y tus scripts atraviesen el proxy de Traefik de forma transparente.</li>
      <li><strong>Comprueba la conexión RPC:</strong> Envía una consulta <code>eth_blockNumber</code> para verificar que el certificado HTTPS, el middleware de autenticación y Anvil responden en milisegundos.</li>
      <li><strong>Compila y despliega tus contratos en el VPS:</strong> Ejecuta el despliegue apuntando a <code>--network vps</code>.</li>
    </ol>
    <pre><code>${escapeHtml(comandosLocal)}</code></pre>
    <p>También puedes conectar <strong>MetaMask</strong> desde tu navegador agregando una red personalizada con tu URL RPC autenticada, el identificador de cadena <code>31337</code> y el símbolo <code>ETH</code>.</p>

    <h2>4. Cómo aprovechar casos de uso con Arquitectura Híbrida (VPS + PostgreSQL 18)</h2>
    <p>Con tu servidor EVM corriendo en el VPS y tu entorno de desarrollo en local, puedes construir soluciones completas donde la cadena garantiza reglas inmutables y <strong>PostgreSQL 18</strong> ofrece consultas rápidas para miles de usuarios:</p>
    <div class="table-scroll"><table><caption>Casos de uso prácticos con tu VPS y PostgreSQL 18</caption><thead><tr><th scope="col">Caso de uso</th><th scope="col">Qué ejecuta el contrato en el VPS (On-Chain)</th><th scope="col">Qué guarda y consulta PostgreSQL 18 (Off-Chain CQRS)</th></tr></thead><tbody>
      <tr><td><strong>Garantías y pagos agrícolas (AgroPay)</strong></td><td>Custodia el depósito en wei, verifica la firma del oráculo con nonce único y libera el retiro bajo el patrón CEI.</td><td>Indexa los eventos <code>PagoAutorizado</code> y <code>PagoRetirado</code> para mostrar historiales, filtros por productor y reportes contables en menos de 5 ms.</td></tr>
      <tr><td><strong>Trazabilidad de cadena de frío y calidad</strong></td><td>Registra dictámenes firmados de temperatura y acidez que ninguna de las partes puede borrar ni alterar retroactivamente.</td><td>Cruza los lotes certificados en la cadena con catálogos, rutas logísticas y tableros de control en SQL.</td></tr>
      <tr><td><strong>Entorno compartido para equipos ADSO</strong></td><td>Todos los integrantes del equipo interactúan contra los mismos contratos desplegados en el VPS sin gastar dinero real.</td><td>Cada aprendiz practica la sincronización idempotente en su base local o compartida usando <code>ON CONFLICT DO NOTHING</code>.</td></tr>
    </tbody></table></div>
    <h3>Ejemplo de sincronización desde el VPS hacia PostgreSQL 18</h3>
    <p>El módulo <code>backend/chain/vps-sync.cjs</code> valida la configuración del nodo remoto, oculta las credenciales en los registros, descarga los eventos emitidos por tus contratos en el VPS y los almacena sin duplicados en PostgreSQL 18:</p>
    <pre><code>${escapeHtml(ejemploSincronizacion)}</code></pre>

    <h2>Diagnóstico y solución de problemas con el VPS</h2>
    <div class="table-scroll"><table><caption>Errores frecuentes al conectar local con Coolify y cómo resolverlos</caption><thead><tr><th scope="col">Síntoma o código</th><th scope="col">Causa probable</th><th scope="col">Solución paso a paso</th></tr></thead><tbody>
      <tr><td><code>401 Unauthorized</code></td><td>Falta el usuario o token en <code>VPS_RPC_URL</code> o el hash en <code>ANVIL_BASIC_AUTH</code> no coincide.</td><td>Verifica el formato <code>https://usuario:token@rpc.tudominio.com</code> y regenera el hash bcrypt en Coolify.</td></tr>
      <tr><td><code>502 Bad Gateway</code></td><td>Traefik no alcanza el puerto interno del contenedor Anvil.</td><td>Confirma que el comando de Anvil incluya <code>--host 0.0.0.0 --port 8545</code> y que el contenedor esté en la red <code>coolify</code>.</td></tr>
      <tr><td><code>nonce has already been used</code></td><td>El estado del VPS se reinició o enviaste dos transacciones simultáneas con la misma cuenta.</td><td>Revisa que el volumen <code>anvil_data:/data</code> esté montado; en MetaMask usa la opción «Borrar datos de actividad» para sincronizar el nonce.</td></tr>
    </tbody></table></div>
    <p>Consulta la referencia detallada en el archivo <code>docs/GUIA_SERVIDOR_EVM_COOLIFY_Y_USO_LOCAL.md</code> incluido en el repositorio.</p>
  </article></section>`;
