// Módulo 5: el contenido enseña lo que pide MG-A05 (pruebas y cobertura, sincronizar dos veces,
// un fallo provocado y pasos de reproducción) y cada dato citado coincide con el código del taller y del aula.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { simulateLab, PC_COMMANDS } from '../../frontend/web/labs/simulation.mjs';

const require = createRequire(import.meta.url);
const { schema: ESQUEMA_AULA } = require('../../backend/persistence/schema.cjs');
const leer = archivo => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
const m5 = modules.find(module => module.id === 'm5');
const [comprende, ejemplo, practica, aplica] = m5.steps.map(step => step.body);
const todo = m5.steps.map(step => step.body).join('\n');
const sinEtiquetas = html => html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const tablas = html => [...html.matchAll(/<div class="table-scroll"><table>([\s\S]*?)<\/table><\/div>/g)].map(match => match[1]);
const INDEXADOR = leer('taller/solucion/src/indexador.js');
const SQL = leer('taller/solucion/sql/001_proyeccion.sql');
const PRUEBAS_ETAPA_5 = leer('taller/solucion/test/etapa-5.indexador.test.js');
const PRUEBAS_ETAPA_1 = leer('taller/solucion/test/etapa-1.reglas.test.js');
const SCRIPTS_TALLER = JSON.parse(leer('taller/solucion/package.json')).scripts;

// Carga reglas.js con otro límite, como hace el aprendiz al provocar el fallo.
function reglasCon(temperaturaMaxima) {
  const fuente = leer('taller/solucion/src/reglas.js').replace('temperaturaMaxima: 4,', `temperaturaMaxima: ${temperaturaMaxima},`);
  const modulo = { exports: {} };
  new Function('module', 'exports', fuente)(modulo, modulo.exports);
  return modulo.exports;
}

test('el módulo 5 conserva su estructura y dedica 90 minutos', () => {
  assert.deepEqual(m5.steps.map(step => step.title), ['Comprende', 'Revisa el ejemplo', 'Practica', 'Aplica']);
  assert.equal(m5.minutes, 90);
  assert.deepEqual(m5.labs, ['pc', 'database', 'audit']);
  assert.equal(m5.evidence, 'MG-A05');
});

test('Comprende relaciona niveles de prueba, proyección, idempotencia y cobertura', () => {
  for (const titulo of ['Tres niveles de prueba en el taller', 'Por qué la cadena no es la base de consultas', 'Idempotencia', 'Qué mide la cobertura']) {
    assert.match(comprende, new RegExp(`<h3>${titulo}`), titulo);
  }
  const niveles = tablas(comprende).find(item => /Unitaria/.test(item) && /Recorrido/.test(item));
  assert.ok(niveles, 'tabla de niveles de prueba');
  for (const archivo of ['etapa-1.reglas.test.js', 'etapa-3.seguridad.test.js', 'etapa-5.indexador.test.js', 'etapa-6.recorrido.test.js']) {
    assert.match(niveles, new RegExp(archivo.replace(/\./g, '\\.')), archivo);
    assert.ok(leer(`taller/solucion/test/${archivo}`).length > 0, archivo);
  }
  assert.doesNotMatch(todo, /menos de 5 ms/, 'no promete tiempos que nadie midió');
  assert.ok(!/<table>/.test(comprende.replace(/<div class="table-scroll"><table>[\s\S]*?<\/table><\/div>/g, '')), 'toda tabla tiene su propio desplazamiento');
});

