# Registro de validación — 24 de octubre de 2026

> **Nota posterior:** el modelo de taller con comentarios `TODO` descrito aquí se retiró. `taller/inicio` se entrega construido para explorar e inspeccionar; el [README](../README.md) describe el modelo vigente.

Este registro documenta la incorporación del Taller AgroPay y la revisión de la guía para que un aprendiz pueda preparar su equipo y construir su propio proyecto. Todos los resultados provienen de corridas locales en Windows nativo; la ejecución remota de CI sigue pendiente porque el repositorio no tiene remoto configurado. Los resultados corresponden a una guía de aprendizaje con datos de práctica.

## Qué cambió para el aprendiz

- **Prepara tu equipo** (`#preparar`): instalación en dos niveles con comandos `winget` verificados (Node.js LTS 24.22.1, VS Code, PowerShell 7, Git, PostgreSQL 18 y uv), tabla de lenguajes, equivalencias entre JavaScript y Solidity, repaso de SQL, glosario y problemas frecuentes.
- **Taller AgroPay** (`#taller`, `taller/`): siete etapas con archivos de inicio, comentarios `TODO`, pruebas de aceptación y solución de referencia. Se descarga como `descargas/taller-agropay.zip`, generado en cada compilación.
- **Laboratorios:** cada uno indica cómo hacerlo, qué resultado esperar, qué hacer si falla y qué etapa del taller lo complementa.
- **Módulos:** la sección Practica enlaza su etapa del taller; m6 ya no repite la estación MG-A05.
- **Documentos:** se corrigieron referencias a TypeScript, Circom, PostgreSQL 16, `file:///`, Docker local y un contrato inexistente. La plantilla del Portafolio se genera a partir del registro de evidencias.
- **Publicación:** el anexo `#publicar` explica el despliegue en un VPS con Coolify. Solo se publica la guía web; la modalidad Real local sigue limitada a loopback.

## Ensayo del recorrido del aprendiz

El paquete `taller/inicio` se copió fuera del repositorio, en el directorio temporal de la sesión, y se instaló con `npm install` sin acceso a las dependencias del proyecto. Después se ejecutaron `npm run verificar` y las etapas 0 a 6. Al empezar, la etapa 0 pasó y las demás fallaron con el mensaje `TODO etapa N`. Al completar los archivos de cada etapa, todas pasaron. `npm run demo` generó `evidencia-taller.md` con tres eventos indexados.

La instalación informó 46 avisos de vulnerabilidad en dependencias de desarrollo de Hardhat 2 y avisos de `allow-scripts` para `keccak` y `secp256k1`. La guía los explica y advierte no ejecutar `npm audit fix --force`. Las salidas publicadas en las páginas del taller se copiaron de estas corridas.

`npm run test:taller` repite ese ensayo de forma automática: comprueba que la solución pasa todas las etapas, que el inicio falla solo por sus `TODO` y que cada etapa pasa cuando se completan sus propios archivos. La etapa 5 se prueba con PostgreSQL real en un esquema temporal que se elimina al terminar.

## Pruebas y cobertura

| Suite | Resultado |
|---|---|
| Node.js (`npm run coverage`: backend, frontend, integración, navegador y taller) | 131 de 131 pruebas aprobadas |
| Hardhat (contratos del aula) | 37 de 37 pruebas aprobadas |
| Compatibilidad de materiales anteriores (`npm run test:legacy`) | 49 de 49 pruebas aprobadas |
| Cobertura JavaScript de la aplicación | 225 de 225 funciones (100 %), 99,26 % de líneas, 93,42 % de ramas |
| Cobertura Solidity del aula (`npm run coverage:contracts`) | 41 de 41 funciones |
| Solución del taller | 100 % de funciones JavaScript (con PostgreSQL) y 100 % de funciones Solidity de `GarantiaAgroPay` |

La cobertura indica qué funciones se ejecutaron. No demuestra que las aserciones sean suficientes ni que los contratos estén libres de defectos.

## Interfaz y accesibilidad

- La suite de navegador recorrió las rutas nuevas (`preparar`, `taller`, `taller/3`, `taller/5`, `publicar`) junto con las existentes en 320, 390, 768, 1440, 1920 y 2560 px, sin desbordamiento horizontal ni infracciones de axe (WCAG 2 A/AA, 2.1 AA y 2.2 AA).
- `devbrain web-audit` revisó seis rutas en temas claro y oscuro (48 capturas): 0 infracciones de axe, 0 bloqueos y 0 desbordamientos. Informó 12 casos de «foco no visible», todos del campo de búsqueda. El campo muestra el foco en su contenedor mediante `.search-form:focus-within` (contorno de 3 px); se registra como falso positivo de la herramienta.
- La auditoría estática de composición de texto revisó 12 archivos y no encontró hallazgos.

## Defectos encontrados y corregidos durante la validación

1. **Rutas internas ocultas al cambiar el hash.** Al escribir la URL o usar el historial para ir a una ruta como `#lab/evm` o `#taller/3`, el enrutador del SDK intentaba mostrarla como página y ocultaba todas. Afectaba también a los laboratorios existentes. Los enlaces de la página no lo provocaban porque el lector los intercepta. La guía ahora restaura la página que contiene la ruta (`ensurePageVisible` en `frontend/web/main.js`). Queda pendiente corregirlo en el SDK compartido.
2. **Regiones desplazables sin acceso por teclado.** Los estilos compartidos actualizados hoy hacen que tablas y bloques de código conserven sus líneas y se desplacen en horizontal (regla 7.4). Los bloques de código ahora son regiones enfocables con nombre accesible, y `navigation/scroll-regions.mjs` agrega al orden de tabulación las tablas y los resultados solo mientras se desplazan.
3. **Contraste del informe del Portafolio.** Los subtítulos y la insignia «pendiente» del SDK no alcanzaban el contraste mínimo. La guía los ajusta en `styles.css`.
4. **Pérdida de la cobertura global.** El `c8` anidado de la prueba del taller tomaba por omisión el directorio temporal de la compuerta global y lo limpiaba. Ahora recibe un `--temp-directory` propio.
5. **Alineación de la prosa.** La prueba de navegador exigía justificación en todos los anchos; la regla 7.4 exige alineación inicial en regiones menores de 40rem. La prueba ahora espera a que `devbrain-prose.js` recalcule la alineación y la compara con esa regla.

## Pendiente

- Ejecutar la integración continua en GitHub Actions cuando el repositorio tenga remoto.
- Corregir en el SDK compartido el manejo de rutas internas del enrutador.
- Evaluación humana con aprendices y con lectores de pantalla; las comprobaciones automáticas no certifican por sí solas la facilidad de uso ni la conformidad completa con WCAG 2.2.
- Comprobar en un VPS real la construcción de `frontend/Dockerfile` con Coolify; localmente solo se validó de forma estática, porque Docker no se ejecuta en esta PC.
