# mi-dapp · Registro de productos

Plantilla para llevar un contrato inteligente a tu propio proyecto. Es una aplicación completa y pequeña: un contrato, una API (en Node.js o en Python, tú eliges), una interfaz web y una proyección de eventos en PostgreSQL.

Los productos, las cuentas y los saldos de esta plantilla se prepararon para aprender. No representan registros ni dinero reales, y las claves de práctica no deben usarse en una red con valor.

## Qué hace cada pieza

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| Contrato | `contracts/RegistroProductos.sol` | Guarda los productos y decide quién puede cambiarlos. Es la fuente de verdad. |
| API en Node.js | `backend-node/` | Recibe peticiones HTTP, valida, firma transacciones y mantiene la proyección. |
| API en Python | `backend-python/` | Las mismas rutas con FastAPI y web3.py. |
| Proyección | `sql/001_eventos_productos.sql` | Copia de los eventos para consultar rápido. Se puede borrar y reconstruir. |
| Interfaz | `frontend/` | Lista los productos y permite escribir con la API o con tu billetera. |

## El CRUD que ya conoces, como contrato

| Operación | En una API con SQL | En el contrato | Qué cambia |
|---|---|---|---|
| Crear | `INSERT` | `crear(nombre, precio)` | Es una transacción: se firma, cuesta gas y emite `ProductoCreado`. |
| Leer | `SELECT` | `obtener(id)` o la proyección | Leer no cuesta gas. Para listas y filtros se consulta la proyección. |
| Actualizar | `UPDATE` | `actualizarPrecio(id, precio)` | El valor anterior no se pierde: queda en el evento `PrecioActualizado`. |
| Eliminar | `DELETE` | `desactivar(id)` | No se borra nada. El producto queda inactivo y su historia permanece. |

## Requisitos