test('la cobertura citada coincide con el script del taller y advierte el nivel mínimo', () => {
  assert.match(SCRIPTS_TALLER.cobertura, /--check-coverage --functions=100/);
  assert.match(SCRIPTS_TALLER.cobertura, /--include=src\/\*\*\/\*\.js/);
  assert.match(SCRIPTS_TALLER['cobertura:contrato'], /hardhat coverage/);
  const texto = sinEtiquetas(comprende);
  assert.match(texto, /--functions=100/);
  assert.match(comprende, /<code>npm run cobertura:contrato<\/code>/);
  // Sin TALLER_DATABASE_URL, las pruebas de PostgreSQL se omiten y repositorio-postgres.js no se ejecuta.
  assert.match(PRUEBAS_ETAPA_5, /if \(!process\.env\.TALLER_DATABASE_URL\) \{[\s\S]*?this\.skip\(\);/);
  assert.match(texto, /repositorio-postgres\.js/);
  assert.match(texto, /TALLER_DATABASE_URL/);
  assert.match(texto, /does not meet global threshold/);
});

test('la tabla de sincronización repite los resultados de las pruebas de la etapa 5', () => {
  const tabla = tablas(ejemplo).find(item => /Registros en la proyección/.test(item));
  assert.ok(tabla, 'tabla de sincronizaciones');
  for (const resultado of ['{ leidos: 3, nuevos: 3 }', '{ leidos: 3, nuevos: 0 }']) {
    assert.ok(PRUEBAS_ETAPA_5.includes(`deep.equal(${resultado})`), `la etapa 5 ya no espera ${resultado}`);
    assert.ok(sinEtiquetas(tabla).includes(resultado), `falta ${resultado}`);
  }
  assert.match(PRUEBAS_ETAPA_5, /reconstruir\(\{ contrato, repositorio \}\)\)\.to\.deep\.equal\(\{ leidos: 3, nuevos: 3 \}\)/);
  assert.match(PRUEBAS_ETAPA_5, /depositarGarantia\(\{ value: ethers\.parseEther\('2'\) \}\)/);
  assert.match(PRUEBAS_ETAPA_5, /autorizarPago\(5, productor\.address, ethers\.parseEther\('1'\)\)/);
  const texto = sinEtiquetas(ejemplo);
  for (const dato of ['2 ETH', 'lote 5', '1 ETH', 'GarantiaDepositada', 'PagoAutorizado', 'PagoRetirado']) assert.ok(texto.includes(dato), `falta ${dato}`);
});

test('el código de sincronizar() del ejemplo es el del indexador', () => {
  const [, bloque] = ejemplo.match(/<pre><code>(async function sincronizar[\s\S]*?)<\/code><\/pre>/) ?? [];
  assert.ok(bloque, 'el ejemplo muestra sincronizar()');
  for (const linea of bloque.split('\n').map(item => item.trim()).filter(Boolean)) assert.ok(INDEXADOR.includes(linea), `no está en indexador.js: ${linea}`);
  assert.match(ejemplo, /<code>reconstruir\(\)<\/code>/);
  assert.match(INDEXADOR, /await repositorio\.vaciar\(\);\s*return sincronizar\(\{ contrato, repositorio, desdeBloque: 0 \}\)/);
});

test('la deduplicación citada existe en los dos repositorios', () => {
  assert.match(leer('taller/solucion/src/repositorio-memoria.js'), /const clave = `\$\{evento\.txHash\}:\$\{evento\.logIndex\}`/);
  const postgres = leer('taller/solucion/src/repositorio-postgres.js');
  assert.match(postgres, /ON CONFLICT \(tx_hash, log_index\) DO NOTHING/);
  assert.match(postgres, /return resultado\.rowCount === 1;/);
  const texto = sinEtiquetas(ejemplo);
  for (const dato of ['${txHash}:${logIndex}', 'ON CONFLICT (tx_hash, log_index) DO NOTHING', 'rowCount', 'UNIQUE (tx_hash, log_index)']) assert.ok(texto.includes(dato), `falta ${dato}`);
});

test('la tabla eventos_agropay cita cada columna con su tipo real', () => {
  const tabla = tablas(ejemplo).find(item => /eventos_agropay/.test(item) || /monto_wei/.test(item));
  assert.ok(tabla, 'tabla de columnas');
  for (const [columna, tipo] of [['tx_hash', 'CHAR(66)'], ['log_index', 'INTEGER'], ['bloque', 'BIGINT'], ['tipo', 'TEXT'], ['id_lote', 'NUMERIC(78, 0)'], ['cuenta', 'CHAR(42)'], ['monto_wei', 'NUMERIC(78, 0)']]) {
    assert.match(SQL, new RegExp(`${columna}\\s+${tipo.replace(/[()]/g, '\\$&')}`), `${columna} ya no es ${tipo}`);
    const fila = [...tabla.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, f]) => f).find(f => f.includes(`<code>${columna}</code>`));
    assert.ok(fila, `falta la columna ${columna}`);
    assert.ok(fila.includes(tipo), `${columna}: falta el tipo ${tipo}`);
  }
  assert.equal((2n ** 256n - 1n).toString().length, 78, 'un uint256 tiene hasta 78 dígitos');
  assert.match(sinEtiquetas(tabla), /78 dígitos/);
});

