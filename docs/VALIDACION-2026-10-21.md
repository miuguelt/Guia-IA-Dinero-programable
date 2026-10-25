# Registro de validación — 21 de octubre de 2026

La implementación y las suites descritas en este registro pasaron en el entorno local. La ejecución remota de CI sigue pendiente. Los resultados corresponden a una guía de aprendizaje con datos de práctica; no acreditan uso en producción, mediciones de alimentos ni una elección pública.

## Entorno y alcance

La aplicación conserva seis módulos, cuatro pasos por módulo y doce laboratorios. La interfaz y la API se sirven en localhost:8153; Hardhat usa la red 31337 en 127.0.0.1:8545 y la persistencia se limita a la base guia_dinero_programable en PostgreSQL 18, puerto 5434.

El alcance incluye lectura y simulación estáticas, ejecución local de contratos y herramientas, firmas por software, evaluación por reglas, verificación de pruebas Semaphore, WebAuthn e indexación SQL. No incluye sensores físicos, inferencia en nube ni publicación pública.

Las credenciales del proyecto proceden de Windows Credential Manager y se inyectan al proceso. La web no recibe claves privadas ni credenciales PostgreSQL.

## Interfaz y contenido

La revisión anterior registró un ancho de contenido de 1243 px en una pantalla de 390 px. La suite de navegador comprueba ahora que el documento no supere el ancho disponible en 320, 390, 768, 1440, 1920 y 2560 px.

Las capturas están en `output/playwright/aula-<ancho>.png`. La suite comprueba un único título principal visible y ejecuta axe con las etiquetas WCAG 2 A/AA, 2.1 AA y 2.2 AA. Se revisaron portada, lecciones, catálogo, formularios y Portafolio en los seis tamaños. Los archivos `test-results/accesibilidad.json` y `test-results/accesibilidad-recorrido.json` contienen listas vacías de infracciones automatizadas. La [comparación visual](COMPARACION-VISUAL.md) conserva capturas anteriores y actuales.

Se comprobaron foco visible, menú con teclado, movimiento reducido y nombres, roles y anuncios en el árbol accesible de Chrome, guardado en `test-results/arbol-accesible.json`. Queda pendiente una evaluación humana con lectores de pantalla como NVDA y con aprendices; estas comprobaciones automáticas no certifican por sí solas conformidad completa con WCAG 2.2.

Las pruebas de recorrido cubren búsqueda en contenido, enlace directo, recarga, historial, simulación sin dependencias externas y WebAuthn con un autenticador virtual CTAP2. Las pruebas DOM comprueban además menú por teclado, navegación por los veinticuatro pasos, migración de registros, exportaciones, errores del portapapeles y protección contra una respuesta tardía después de cambiar de modalidad.

El contenido distingue confirmación e indexación, firma válida y dato verdadero, cobertura y calidad de pruebas. La comparación de IOTA referencia la documentación vigente sobre Move y gas. Las evidencias MG-A01 a MG-A05 incluyen instrucciones, ejemplos y criterios específicos.

## Recarga de desarrollo

El lanzador utiliza `scripts/dev.cjs`: compila las fuentes con esbuild y observa cambios con el mecanismo nativo de Windows. Node reinicia el backend mediante `--watch`. La página consulta `GET /api/revision` cada dos segundos únicamente en localhost o 127.0.0.1 y cuando está visible.

Las pruebas de reloj comprueban que la primera revisión no provoca recarga, una revisión distinta recarga conservando el enlace, las consultas no se solapan y `destroy` elimina el intervalo e invalida una respuesta pendiente. Los errores se ignoran sin mostrar un éxito. Un servidor estático que devuelve 404 en el primer intento detiene el sondeo.

## Laboratorios reales: tiempos observados

El reporte `test-results/laboratorios-reales.json` contiene la fecha de la corrida en `measuredAt` y las duraciones observadas de los doce laboratorios en `durationsMs`. Cada ejecución de la suite de integración actualiza esos valores; el archivo es la fuente de las mediciones y no se reproducen como tiempos fijos en esta guía.

Los valores miden el servicio o la herramienta en ese equipo, no la duración pedagógica de la actividad. La ruta introductoria mantiene ocho horas orientativas; la preparación y el trabajo completo de los doce laboratorios son una ampliación.

