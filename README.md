# Dinero programable — Aula ADSO

Guía web para aprendices con bases de JavaScript, programación orientada a objetos y bases de datos. La ruta introductoria reúne seis módulos y trece laboratorios con simulación y ejecución real local.

Los casos y archivos se prepararon para aprender y no contienen registros reales. Las cuentas, lecturas y fondos de práctica no deben utilizarse como credenciales, mediciones ni dinero de una aplicación en producción.

## Ruta del aprendiz

La guía web explica cada paso con comandos, salidas esperadas y solución de problemas. Este resumen indica por dónde empezar.

1. **Prepara tu equipo** (`#preparar`). Nivel mínimo: Node.js 24, VS Code y PowerShell 7. Nivel completo: además PostgreSQL 18 y, si tu instructor lo pide, uv con Slither.
2. **Recorre los seis módulos** y registra las evidencias MG-A01 a MG-A05 donde se producen.
3. **Explora el Taller AgroPay** (`#taller`). Descargas `descargas/taller-agropay.zip`, lo instalas con `npm install` y recorres las siete etapas con `npm run etapa:N`. El taller viene 100 % construido y funcional: ejecutas pruebas, inspeccionas dónde se guardan los datos (EVM Storage vs. Logs vs. SQL) y realizas experimentos de seguridad con `npm run probar:seguridad` y `npm run inspeccionar:estado`.
4. **Practica en los laboratorios** (`#labs`). Cada uno indica cómo hacerlo, qué resultado esperar y qué hacer si falla.

| Lenguaje | Uso en la guía | Rol del aprendiz |
|---|---|---|
| JavaScript | Reglas, pruebas, oráculo, indexador y recorrido | Inspecciona la lógica y ejecuta pruebas y comandos |
| Solidity | Contrato `GarantiaAgroPay` | Analiza variables de almacenamiento EVM y permisos en bytecode |
| SQL | Proyección de eventos sin duplicados | Comprende el patrón CQRS y la deduplicación con `ON CONFLICT DO NOTHING` |
| PowerShell | Ejecutar comandos | Ejecuta comandos guiados |
| Python | Slither, dentro del laboratorio Auditoría | No; es opcional |

El taller vive en `taller/`: `taller/inicio` es el paquete que recibe el aprendiz y `taller/solucion` es la referencia canónica para el instructor. `npm run test:taller` comprueba que ambas carpetas vienen 100 % construidas, pasan todas las etapas con 100 % de funciones JavaScript, alcanzan el 100 % de funciones Solidity y ejecutan los scripts de demostración e inspección sin errores.

## Documentos de apoyo

Los documentos de `docs/` amplían la guía web. No siguen la misma numeración que los módulos, así que esta tabla indica dónde usar cada uno.