test('la comparación con el aula usa el esquema real de PostgreSQL del laboratorio', () => {
  assert.match(ESQUEMA_AULA, /PRIMARY KEY\(deployment_id,tx_hash,log_index\)/);
  for (const tabla of ['guide_events', 'guide_projections']) assert.match(ESQUEMA_AULA, new RegExp(`CREATE TABLE IF NOT EXISTS ${tabla}`));
  const store = leer('backend/persistence/event-store.cjs');
  assert.match(store, /DELETE FROM guide_projections WHERE deployment_id=\$1/);
  assert.match(store, /async function readPosition/);
  assert.match(leer('taller/solucion/hardhat.config.js'), /chainId: 31337/);
  const comparacion = tablas(ejemplo).find(item => /deployment_id/.test(item));
  assert.ok(comparacion, 'tabla comparativa taller y aula');
  for (const dato of ['guide_events', 'guide_projections', 'PRIMARY KEY (deployment_id, tx_hash, log_index)', 'UNIQUE (tx_hash, log_index)']) assert.ok(sinEtiquetas(comparacion).includes(dato), dato);
  assert.match(sinEtiquetas(ejemplo), /31337/);
});

test('el fallo provocado describe lo que ocurre al cambiar el límite de temperatura', () => {
  const original = reglasCon(4);
  const cambiada = reglasCon(3);
  assert.equal(original.evaluarLectura({ temperatura: 3.5, acidez: 16 }).aprobada, true);
  const rechazo = cambiada.evaluarLectura({ temperatura: 3.5, acidez: 16 });
  assert.equal(rechazo.aprobada, false);
  const texto = sinEtiquetas(todo);
  assert.ok(texto.includes(rechazo.motivos[0]), `falta el motivo: ${rechazo.motivos[0]}`);
  assert.ok(texto.includes(cambiada.evaluarLectura({ temperatura: 9, acidez: 16 }).motivos[0]));
  // Las pruebas que fallan comparan con valores fijos; las que leen LIMITES siguen pasando.
  for (const titulo of ['aprueba una lectura dentro de los límites del ejercicio', 'rechaza una temperatura alta y explica el motivo', 'acepta los valores exactos de los límites']) {
    assert.ok(PRUEBAS_ETAPA_1.includes(`it('${titulo}'`), titulo);
    assert.ok(texto.includes(`«${titulo}»`), `no se cita «${titulo}»`);
  }
  assert.match(PRUEBAS_ETAPA_1, /temperatura: LIMITES\.temperaturaMaxima/);
  assert.match(texto, /temperaturaMaxima/);
  assert.match(texto, /4 aprobadas y 2 fallidas|4 passing y 2 failing|4 passing/);
});

test('la evidencia de npm run demo coincide con resumenMarkdown', () => {
  const recorrido = leer('taller/solucion/src/recorrido.js');
  for (const linea of ['# Evidencia del taller AgroPay', '- Dictamen: ', '- Eventos leídos: ', '; nuevos en la proyección: ']) assert.ok(recorrido.includes(linea), linea);
  assert.match(leer('taller/solucion/scripts/demo.js'), /path\.join\(process\.cwd\(\), 'evidencia-taller\.md'\)/);
  const texto = sinEtiquetas(practica);
  assert.match(texto, /evidencia-taller\.md/);
  assert.match(texto, /Eventos leídos: 3; nuevos en la proyección: 3/);
  assert.match(texto, /Dictamen: aprobada/);
});