La ejecución real no se reemplaza por una simulación si falta un componente. Las cantidades monetarias se serializan como cadenas; los resultados conservan referencias y recibos cuando corresponden. Las seis etapas muestran sus resultados, y el historial conserva cada envío, confirmación e indexación observados, aunque ocurran entre dos consultas del navegador. La proyección utiliza una identidad de despliegue, posición de lectura persistida y claves de evento para reintentar sin duplicar registros. Una indexación pendiente conserva el recibo y no concede puntos ni una práctica verificada.

## Pruebas, cobertura y límites

Comandos de reproducción desde la raíz, con el entorno iniciado. Las pruebas de aprovisionamiento requieren cargar también las credenciales administrativas mediante el adaptador de Windows, sin imprimir sus valores:

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
npm run coverage
Remove-Item Env:GUIA_DB_USER, Env:GUIA_DB_PASSWORD, Env:GUIA_ADMIN_USER, Env:GUIA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
```

La recompilación forzada después de la cobertura Solidity restaura artefactos normales; las pruebas de integración y la cobertura de aplicación no deben utilizar la compilación instrumentada.

La corrida completa aprobó **92 pruebas Node.js**, que incluyen interfaz, API, PostgreSQL, herramientas, navegador y los doce laboratorios reales, y **37 pruebas Hardhat** de contratos y adaptadores. No hubo pruebas omitidas. Las 50 comprobaciones de compatibilidad de materiales anteriores también pasan; no sustituyen las pruebas nuevas sobre la lógica de producción.

El reporte Solidity inspeccionado en `test-results/solidity/functions.json` registra **41 de 41 funciones alcanzadas**. Las pruebas de contratos comprueban resultados, permisos y reversiones; el porcentaje no demuestra que no existan otros defectos.

La compuerta global de JavaScript alcanzó **187 de 187 funciones (100 %)**, **99,27 % de líneas** y **92,92 % de ramas**. Incluye backend, fuentes frontend, scripts ejecutables actuales y las subtareas de configuración Hardhat. Las fuentes y estilos antiguos que ya no sirve la aplicación son materiales conservados, no un segundo runtime. Los informes están en `coverage/coverage-summary.json`, `coverage/lcov.info`, `test-results/full-suite.log` y `test-results/coverage-final.log`.

Las compuertas nativas descubren las funciones mediante AST y registran su ejecución: ciclo de vida PowerShell **8/8**, credenciales PowerShell **4/4** y adaptador Python **2/2**. Las pruebas comprueban efectos reales de procesos, Windows Credential Manager, preparación idempotente, compilación y análisis; alcanzar una función no reemplaza estas aserciones. Sus informes se guardan en `test-results/lifecycle-coverage.json`, `test-results/credentials-coverage.json` y `test-results/python-functions.json`.

La auditoría ejecutó Slither y la prueba real de reentrada. El informe `test-results/audit/slither-report.json` conserva **36 hallazgos** y distingue producción de fixture: no encontró impactos altos o medios en los contratos de producción; el fixture adversarial conserva su hallazgo medio. Si falla la prueba de ataque o el análisis, la práctica conserva el diagnóstico y queda fallida. Una ejecución del analizador no constituye una verificación formal.

Las validaciones de HTML, higiene del repositorio, configuración canónica y reglas no presentaron errores. Modularidad conserva una advertencia por `js/simulators.js`, archivo anterior de 1149 líneas que no creció y ya no se sirve. El escáner de secretos permitió retirar un valor de respaldo del material Compose anterior; el lanzador operativo continúa exclusivamente en Windows nativo.

`npm audit --omit=dev` informa **cero vulnerabilidades de producción**. La auditoría completa conserva **47 avisos en dependencias de desarrollo** (23 altos, 10 moderados y 14 bajos), asociados a la cadena de herramientas Hardhat 2 y cobertura. Los reportes completos están en `test-results/npm-audit-production.json` y `test-results/npm-audit-all.json`. Migrar esa cadena y validar de nuevo su compatibilidad sigue siendo trabajo pendiente; no se presenta el conjunto de dependencias como libre de riesgos.

## Integración continua

El flujo `.github/workflows/tests.yml` prepara un ejecutor Windows efímero, Node.js 24, Slither y PostgreSQL 17 en 5434. PostgreSQL 17 se utiliza por el soporte de la acción de CI; no cambia la instalación local de PostgreSQL 18. Los reportes se publican como artefactos de la ejecución.

El repositorio no tiene remoto configurado en esta entrega. La ejecución remota de GitHub Actions está pendiente. La definición del flujo no se presenta como una corrida remota aprobada.