| Documento | Módulo o sección web | Para qué sirve |
|---|---|---|
| [Fundamentos y decisión](docs/01-fundamentos.md) | m1 · Dinero y redes | Evidencia MG-A01: justificar cuándo conviene una cadena de bloques. |
| [Cómo funciona una cadena de bloques](docs/FUNCIONAMIENTO_BLOCKCHAIN_Y_VERIFICACION_DE_RED.md) | m1 · Dinero y redes | Bloques, cuentas, ciclo de una transacción y verificación del nodo local o del VPS. |
| [Casos de uso ADSO](docs/01b-casos-adso.md) | m2 · Casos de uso y decisiones | Ejemplos de cadena de suministro y voto para analizar actores y reglas. |
| [Diseño, persistencia y seguridad](docs/02-diseno.md) | m2 · Casos de uso y decisiones | Evidencia MG-A02: ejemplo resuelto de límites y responsabilidades. |
| [Inspecciona el Taller AgroPay](docs/03-implementacion.md) | m3 · Contratos y seguridad | Evidencia MG-A03: etapas del taller, almacenamiento EVM y retiro seguro. |
| [POO frente a contratos inteligentes](docs/03c-paradigma-poo-vs-smart-contracts.md) | m3 · Contratos y seguridad | Comparación entre objetos, estado persistente y reversión. |
| [Validación con pruebas](docs/04-validacion.md) | m4 · Oráculos y datos firmados | Evidencia MG-A04: cómo leer y experimentar con las pruebas de cada etapa. |
| [Cierre de transferencia](docs/05-cierre.md) | m5 · Pruebas y persistencia | Evidencia MG-A05: consolidar pruebas, cobertura y sincronización reproducibles. |
| [Arquitectura blockchain y PostgreSQL](docs/ARQUITECTURA_BLOCKCHAIN_Y_POSTGRES_ADSO.md) | m5 · Pruebas y persistencia | Relación entre eventos, indexador y proyección SQL. |
| [Migración de Web2 a Web3](docs/GUIA_MIGRACION_WEB2_A_WEB3_PASO_A_PASO.md) | m6 · Proyecto y Portafolio | Ideas para llevar los patrones a un proyecto propio. |
| [Aplicaciones, redes y Coolify](docs/03b-implementacion-aplicaciones-y-redes.md) | Anexo `#publicar` | Despliegue de la guía y de un nodo de práctica en un VPS. |
| [Servidor EVM en Coolify y uso local](docs/GUIA_SERVIDOR_EVM_COOLIFY_Y_USO_LOCAL.md) | Anexo `#publicar` | Configuración paso a paso del nodo remoto de práctica. |
| [Comparación visual](docs/COMPARACION-VISUAL.md) | Mantenimiento | Evidencia visual de la interfaz. |
| [Validación del 21 de octubre](docs/VALIDACION-2026-10-21.md) y [del 24 de octubre](docs/VALIDACION-2026-10-24.md) | Mantenimiento | Registros fechados de validación. |

## Mantenimiento e instructor (entorno DevBrain)
### Inicio en Windows

Requisitos: **PowerShell 7**, **Node.js 24**, **PostgreSQL 18 nativo en 5434** y las credenciales administrativas de DevBrain disponibles en Windows Credential Manager. Para la auditoría se requiere **uv**, Python 3.10 o superior y Slither. Chrome se utiliza en las pruebas de navegador.

Desde la raíz del proyecto, instale las dependencias:

```powershell
npm ci
uv tool install slither-analyzer==0.11.6
```

Prepare la base exclusiva de la guía una sola vez:

```powershell
pwsh ./start-windows.ps1 -InitializeDatabase
```

Este comando prepara el rol y la base `guia_dinero_programable`, conserva las credenciales del proyecto en Windows Credential Manager e inicia la guía. En los siguientes usos:

```powershell
pwsh ./start-windows.ps1
```