test('las prácticas del entorno y de PostgreSQL coinciden con la simulación y el servidor', () => {
  const texto = sinEtiquetas(practica);
  for (const [tarea, comandos] of Object.entries(PC_COMMANDS)) {
    assert.deepEqual(simulateLab('pc', { task: tarea }).result.commands, comandos);
    for (const comando of comandos.filter(item => item.startsWith('npx'))) assert.ok(texto.includes(comando), `falta ${comando}`);
  }
  assert.ok(texto.includes(simulateLab('pc', { task: 'test' }).result.explanation));
  assert.ok(texto.includes(simulateLab('database', { action: 'sync' }).result.explanation));
  const execute = leer('backend/labs/execute.cjs');
  assert.match(execute, /'Despliega los contratos antes de sincronizar la base\.'/);
  assert.match(texto, /Despliega los contratos antes de sincronizar la base\./);
});

test('cada función citada existe en el indexador, los repositorios o las reglas', () => {
  const fuentes = [INDEXADOR, leer('taller/solucion/src/repositorio-memoria.js'), leer('taller/solucion/src/repositorio-postgres.js'), leer('taller/solucion/src/reglas.js'), leer('taller/solucion/src/recorrido.js'), leer('taller/solucion/contracts/GarantiaAgroPay.sol')].join('\n');
  const funciones = [...todo.matchAll(/<code>([a-z][A-Za-z]+)\(\)<\/code>/g)].map(([, nombre]) => nombre);
  for (const nombre of ['sincronizar', 'reconstruir', 'guardarEvento', 'evaluarLectura']) assert.ok(funciones.includes(nombre), `no se cita ${nombre}()`);
  for (const nombre of new Set(funciones)) assert.match(fuentes, new RegExp(`(function ${nombre}\\(|async ${nombre}\\()`), `${nombre}() no existe`);
});

test('cada comando citado existe en el taller o en la guía', () => {
  const scripts = { ...SCRIPTS_TALLER, ...JSON.parse(leer('package.json')).scripts };
  const comandos = [...todo.matchAll(/npm run ([a-z0-9:-]+)/g)].map(([, nombre]) => nombre);
  for (const nombre of ['etapa:1', 'etapa:5', 'cobertura', 'demo']) assert.ok(comandos.includes(nombre), `no se cita npm run ${nombre}`);
  for (const nombre of comandos) assert.ok(scripts[nombre], `npm run ${nombre} no existe`);
  assert.match(todo, /npm test/);
});

test('Practica guía cada laboratorio, el taller y el fallo con predicción, ejecución y anotación', () => {
  // La etapa 6 pertenece al módulo 6; aquí solo se ejecuta su demostración.
  for (const destino of [...m5.labs.map(lab => `#lab/${lab}`), '#taller/5']) assert.ok(practica.includes(`href="${destino}"`), destino);
  assert.equal([...practica.matchAll(/<strong>Predice:<\/strong>/g)].length, 4);
  assert.equal([...practica.matchAll(/<strong>Ejecuta:<\/strong>/g)].length, 4);
  assert.equal([...practica.matchAll(/<strong>Anota:<\/strong>/g)].length, 4);
  assert.match(practica, /<h3>Errores frecuentes al verificar<\/h3>/);
});

test('Practica cierra con preguntas de autoevaluación que se abren con teclado', () => {
  assert.match(practica, /<h3>Comprueba lo que aprendiste<\/h3>/);
  const preguntas = [...practica.matchAll(/<details><summary>([^<]+)<\/summary>([\s\S]*?)<\/details>/g)];
  assert.ok(preguntas.length >= 5, `solo hay ${preguntas.length} preguntas`);
  for (const [, pregunta, respuesta] of preguntas) {
    assert.match(pregunta, /^¿[^?]+\?$/, `pregunta mal formada: ${pregunta}`);
    assert.ok(sinEtiquetas(respuesta).trim().length > 60, `respuesta corta: ${pregunta}`);
  }
});

test('Aplica sigue breve y orienta a sus fuentes', () => {
  assert.match(aplica, /<h2>MG-A05 · Cierre técnico reproducible<\/h2>/);
  assert.ok(sinEtiquetas(aplica).length < 900, 'la ficha completa vive en la estación');
  for (const destino of ['#taller/5', '#taller/6']) assert.ok(aplica.includes(`href="${destino}"`), destino);
  for (const comando of ['npm test', 'npm run cobertura', 'npm run demo']) assert.ok(aplica.includes(comando), comando);
});
