// Etapas 4 a 6 del taller: oráculo firmado, indexador SQL y recorrido completo en tres capas.
export const etapa4 = {
  numero: 4,
  titulo: 'Oráculo con firmas criptográficas y control de repetición',
  modulo: 'm4',
  minutos: 60,
  labs: ['signatures', 'pipeline'],
  evidencia: 'MG-A04',
  objetivo: 'Inspeccionar cómo un oráculo firma datos externos mediante criptografía asimétrica ECDSA, rechaza alteraciones y neutraliza ataques de repetición con nonces.',
  lenguajes: 'JavaScript con ethers.js',
  archivos: [
    ['src/oraculo.js', 'Inspecciona firmarLectura(), crearVerificador() y procesarLectura().'],
    ['test/etapa-4.oraculo.test.js', 'Siete pruebas que verifican firmas válidas, datos alterados, suplantación y repeticiones.'],
  ],
  conceptos: '<p><strong>¿Dónde se guardan los datos en esta etapa?</strong></p><ul><li><strong>Fuera de la cadena (Off-Chain):</strong> La lectura original del sensor y la firma criptográfica residen en paquetes de datos transferidos por API. No tocan la blockchain hasta que superan todas las validaciones.</li><li><strong>En memoria del verificador:</strong> Un conjunto de identificadores únicos (<code>Set</code> de nonces) almacena las lecturas ya procesadas para evitar ataques de repetición.</li></ul><p><strong>Criptografía asimétrica y no repudio:</strong> Una firma digital demuestra matemáticamente dos verdades:</p><ol><li><strong>Autenticidad del origen:</strong> Quién firmó el mensaje (poseedor de la clave privada correspondiente a la dirección pública del oráculo).</li><li><strong>Integridad del contenido:</strong> Que ni un solo carácter ni decimal de la medición física fue modificado tras ser firmado.</li></ol><p>Si un intermediario malicioso altera la temperatura (por ejemplo, de 8 °C a 3.5 °C para fingir calidad), el hash criptográfico cambia por completo y la función <code>verifyMessage()</code> recupera una dirección distinta, lanzando el error <code>FIRMA_INVALIDA</code>.</p>',
  pasos: [
    'Abre <code>src/oraculo.js</code> y revisa la función <code>contenidoFirmado()</code>: observa cómo serializa las propiedades en orden fijo para garantizar determinismo.',
    'Analiza <code>crearVerificador()</code>: identifica cómo recupera la dirección pública con <code>verifyMessage()</code> y comprueba el <code>Set</code> de nonces.',
    'Revisa <code>procesarLectura()</code>: verifica que solo cuando el dictamen es favorable se envía la transacción a la red, evitando pagos de gas en lotes rechazados.',
    'Ejecuta <code>npm run etapa:4</code> en PowerShell: verás pasar las siete pruebas automatizadas de verificación de firmas y rechazos.',
    'Abre el laboratorio Firma de datos en la guía web y experimenta visualmente alterando el texto o repitiendo el paquete.',
  ],
  codigo: [
    { titulo: 'Verificación criptográfica y control de nonce (src/oraculo.js)', texto: "const recuperada = verifyMessage(contenidoFirmado(paquete.lectura), paquete.firma);\nif (recuperada.toLowerCase() !== direccionOraculo.toLowerCase()) {\n  throw errorOraculo('FIRMA_INVALIDA', 'La firma no corresponde al oráculo registrado o la lectura cambió.');\n}\nif (usados.has(paquete.lectura.nonce)) {\n  throw errorOraculo('LECTURA_REPETIDA', 'Esta lectura ya se procesó. Genera una lectura nueva.');\n}\nusados.add(paquete.lectura.nonce);" },
    { titulo: 'Transacción condicionada por la regla de negocio (src/oraculo.js)', texto: 'const dictamen = evaluarLectura(lectura);\nif (!dictamen.aprobada) return { ...dictamen, txHash: null };\nconst tx = await contrato.autorizarPago(lectura.idLote, productor, monto);\nconst recibo = await tx.wait();\nreturn { ...dictamen, txHash: recibo.hash };' },
  ],
  comprobar: {
    comando: 'npm run etapa:4',
    antes: null,
    despues: '  Etapa 4 · Oráculo firmado\n    √ firma siempre el mismo texto para la misma lectura\n    √ acepta una lectura firmada por el oráculo registrado\n    √ rechaza una lectura alterada después de firmar\n    √ rechaza una lectura firmada por otra cuenta\n    √ rechaza repetir la misma lectura\n    √ autoriza el pago en el contrato cuando la lectura cumple\n    √ no envía transacción cuando la lectura no cumple\n\n  7 passing',
  },
  siFalla: [
    ['Error: FIRMA_INVALIDA', 'Si experimentaste modificando campos, asegúrate de firmar nuevamente el paquete con la clave del oráculo.'],
  ],
  evidenciaTexto: 'Registra los tres escenarios de prueba (paquete íntegro, lectura alterada y paquete repetido) en la tabla del bloque 1 · Observa de MG-A04. En el bloque 2, explica por qué una firma válida por sí sola no autoriza el pago si la regla de calidad rechaza el producto.',
};