- Node.js 24 y PowerShell 7.
- Opcional: PostgreSQL 18 para la proyección en base de datos. Sin él, la API usa memoria.
- Opcional: [uv](https://docs.astral.sh/uv/) para ejecutar la API en Python.

## Paso 1. Instala y comprueba

```powershell
npm install
npm test
```

Debes ver todas las pruebas en verde. Las de PostgreSQL aparecen como pendientes hasta que definas `DATABASE_URL`.

## Paso 2. Enciende la red local y despliega

En una terminal, enciende el nodo y déjalo abierto. Muestra veinte cuentas de práctica con su clave privada:

```powershell
npm run nodo
```

En otra terminal, despliega el contrato:

```powershell
npm run desplegar
```

El comando escribe `despliegue.json` con la red, la dirección del contrato y su ABI. Cada vez que reinicies el nodo la cadena empieza de cero: vuelve a desplegar.

## Paso 3. Inicia la API

La API necesita saber a qué nodo hablar y con qué cuenta firmar. Copia una de las claves privadas que mostró `npm run nodo` cuando la terminal la pida; así no queda escrita en ningún archivo ni en el historial:

```powershell
$env:RPC_URL = "http://127.0.0.1:8545"
$env:CLAVE_PRIVADA_API = Read-Host "Clave privada de práctica" -MaskInput
npm run api
```

Abre <http://localhost:3000>. Para usar la API en Python en lugar de la de Node.js, cambia el último comando por `npm run api:python`. Las dos responden igual; no las inicies al mismo tiempo porque usan el mismo puerto.

Para guardar la proyección en PostgreSQL, define además la conexión antes de iniciar la API de Node.js:

```powershell
$env:DATABASE_URL = Read-Host "URL de PostgreSQL (postgres://usuario:clave@127.0.0.1:5432/base)" -MaskInput
```

## Paso 4. Recorre el CRUD

En la interfaz, crea un producto con la API, cambia su precio y desactívalo. También puedes hacerlo desde otra terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/productos -Method Post -ContentType "application/json" -Body '{"nombre":"Café","precio":12000}'
Invoke-RestMethod http://localhost:3000/api/productos
Invoke-RestMethod http://localhost:3000/api/productos/1 -Method Patch -ContentType "application/json" -Body '{"precio":13500}'
Invoke-RestMethod http://localhost:3000/api/productos/1 -Method Delete
Invoke-RestMethod http://localhost:3000/api/eventos
```

La última consulta muestra los tres eventos: el producto desactivado sigue ahí, con todo su historial.

## Paso 5. Firma con tu propia billetera

1. Instala una billetera en el navegador, por ejemplo MetaMask.
2. Agrega la red local: RPC `http://127.0.0.1:8545`, identificador de cadena `31337`, símbolo `ETH`.
3. Importa otra de las cuentas de práctica que mostró `npm run nodo`.
4. En la interfaz, pulsa **Crear con mi billetera** y confirma. Después pulsa **Actualizar lista**.

El producto queda a nombre de tu cuenta. Si intentas cambiarlo con el botón de la fila, la API responde que solo la cuenta que lo creó puede modificarlo: el permiso lo decide el contrato, no la API.

## Quién firma: dos formas de escribir

| | Firma la API | Firma el usuario |
|---|---|---|
| Quién paga el gas | La cuenta de la API | La cuenta del usuario |
| Qué necesita el usuario | Nada: usa la aplicación como cualquier otra | Una billetera con saldo en esa red |
| Quién figura como responsable | La cuenta de la API | La cuenta del usuario |
| Cuándo conviene | Usuarios sin billetera; la organización responde por el dato | Cada persona debe responder por lo que registra |

## Adapta la plantilla a tu proyecto

1. Cambia el contrato por tu regla de negocio y escribe primero sus pruebas en `test/`.
2. Ajusta los eventos en `backend-node/indexador.js` (o `backend-python/cadena.py`) y la tabla en `sql/`.
3. Ajusta las rutas y validaciones de la API. Cada error del contrato necesita su código HTTP y su mensaje.
4. Ajusta la interfaz. Conserva los cinco estados: sin datos, en ejecución, confirmado, pendiente y error.

En el contrato va solo lo que varias partes necesitan verificar. Los datos personales, los archivos y lo que deba poder borrarse van en tu base de datos.

## Publica en un VPS con Coolify

Necesitas un nodo accesible desde el servidor. La guía explica cómo publicar uno propio con Anvil en el anexo «Publica la guía en tu VPS».

1. **Despliega el contrato en tu nodo remoto** desde tu equipo:

   ```powershell
   $env:RPC_URL = Read-Host "URL del nodo (https://usuario:clave@rpc.tudominio.com)" -MaskInput
   $env:CLAVE_PRIVADA = Read-Host "Clave privada de la cuenta que despliega" -MaskInput
   npm run desplegar:remota
   ```

   El comando escribe `despliegue.remota.json`. Contiene la dirección y el ABI, que son públicos: agrégalo a tu repositorio.

2. **Sube el proyecto a GitHub.** Comprueba antes que no incluyes claves: `git status` no debe listar archivos `.env`.

3. **Crea el recurso en Coolify:** tipo Docker Compose, conectado a tu repositorio. En **Docker Compose Location** escribe `/docker-compose.yml` para la API en Node.js o `/docker-compose.python.yml` para la API en Python.

4. **Define las variables de entorno en Coolify:** `RPC_URL` y `CLAVE_PRIVADA_API`. Para la API en Node.js agrega `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB`; usa una contraseña de letras y números, porque viaja dentro de una URL.

5. **Asigna el dominio al servicio `app`** con el puerto `3000` y despliega.

6. **Verifica:** abre `https://tu-dominio/api/salud`. Debe mostrar la dirección del contrato, la red y la cuenta de la API. Crea un producto desde la interfaz publicada.

La cuenta de `CLAVE_PRIVADA_API` necesita saldo en esa red para pagar el gas. Usa una cuenta exclusiva para la API, distinta de la que desplegó el contrato y de tus cuentas personales.

## Si algo falla

| Mensaje | Causa | Qué hacer |
|---|---|---|
| `No existe despliegue.json` | No has desplegado en esta red. | Enciende el nodo y ejecuta `npm run desplegar`. |
| `No hay contrato en la dirección de despliegue.json` | Reiniciaste el nodo local y la cadena empezó de cero. | Ejecuta `npm run desplegar` otra vez. |
| `El nodo respondió con la red … y el despliegue es de la red …` | `RPC_URL` apunta a otra red. | Corrige `RPC_URL` o despliega en esa red. |
| `Define la variable RPC_URL antes de iniciar la API` | Abriste una terminal nueva. | Repite los comandos del paso 3 en esa terminal. |
| La API responde 502 | El nodo está apagado o no responde. | Revisa la terminal de `npm run nodo` o el servicio del nodo en Coolify. |
| La billetera muestra un error de nonce | Reiniciaste el nodo y la billetera recuerda la cadena anterior. | En MetaMask: Configuración → Avanzado → Borrar datos de actividad. |
| `insufficient funds` | La cuenta no tiene saldo en esa red. | Usa una cuenta de práctica con saldo o envíale saldo desde otra. |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas del contrato, la API de Node.js, el indexador y la interfaz. |
| `npm run test:python` | Pruebas de la API en Python contra un nodo Hardhat. |
| `npm run cobertura` | Comprueba que cada función JavaScript tiene una prueba. |
| `npm run cobertura:contrato` | Cobertura de las funciones del contrato. |
| `npm run nodo` | Enciende la red local en `127.0.0.1:8545`. |
| `npm run desplegar` | Despliega en la red local y escribe `despliegue.json`. |
| `npm run desplegar:remota` | Despliega en la red de `RPC_URL` y escribe `despliegue.remota.json`. |
| `npm run api` / `npm run api:python` | Inicia la API en Node.js o en Python en el puerto 3000. |
