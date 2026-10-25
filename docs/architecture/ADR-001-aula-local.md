# ADR 001 — Aula local verificable

Estado: implementado y validado localmente; la ejecución remota de CI está pendiente. Fecha: 2026-10-21.

## Decisión y responsabilidades

Se conserva JavaScript, Solidity 0.8.24 y Hardhat 2. La interfaz es HTML semántico y módulos JavaScript en `frontend/web/`; `web/` es la salida web estática publicada. Node.js sirve esa salida y una API del mismo origen en 8153. La compilación con esbuild permite dependencias locales, sin CDN. Backend CommonJS por funcionalidad; contratos existentes conservan sus interfaces. Los adaptadores aíslan red EVM, PostgreSQL y herramientas. No se agrega un framework de interfaz ni inferencia de IA.

Árbol: `frontend/web/{learning,labs,evidence,navigation}`, `backend/{http,labs,chain,persistence,security,audit}`, `contracts/`, `tests/{backend,frontend}`, `test/`, `scripts/`. La salida generada está en `web/`; no es una segunda fuente editable.

La interfaz consume contratos HTTP y el catálogo de actividades. Los casos de uso dependen de adaptadores; persistencia y criptografía no importan la interfaz. Un archivo implementa una capacidad cohesiva. Se extrae primero el límite afectado en los archivos heredados grandes. El coordinador integra API, ciclo de vida y CI; las capas independientes tienen rutas de escritura exclusivas.

## Contratos de integración

- `GET /api/runtime`: `{api:true, chain:{connected,chainId,blockNumber}, database:{connected}, deployment:{id,contracts}, tools:{...}}`. Errores de dependencias se declaran, no se convierten en simulación.
- `POST /api/labs/:id/runs`: JSON `{input:{...}}`, respuesta 202 `{id,labId,mode:'real',status:'queued'}`. Identificadores de laboratorio: `elections`, `signatures`, `pipeline`, `pharma`, `honey`, `audit`, `evm`, `myths`, `comparison`, `pc`, `architecture`, `database`.
- `GET /api/runs/:id`: `{id,labId,mode,status,phase,timeline,verificationComplete,result,error,evidenceRefs}`. Estados de ejecución: queued/running/completed/failed. La fase y su historial distinguen envío pendiente, confirmación, sincronización e indexación pendiente. Una sesión solo consulta sus ejecuciones. Resultado serializable: cantidades y BigInt como cadenas; recibos `{hash,blockNumber,gasUsed,status}`. `error` contiene `{code,message,retryable}`. Una indexación pendiente conserva el recibo y no concede la verificación de la práctica ni puntos.
- La interfaz mantiene la simulación con el mismo formato, `mode:'simulation'`, sin recibos inventados. No cambia de modalidad ante un error.
- Roles de laboratorio: administrador, oráculo, beneficiario y observador, cuentas de desarrollo locales. No se transmiten ni registran claves privadas. `chainId` permitido 31337; RPC solo loopback. La autenticación de la práctica WebAuthn no concede permisos administrativos.
- `backend/chain/runtime.cjs` exporta `createChainRuntime({rpcUrl,manifestPath})`: métodos `health()`, `execute(labId,input,observe)`, `events({fromBlock})`, `close()`. `execute` devuelve datos observados y recibos; el observador recibe cada envío y confirmación efectivos. Manifiesto en `artifacts/deployment.json`, con `{id,chainId,contracts:{Name:{address,abi}},deployedAtBlock,deployedBlockHash}`.
- `backend/persistence/store.cjs` exporta `createStore(config)`: `initialize()`, `health()`, `recordEvents(deploymentId,events)`, `readEvents(deploymentId)`, `readPosition(deploymentId)`, `rebuild(deploymentId,events)`, `saveCredential(credential)`, `getCredential(id)`, `updateCredential(id,counter)`, `close()`. Eventos con txHash/logIndex/blockNumber/name/args, clave única deploymentId+txHash+logIndex. La posición se obtiene de los eventos confirmados persistidos; la lectura se reanuda desde ese bloque de forma inclusiva y las claves únicas evitan duplicados. Un despliegue nuevo conserva una historia independiente. PostgreSQL 5434, base exclusiva guia_dinero_programable.
- `backend/security/signatures.cjs`: `createSignatureLab()` con `sign(input)`, `verify(envelope)`. Firmas efímeras, identidad registrada, contenido canónico y nonce de un solo uso. No se almacenan claves.
- `backend/security/webauthn.cjs`: `createWebAuthnLab({store,origin})` con `registrationOptions(sessionId)`, `register(sessionId,response)`, `authenticationOptions(sessionId)`, `authenticate(sessionId,response)`; desafíos de un solo uso y sesión, RP localhost.
- `backend/audit/runner.cjs`: `createTaskRunner({root})` con `run(task)` y `health()`. Tareas compile/test/audit, comandos fijos mediante spawn sin shell, timeout y salida sin secretos. Slither usa compilación real del proyecto.

## Preservación, verificación y confianza

Se conservan los seis módulos y MG-A01…MG-A05. Se migran progreso y evidencias locales. La lectura y simulación son estáticas; el modo real requiere inicio explícito del proyecto. Las herramientas y PostgreSQL compartidos no se reinician. Hardhat usa 8545 y se inicia mediante el lanzador específico, sin imprimir claves. Sin Docker, WSL, sensores físicos, cuentas con dinero real, IA externa ni publicación.

Hardhat administra exclusivamente `artifacts/hardhat/` y `.cache/hardhat/`. El manifiesto público y el estado del lanzador quedan fuera de ese subárbol. Una regresión comprueba que recompilar no los borra. `index.html` y los dos enlaces HTML anteriores son entradas de compatibilidad hacia la web actual; los scripts y estilos antiguos de raíz ya no son servidos por la aplicación. La compilación de `web/` es regenerable y se conserva ignorada, no se usa como fuente editable ni como código manual sujeto al presupuesto modular.

Primero pruebas fallidas de regresión, después implementación y pruebas por capa. Cobertura de funciones de producción al 100 %, suites integradas y CI Windows. Capturas 320/390/768/1440/1920/2560, pruebas con nodo/PostgreSQL reales y WebAuthn virtual. Confianza alta en web y EVM; las dependencias nativas de auditoría y credenciales PostgreSQL se verifican como límites explícitos. No se presenta una dependencia ausente como integración verificada.

Alternativas rechazadas: reescritura React sin consumidor; servidor externo para cada laboratorio; simulaciones presentadas como comprobaciones reales; criptografía propia en lugar de Semaphore; servicios nuevos de infraestructura.
