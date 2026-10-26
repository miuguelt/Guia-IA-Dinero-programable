# Servidor EVM propio en Coolify y desarrollo híbrido desde tu equipo local

Los casos y archivos se prepararon para aprender y no contienen registros reales. Las cuentas, lecturas y fondos de práctica no deben utilizarse como credenciales, mediciones ni dinero de una aplicación en producción.

---

## 1. Propósito y Arquitectura Híbrida (VPS + Local)

Cuando pasas de hacer pruebas aisladas en memoria a construir un proyecto real o colaborativo, necesitas una red blockchain que permanezca encendida las 24 horas, conserve el estado de los contratos desplegados y permita que tu computador local, tus compañeros de equipo y tus bases de datos interactúen con ella sin pagar tarifas de gas real.

Esta guía explica paso a paso cómo instalar y asegurar un servidor EVM basado en **Foundry Anvil** dentro de tu propio **VPS con Coolify**, y cómo conectarte desde tu equipo local con **Node.js 24**, **Hardhat** y **PostgreSQL 18** para aprovechar los casos de uso de dinero programable.

```mermaid
flowchart LR
    subgraph Local["Equipo Local (Windows + Node.js 24)"]
        direction TB
        Hardhat["Hardhat (--network vps)<br/>Compilación, Despliegue y Pruebas"]
        Sync["Sincronizador Híbrido<br/>(backend/chain/vps-sync.cjs)"]
        PG[("PostgreSQL 18 (5434)<br/>Proyección CQRS Idempotente")]
        Hardhat -->|"Emite transacciones"| Sync
        Sync -->|"INSERT ... ON CONFLICT DO NOTHING"| PG
    end

    subgraph VPS["Servidor VPS con Coolify"]
        direction TB
        Traefik["Traefik Proxy<br/>HTTPS + Basic Auth"]
        Anvil["Contenedor Foundry Anvil<br/>(Puerto interno 8545)"]
        Vol[("Volumen Persistente<br/>(/data/anvil-state.json)")]
        Traefik -->|"Tráfico autorizado"| Anvil
        Anvil <-->|"Volcado cada 10 s"| Vol
    end

    Hardhat -->|"JSON-RPC sobre HTTPS<br/>https://usuario:token@rpc.tudominio.com"| Traefik
```

### ¿Por qué usar esta arquitectura?

| Capa | Dónde se ejecuta | Tecnología | Función en tu proyecto |
|---|---|---|---|
| **Capa 1 · Custodia y Reglas (On-Chain)** | VPS con Coolify | Foundry Anvil (`docker-compose.anvil.yml`) | Ejecuta contratos inteligentes (`GarantiaAgroPay`, `DineroProgramableBase`), verifica firmas criptográficas y resguarda saldos con estado persistente en disco. |
| **Capa 2 · Bitácora de Eventos (Logs)** | VPS con Coolify | Bloques EVM (`chainId 31337`) | Emite eventos inmutables (`PagoAutorizado`, `PagoRetirado`) en cada transacción confirmada. |
| **Capa 3 · Lectura Veloz (Off-Chain CQRS)** | Tu equipo local o servidor de base de datos | PostgreSQL 18 (`backend/chain/vps-sync.cjs`) | Indexa los eventos del VPS aplicando `ON CONFLICT DO NOTHING` para responder consultas de interfaz, filtros y reportes en menos de 5 milisegundos. |

---

## 2. Paso a paso: Instalar el servidor EVM en Coolify

El repositorio incluye en su raíz el archivo `docker-compose.anvil.yml`. No necesitas instalar ni ejecutar Docker en tu computador local: Coolify lee esta plantilla directamente desde el repositorio y construye el servicio en el VPS.

### Paso 2.1. Preparar el subdominio en tu DNS

1. Entra al panel de tu proveedor de dominio (Cloudflare, Namecheap, Route53 o similar).
2. Crea un registro tipo **A** para el subdominio `rpc` (por ejemplo, `rpc.tudominio.com`) apuntando a la dirección IP pública de tu VPS donde corre Coolify.

### Paso 2.2. Crear el recurso Docker Compose en Coolify

1. Abre tu panel de **Coolify** en el navegador y entra a tu proyecto.
2. Haz clic en **+ New** y selecciona **Docker Compose** conectado a tu repositorio Git.
3. En el campo **Docker Compose Location**, escribe exactamente:
   ```text
   /docker-compose.anvil.yml
   ```
   *(Asegúrate de incluir la barra inicial `/` para que Coolify ubique el archivo en la raíz del proyecto).*
4. Selecciona la rama principal (`main` o `master`).

### Paso 2.3. Configurar el dominio y la seguridad con Traefik Basic Auth

Un nodo EVM expone métodos JSON-RPC. Si lo dejas abierto al público sin autenticación, bots automatizados escanearán el dominio y enviarán transacciones no deseadas. Por eso `docker-compose.anvil.yml` integra etiquetas de **Traefik Basic Auth**:

1. En la configuración del servicio `anvil` dentro de Coolify, asigna el dominio `https://rpc.tudominio.com`.
2. Genera una credencial en formato `htpasswd` (usuario y contraseña cifrada con bcrypt). En cualquier terminal con `htpasswd` o desde la consola del VPS puedes generarla así:
   ```bash
   htpasswd -nbB aprendiz MiTokenSeguro2026
   ```
3. Ve a la pestaña **Environment Variables** del recurso en Coolify y registra estas variables:
   ```ini
   ANVIL_CHAIN_ID=31337
   ANVIL_BLOCK_TIME=2
   ANVIL_BASIC_AUTH=aprendiz:$2y$05$ejemploHashBcryptGenerado...
   ```
4. Haz clic en **Deploy**. Coolify descargará la imagen `ghcr.io/foundry-rs/foundry:latest`, montará el volumen persistente `anvil_data:/data` y esperará a que el `healthcheck` (`cast block-number`) marque el contenedor como **Healthy**.

---

## 3. Configuración interna del servidor (`docker-compose.anvil.yml`)

La plantilla `docker-compose.anvil.yml` aplica cuatro prácticas esenciales de producción:

1. **Consumo mínimo de memoria (< 50 MB RAM):** Anvil está escrito en Rust y arranca en menos de un segundo sin sobrecargar la CPU del VPS.
2. **Persistencia automática en disco:** Los argumentos `--state /data/anvil-state.json --state-interval 10` guardan todas las cuentas, contratos desplegados, almacenamiento (`storage`) y saldos cada 10 segundos y al detener el contenedor. Si reinicias el VPS, tus contratos siguen exactamente donde quedaron.
3. **Aislamiento de red sin puertos expuestos en el host:** Usa `expose: ["8545"]` sobre la red externa `coolify` en lugar de `ports`. Nadie puede saltarse a Traefik conectándose por IP directa al puerto 8545.
4. **Verificación de salud nativa:** Cada 30 segundos ejecuta `cast block-number --rpc-url http://127.0.0.1:8545` dentro del contenedor para certificar que la máquina virtual EVM está procesando bloques.

---

## 4. Cómo conectarte desde tu computador local y ejecutar pruebas

Una vez tu servicio `anvil` está activo en Coolify, todo el trabajo de programación, pruebas y consultas se realiza cómodamente desde tu computador local con Windows, PowerShell 7 y Node.js 24.

### Paso 4.1. Configurar las variables de entorno en PowerShell 7

Abre PowerShell 7 en la carpeta de este proyecto y define las variables de conexión hacia tu VPS (incluyendo usuario y contraseña/token en la URL para que atraviesen Traefik Basic Auth):

```powershell
$env:VPS_RPC_URL = "https://aprendiz:MiTokenSeguro2026@rpc.tudominio.com"
$env:VPS_CHAIN_ID = "31337"
# Pega aquí la clave de práctica de una cuenta de tu nodo; nunca la guardes en archivos ni uses una con dinero real.
# Las claves predeterminadas de Hardhat y Anvil son públicas: cualquiera puede usarlas en una red expuesta.
$env:VPS_PRIVATE_KEY = Read-Host "Clave privada de práctica" -MaskInput
```

### Paso 4.2. Probar la respuesta del servidor EVM remoto

Antes de desplegar contratos, verifica que tu VPS responde consultando el número de bloque actual desde PowerShell:

```powershell
$peticion = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
Invoke-RestMethod -Uri $env:VPS_RPC_URL -Method Post -ContentType "application/json" -Body $peticion
```

Si la configuración es correcta, recibirás una respuesta inmediata como `@{jsonrpc=2.0; id=1; result=0x15}`.

### Paso 4.3. Compilar y desplegar contratos inteligentes en tu VPS

El archivo `hardhat.config.js` ya tiene configurada la red `vps`:

```javascript
vps: {
  url: process.env.VPS_RPC_URL || "http://127.0.0.1:8545",
  chainId: Number(process.env.VPS_CHAIN_ID || 31337),
  accounts: process.env.VPS_PRIVATE_KEY ? [process.env.VPS_PRIVATE_KEY] : undefined,
}
```

Para compilar los contratos localmente y desplegarlos en tu VPS, ejecuta:

```powershell
npm run compile
npx hardhat run scripts/deploy.js --network vps
```

El script desplegará los contratos del aula en el contenedor Anvil de tu VPS y actualizará `artifacts/deployment.json` con las direcciones reales en esa cadena.

### Paso 4.4. Ejecutar pruebas automatizadas

- Para validar toda la lógica de negocio, contratos y sincronización en tu equipo local:
  ```powershell
  npm run test:unit
  npm run test:contracts
  npm run test:taller
  ```
- Para verificar específicamente la validación de credenciales del VPS y el sincronizador híbrido:
  ```powershell
  node --test tests/backend/vps-sync.test.cjs
  ```

---

## 5. Cómo crear y aprovechar casos de uso reales con tu propio VPS

Tener tu propio nodo EVM en el VPS conectado con PostgreSQL 18 en una arquitectura híbrida te permite prototipar y demostrar casos de uso completos sin depender de dispensadores de fondos de prueba (*faucets*) públicos lentos ni gastar dinero real:

### Caso de uso 1: Garantías y custodia programable (Escrow AgroPay)

- **Problema:** Una cooperativa compradora y un productor agrícola desconfían sobre el momento del pago: el productor quiere seguridad de que los fondos existen antes de despachar, y el comprador solo quiere liberar el dinero si el lote cumple los parámetros de calidad.
- **Cómo lo implementas con tu VPS:**
  1. Despliegas el contrato de garantía en tu VPS (`npx hardhat run scripts/deploy.js --network vps`).
  2. La cooperativa deposita los fondos de garantía en el contrato del VPS (`depositarGarantia`). El dinero queda bloqueado en el almacenamiento EVM (`garantiaDisponible`) del servidor.
  3. Tu backend local evalúa la lectura de calidad (humedad, temperatura, acidez), la firma con la clave del oráculo y envía `registrarEvaluacion` al VPS.
  4. El productor retira su pago de forma segura (`retirarPago`) protegido contra ataques de reentrada mediante el patrón *Checks-Effects-Interactions* (CEI).

### Caso de uso 2: Sincronización CQRS de Eventos hacia PostgreSQL 18

Consultar directamente una cadena de bloques para filtrar miles de registros históricos o armar reportes contables es lento. En la arquitectura híbrida profesional, el contrato en el VPS actúa como **modelo de escritura** (*Write Model*) y PostgreSQL 18 actúa como **modelo de lectura** (*Read Model*).

El módulo `backend/chain/vps-sync.cjs` implementa este puente:

```javascript
const { JsonRpcProvider, Contract } = require('ethers');
const { Pool } = require('pg');
const { resolveVpsConfig, syncVpsEvents } = require('./backend/chain/vps-sync.cjs');
const { createEventStore } = require('./backend/persistence/event-store.cjs');
const manifest = require('./artifacts/deployment.json');

async function ejecutarSincronizacionHibrida() {
  // 1. Valida la URL del VPS y enmascara credenciales para registros seguros
  const config = resolveVpsConfig(process.env);
  console.log('Conectando a:', config.maskedUrl);

  // 2. Conecta al contrato desplegado en el nodo Anvil de Coolify
  const provider = new JsonRpcProvider(config.rpcUrl);
  const infoContrato = manifest.contracts.DineroProgramableBase;
  const contract = new Contract(infoContrato.address, infoContrato.abi, provider);

  // 3. Conecta a PostgreSQL 18 y proyecta eventos sin duplicados (ON CONFLICT DO NOTHING)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const store = createEventStore(pool);

  const resumen = await syncVpsEvents({
    provider,
    contract,
    store,
    deploymentId: config.deploymentId,
  });

  console.log(`Sincronizados ${resumen.indexed} eventos hasta el bloque ${resumen.blockNumber}`);
  await pool.end();
}
```

### Caso de uso 3: Laboratorio multiusuario para equipos ADSO y conexión con MetaMask

Cuando varios desarrolladores trabajan en un mismo proyecto formativo, cada uno puede conectarse al mismo VPS:

1. **En el frontend / MetaMask:** Abre MetaMask → *Agregar red manualmente* → Nombre: `Red VPS Aula ADSO`, Nueva dirección URL de RPC: `https://aprendiz:MiTokenSeguro2026@rpc.tudominio.com`, Identificador de cadena: `31337`, Símbolo: `ETH`.
2. **En el backend:** El indexador sincroniza los eventos emitidos por todos los miembros del equipo hacia PostgreSQL 18, manteniendo una única fuente de verdad auditable.

---

## 6. Diagnóstico y solución de problemas frecuentes

| Mensaje o síntoma | Causa probable | Qué hacer para resolverlo |
|---|---|---|
| `401 Unauthorized` al llamar al RPC | No se incluyeron las credenciales en `VPS_RPC_URL` o el hash bcrypt en `ANVIL_BASIC_AUTH` es incorrecto. | Comprueba que `VPS_RPC_URL` tenga el formato `https://usuario:token@rpc.tudominio.com` y verifica la variable `ANVIL_BASIC_AUTH` en Coolify. |
| `502 Bad Gateway` en el dominio del RPC | Traefik no logra conectarse al puerto 8545 del contenedor `anvil`. | Verifica en Coolify que el contenedor esté en estado `Healthy`, que el comando tenga `--host 0.0.0.0 --port 8545` y que pertenezca a la red `coolify`. |
| `El nodo del VPS requiere protocolo HTTP o HTTPS` | Se configuró una URL con `ws://` o sin esquema en `VPS_RPC_URL`. | Usa siempre `https://` para tu dominio en Coolify o `http://127.0.0.1:8545` en pruebas locales. |
| `nonce has already been used` | Se reinició el estado sin volumen persistente o MetaMask guardó un nonce anterior en caché. | Confirma que el volumen `anvil_data:/data` esté activo en Coolify; en MetaMask entra a *Configuración → Avanzado → Borrar datos de actividad*. |