export const etapa5 = {
  numero: 5,
  titulo: 'Indexador de eventos y proyección SQL (Patrón CQRS)',
  modulo: 'm5',
  minutos: 60,
  labs: ['database'],
  evidencia: 'MG-A05',
  objetivo: 'Inspeccionar cómo un indexador copia eventos de la cadena hacia una tabla relacional en PostgreSQL sin duplicados y con capacidad de reconstrucción total.',
  lenguajes: 'JavaScript y SQL',
  archivos: [
    ['src/indexador.js', 'Inspecciona aEvento(), leerEventos(), sincronizar() y reconstruir().'],
    ['src/repositorio-memoria.js', 'Proyección en memoria con clave única `${txHash}:${logIndex}` (nivel mínimo).'],
    ['sql/001_proyeccion.sql', 'Tabla eventos_agropay con restricción UNIQUE (tx_hash, log_index).'],
    ['src/repositorio-postgres.js', 'Inserción idempotente con INSERT … ON CONFLICT DO NOTHING (nivel completo).'],
    ['test/etapa-5.indexador.test.js', 'Pruebas que validan deduplicación, esquema y reconstrucción.'],
  ],
  conceptos: '<p><strong>¿Dónde se guardan los datos en esta etapa?</strong></p><ul><li><strong>Capa 3: Base de Datos Relacional (PostgreSQL):</strong> La tabla <code>eventos_agropay</code> almacena una proyección de solo lectura optimizada para búsquedas rápidas, filtros por fecha, agregaciones estadísticas y dashboards de usuario.</li></ul><p><strong>¿Por qué no consultar directamente la Blockchain?</strong> La EVM no está indexada para consultas complejas (como <code>SELECT * FROM pagos WHERE fecha > X</code>): leer históricos en la cadena es lento, costoso y sobrecarga el nodo RPC. Por eso la industria adopta la arquitectura <strong>CQRS (Command Query Responsibility Segregation)</strong>:</p><ol><li><strong>Escritura (Commands):</strong> Las transacciones y mutaciones de verdad ocurren en el contrato inteligente en la cadena.</li><li><strong>Lectura (Queries):</strong> El indexador lee los eventos emitidos por los bloques y los proyecta a PostgreSQL.</li><li><strong>Idempotencia:</strong> La restricción <code>UNIQUE (tx_hash, log_index)</code> garantiza que si el indexador se reinicia o reprocesa bloques pasados, la base de datos no duplique registros.</li><li><strong>Reconstrucción total:</strong> Si la base de datos se borra o corrompe por completo, se vacía y se reconstruye al 100 % desde el bloque cero de la blockchain sin perder un solo registro legítimo.</li></ol>',
  pasos: [
    'Abre <code>sql/001_proyeccion.sql</code> y revisa la definición de <code>eventos_agropay</code>, notando la clave única compuesta <code>(tx_hash, log_index)</code> y el tipo <code>NUMERIC(78, 0)</code> para montos en wei.',
    'Abre <code>src/indexador.js</code> y analiza cómo <code>sincronizar()</code> lee los logs filtrados por bloque y cómo <code>reconstruir()</code> vacía la tabla y vuelve a poblarla.',
    'Abre <code>src/repositorio-postgres.js</code> y revisa la cláusula <code>ON CONFLICT (tx_hash, log_index) DO NOTHING</code>.',
    'Ejecuta <code>npm run etapa:5</code> en PowerShell: en el nivel mínimo verás pasar las seis pruebas en memoria con las de PostgreSQL omitidas.',
    'Si tienes el nivel completo con PostgreSQL configurado, define <code>TALLER_DATABASE_URL</code> y ejecuta para ver pasar las nueve pruebas con la base de datos real.',
  ],
  codigo: [
    { titulo: 'Inserción idempotente sin duplicados (sql/001_proyeccion.sql)', texto: "INSERT INTO eventos_agropay (tx_hash, log_index, bloque, tipo, id_lote, cuenta, monto_wei)\nVALUES ($1, $2, $3, $4, $5, $6, $7)\nON CONFLICT (tx_hash, log_index) DO NOTHING;" },
    { titulo: 'Sincronización incremental (src/indexador.js)', texto: 'const eventos = await leerEventos(contrato, desdeBloque);\nlet nuevos = 0;\nfor (const evento of eventos) {\n  if (await repositorio.guardarEvento(evento)) nuevos += 1;\n}\nreturn { leidos: eventos.length, nuevos };' },
  ],
  comprobar: {
    comando: 'npm run etapa:5',
    antes: null,
    despues: '  Etapa 5 · Indexador de eventos\n    √ lee solo los eventos desde el bloque indicado\n    repositorio en memoria (nivel mínimo)\n      √ guarda los tres eventos con sus datos\n      √ no duplica eventos al sincronizar otra vez\n      √ reconstruye la proyección con los mismos registros\n    conexión a PostgreSQL\n      √ exige la URL en el entorno y valida el esquema\n      √ la tabla impide duplicados por transacción e índice de evento\n    repositorio PostgreSQL (nivel completo)\n      Nivel completo omitido: define TALLER_DATABASE_URL para probar con PostgreSQL.\n      - guarda los tres eventos con sus datos\n      - no duplica eventos al sincronizar otra vez\n      - reconstruye la proyección con los mismos registros\n\n  6 passing\n  3 pending',
    nota: 'En el nivel completo con <code>TALLER_DATABASE_URL</code> definida, las nueve pruebas pasan mostrando <code>9 passing</code>.',
  },
  siFalla: [
    ['ECONNREFUSED 127.0.0.1:5432 o 5434', 'PostgreSQL no está en ejecución. Abre Servicios de Windows y verifica que el servicio esté iniciado.'],
    ['password authentication failed', 'La contraseña en TALLER_DATABASE_URL no coincide con el usuario configurado en PostgreSQL.'],
  ],
  evidenciaTexto: 'En el bloque 2 · Explica de MG-A05, demuestra que sincronizar dos veces seguidas no aumenta el número de registros y que vaciar la tabla y reconstruirla recupera todos los eventos.',
};