Abra [http://localhost:8153/](http://localhost:8153/). El inicio compila la web y los contratos, inicia el nodo de desarrollo, despliega los contratos y abre la API. El estado del entorno aparece en la interfaz y en `GET /api/runtime`.

| Componente | Dirección o alcance |
|---|---|
| Web y API | localhost:8153 |
| Hardhat | 127.0.0.1:8545; chainId 31337 |
| PostgreSQL local | 127.0.0.1:5434; PostgreSQL 18 |
| Datos de la aplicación | Base exclusiva guia_dinero_programable |
| Manifiesto del despliegue | artifacts/deployment.json (VPS: artifacts/deployment.vps.json) |
| Verificar la red conectada | `npm run red:verificar -- --red local` o `--red vps` |
| Procesos del proyecto | artifacts/lifecycle.json |

Para reiniciar de forma controlada o detener los componentes propios:

```powershell
pwsh ./start-windows.ps1 -Reload
pwsh ./start-windows.ps1 -Stop
```

El reinicio vuelve a desplegar en una cadena local nueva. Las proyecciones se separan por identidad del despliegue para no mezclar historias. La detención conserva PostgreSQL y Memurai activos. Si un puerto pertenece a otro proyecto, el lanzador informa el conflicto.

La recarga de desarrollo compila las fuentes web al guardar y reinicia el backend con el mecanismo nativo de Node. La página visible comprueba la revisión cada dos segundos y se recarga conservando el enlace a la lección. No se utiliza el recargador de Flask.

## Cómo recorrer el aula

1. **Dinero y redes:** estado, garantía y decisión de arquitectura.
2. **Casos de uso y decisiones:** actores, trazabilidad y límites.
3. **Contratos y seguridad:** POO, permisos, cantidades, CEI y pruebas.
4. **Oráculos y datos firmados:** integridad, repetición y reglas explicables.
5. **Pruebas y persistencia:** herramientas, eventos y proyecciones SQL.
6. **Proyecto y Portafolio:** integración y entrega reproducible.

Cada módulo sigue cuatro pasos: Comprende, Revisa el ejemplo, Practica y Aplica. La búsqueda incluye explicaciones y comandos, admite consultas sin tildes y devuelve enlaces directos.

La **ruta introductoria suma nueve horas orientativas**. Instalar el entorno y ejecutar íntegramente los trece laboratorios reales constituye una ampliación. El archivo `test-results/laboratorios-reales.json` contiene tiempos observados de ejecución de herramientas y servicios; no mide el tiempo que necesita una persona para aprender o completar una actividad.

### Dos modalidades

- **Simulación:** ejecuta modelos de reglas en el navegador. No genera transacciones, firmas criptográficas ni resultados de herramientas que no se hayan ejecutado.
- **Real local:** consulta servicios y ejecuta contratos, firmas, herramientas y PostgreSQL. Un error mantiene la modalidad y explica cómo continuar; no se reemplaza por una simulación.

Los laboratorios cubren elecciones, firmas, flujo de seis pasos, cadena de frío, calidad de miel, auditoría, EVM, IA y redes, comparación, entorno en PC, arquitectura y PostgreSQL. El laboratorio de elecciones utiliza pruebas de Semaphore. Su primera preparación descarga recursos públicos WASM y zkey y los conserva en la caché del proyecto; las prácticas posteriores los reutilizan.

El dictamen del oráculo se obtiene mediante **reglas explicables**, sin modelos de IA en nube. Los datos se ingresan por software. La firma y la prueba criptográfica verifican propiedades concretas; no acreditan una medición física ni todo el sistema de una elección pública.

La práctica WebAuthn registra y verifica una clave de acceso mediante el autenticador del navegador. Requiere usar `localhost` y un navegador compatible. La clave privada permanece en el autenticador. La práctica no concede permisos administrativos ni implementa una cuenta ERC-4337.

## Progreso y Portafolio

El aula recupera los módulos y evidencias del almacenamiento anterior, conserva el punto del recorrido y evita recompensas repetidas por la misma actividad. El módulo completado, la práctica real verificada y el juicio del instructor son estados diferentes.

MG-A01 a MG-A05 se producen en sus respectivas estaciones. Todas siguen la misma ficha de tres bloques: **Observa** un resultado de AgroPay, **Explica** lo que significa y llévalo a **Tu proyecto**. Los bloques «Tu proyecto» se acumulan módulo a módulo y en m6 forman la propuesta final. El Portafolio consolida los registros y permite exportarlos en JSON o Markdown. Los textos se guardan en el navegador; si el almacenamiento está bloqueado, la interfaz lo informa al intentar guardar. Conviene conservar una exportación para la entrega definida por el instructor.

## Credenciales y datos

El lanzador obtiene únicamente los nombres necesarios desde Windows Credential Manager: `GUIA_DINERO_DB_USER` y `GUIA_DINERO_DB_PASSWORD`. Durante la preparación usa las entradas administrativas ya existentes de DevBrain. Los valores se inyectan al proceso y se retiran del entorno del lanzador al terminar.

No se escriben secretos en documentación, JSON, argumentos de comandos, código ni reportes. Las cuentas y las identidades criptográficas del nodo son desechables y de uso exclusivo del ejercicio. Los recibos y las cantidades consultables se presentan después de la confirmación; los importes en wei se conservan como cadenas decimales exactas.

## Verificación

Las suites de integración, navegador y cobertura completa requieren el entorno local iniciado. Para ejecutar comprobaciones desde otra consola, cargue las credenciales del proyecto mediante el adaptador existente, sin imprimir sus valores:

```powershell
. ./scripts/guide-credentials.ps1
Import-GuideCredentials
Import-GuideAdminCredentials
npm run test:unit
npm run coverage:contracts
npm run compile -- --force
npm run test:contracts
npm run test:integration
npm run test:browser
npm run test:legacy
npm run test:taller
npm run coverage
Remove-Item Env:GUIA_DB_USER, Env:GUIA_DB_PASSWORD, Env:GUIA_ADMIN_USER, Env:GUIA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
```

Las comprobaciones de aprovisionamiento usan también las credenciales administrativas cargadas por `Import-GuideAdminCredentials`. Los valores se mantienen en el entorno del proceso y se retiran al terminar.

`npm run coverage:contracts` comprueba cada función Solidity del reporte y produce artefactos instrumentados. Después debe ejecutarse `npm run compile -- --force` para restaurar la compilación normal antes de la cobertura general. `npm run coverage` exige que las funciones de producción incluidas en la aplicación sean alcanzadas por pruebas con aserciones. La cobertura no reemplaza la revisión de permisos, seguridad ni calidad de las aserciones.

| Evidencia | Ubicación |
|---|---|
| Cobertura de aplicación | coverage/coverage-summary.json y coverage/lcov.info |
| Cobertura Solidity | test-results/solidity/ y test-results/solidity/functions.json |
| Funciones PowerShell y Python | test-results/lifecycle-coverage.json, credentials-coverage.json y python-functions.json |
| Resultado de Slither | test-results/audit/slither-report.json |
| Ejecuciones medidas de laboratorios | test-results/laboratorios-reales.json |
| Hallazgos automatizados de accesibilidad | test-results/accesibilidad.json |
| Capturas adaptables | output/playwright/aula-320.png hasta aula-2560.png |

Las cifras vigentes de pruebas y cobertura salen de cada corrida: consulte el artefacto `evidencia-windows` de GitHub Actions o ejecute `npm run coverage` y `npm run coverage:contracts`. Los resultados, los defectos corregidos y lo pendiente están en [el registro de validación del 24 de octubre](docs/VALIDACION-2026-10-24.md); el [registro anterior](docs/VALIDACION-2026-10-21.md) conserva la validación previa y [la comparación visual](docs/COMPARACION-VISUAL.md). Los reportes generados son la evidencia de una ejecución concreta; la presencia del archivo o una suite aprobada no certifican por sí solas la calidad de toda una aplicación.

## Estructura y CI

`frontend/web/` contiene las fuentes editables del aula; `web/` es una salida regenerable mediante `npm run build`, que también empaqueta `taller/inicio` en `web/descargas/taller-agropay.zip`. `backend/` separa HTTP, casos de uso, criptografía, herramientas, red y persistencia. `contracts/` conserva los contratos de producción y las pruebas viven junto a los límites que verifican.

La CI de [GitHub Actions](.github/workflows/tests.yml) usa un ejecutor Windows efímero, Node.js 24 y PostgreSQL 17 en 5434 por compatibilidad con la acción de preparación. Esa diferencia corresponde al ejecutor de CI; el entorno local canónico continúa en PostgreSQL 18. Los roles de CI reciben credenciales generadas por ejecución.

El repositorio todavía no tiene un remoto configurado. La ejecución remota de GitHub Actions queda pendiente hasta que se publique el repositorio y se produzca un evento de integración o envío.