export const etapa6 = {
  numero: 6,
  titulo: 'Recorrido completo e inspección en tres capas',
  modulo: 'm6',
  minutos: 30,
  labs: ['architecture', 'pipeline'],
  evidencia: null,
  objetivo: 'Integrar los componentes en un flujo verificable de extremo a extremo e inspeccionar en vivo el almacenamiento en las tres capas.',
  lenguajes: 'JavaScript',
  archivos: [
    ['src/recorrido.js', 'Inspecciona recorrerFlujo() y resumenMarkdown().'],
    ['scripts/demo.js', 'Ejecuta el flujo completo y genera evidencia-taller.md.'],
    ['scripts/inspeccionar-estado.js', 'Imprime en consola el desglose detallado de las tres capas de almacenamiento.'],
    ['scripts/probar-seguridad.js', 'Ejecuta los cuatro experimentos de seguridad frente a ataques comunes.'],
    ['test/etapa-6.recorrido.test.js', 'Pruebas de integración del flujo aprobado, rechazado e inspecciones.'],
  ],
  conceptos: '<p><strong>El flujo completo de extremo a extremo:</strong></p><ol><li><strong>Captura y Firma:</strong> El sensor registra mediciones físicas y las firma con la clave privada del oráculo.</li><li><strong>Validación Desacoplada:</strong> El verificador comprueba la firma ECDSA y el nonce único; el motor de reglas evalúa la calidad.</li><li><strong>Transacción en Cadena:</strong> Si aprueba, el oráculo envía la transacción. El contrato actualiza su storage (<code>garantiaDisponible</code> y <code>saldoPendiente</code>) y emite el evento <code>PagoAutorizado</code>.</li><li><strong>Retiro Seguro:</strong> El productor retira sus fondos mediante el patrón Checks-Effects-Interactions, emitiendo <code>PagoRetirado</code>.</li><li><strong>Proyección Relacional:</strong> El indexador sincroniza los eventos hacia PostgreSQL, dejándolos listos para que cualquier interfaz web o API REST los consulte al instante.</li></ol>',
  pasos: [
    'Abre <code>src/recorrido.js</code> e inspecciona cómo se encadenan el despliegue, el depósito, la firma, la autorización, el retiro y la sincronización.',
    'Ejecuta <code>npm run etapa:6</code> en PowerShell: verás pasar las cuatro pruebas que certifican la integración de todas las capas.',
    'Ejecuta <code>npm run demo</code>: se ejecutará el recorrido de práctica y se creará el archivo <code>evidencia-taller.md</code> en la carpeta de tu proyecto.',
    'Ejecuta <code>npm run inspeccionar:estado</code>: observa en la terminal el reporte en vivo que muestra qué vive en EVM Storage, qué en Logs de Bloque y qué en la tabla SQL.',
    'Ejecuta <code>npm run probar:seguridad</code>: comprueba cómo se neutralizan los 4 ataques cibernéticos más comunes.',
    'Ejecuta <code>npm test</code> para verificar todas las suites del taller juntas de una sola vez.',
  ],
  codigo: [
    { titulo: 'Inspeccionar almacenamiento en 3 capas', texto: 'npm run inspeccionar:estado' },
    { titulo: 'Ejecutar experimentos de seguridad', texto: 'npm run probar:seguridad' },
    { titulo: 'Generar evidencia del recorrido', texto: 'npm run demo' },
    { titulo: 'Ejecutar suite completa de pruebas', texto: 'npm test' },
  ],
  comprobar: {
    comando: 'npm run etapa:6\nnpm run demo',
    antes: null,
    despues: '  Etapa 6 · Recorrido completo\n    √ lleva una lectura aprobada hasta el pago y la proyección\n    √ detiene el recorrido cuando la lectura no cumple\n    √ el script de demostración guarda el resumen para el Portafolio\n    √ el script de inspección de almacenamiento en tres capas se ejecuta correctamente\n\n  4 passing\n\n# Evidencia del taller AgroPay\n\n- Contrato: `0x5FbDB2315678afecb367f032d93F642f64180aa3`\n- Dictamen: aprobada\n- Autorización: 0x…\n- Retiro: 0x…\n- Eventos leídos: 3; nuevos en la proyección: 3\n\n| Bloque | Tipo | Cuenta | Monto (wei) |\n|---|---|---|---|\n| 2 | GarantiaDepositada | `0xf39F…2266` | 2000000000000000000 |\n| 3 | PagoAutorizado | `0x3C44…93BC` | 1000000000000000000 |\n| 4 | PagoRetirado | `0x3C44…93BC` | 1000000000000000000 |',
  },
  siFalla: [
    ['Fallo en la prueba de PostgreSQL', 'Si no tienes PostgreSQL activo, recuerda que la etapa funciona al 100 % en memoria para el nivel mínimo.'],
  ],
  evidenciaTexto: 'Pega el resumen de <code>npm test</code> y el contenido de <code>evidencia-taller.md</code> en el bloque 1 · Observa de MG-A05. Conserva también el reporte de <code>npm run inspeccionar:estado</code> para tu Portafolio.',
};
