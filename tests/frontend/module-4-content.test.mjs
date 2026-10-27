// Módulo 4: el contenido enseña lo que pide MG-A04 (tres escenarios del oráculo, por qué la firma
// no basta y quién custodia la clave) y cada código, cifra y comando citado coincide con el código.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { simulateLab } from '../../frontend/web/labs/simulation.mjs';
import { evaluateMilk } from '../../frontend/web/labs/rules.mjs';

const require = createRequire(import.meta.url);
const { evaluarLectura } = require('../../taller/solucion/src/reglas.js');
const { contenidoFirmado } = require('../../taller/solucion/src/oraculo.js');
const { pipelineStages } = require('../../backend/labs/pipeline.cjs');
const leer = archivo => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
const m4 = modules.find(module => module.id === 'm4');
const [comprende, ejemplo, practica, aplica] = m4.steps.map(step => step.body);
const todo = m4.steps.map(step => step.body).join('\n');
const sinEtiquetas = html => html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const tablas = html => [...html.matchAll(/<div class="table-scroll"><table>([\s\S]*?)<\/table><\/div>/g)].map(match => match[1]);
const ORACULO = leer('taller/solucion/src/oraculo.js');
const SEGURIDAD = leer('taller/solucion/scripts/probar-seguridad.js');
const FIRMAS_AULA = leer('backend/security/signatures.cjs');
const PRUEBAS_ETAPA_4 = leer('taller/solucion/test/etapa-4.oraculo.test.js');

test('el módulo 4 conserva su estructura y dedica 90 minutos', () => {
  assert.deepEqual(m4.steps.map(step => step.title), ['Comprende', 'Revisa el ejemplo', 'Practica', 'Aplica']);
  assert.equal(m4.minutes, 90);
  assert.deepEqual(m4.labs, ['signatures', 'pipeline']);
  assert.equal(m4.evidence, 'MG-A04');
});

test('Comprende separa identidad, integridad, repetición, regla y pago', () => {
  for (const titulo of ['Cinco comprobaciones, tres responsables', 'Qué cubre la firma', 'Quién custodia la clave del oráculo']) {
    assert.match(comprende, new RegExp(`<h3>${titulo}`), titulo);
  }
  const tabla = tablas(comprende).find(item => /Quién la responde/.test(item));
  assert.ok(tabla, 'tabla de comprobaciones');
  for (const codigo of ['FIRMA_INVALIDA', 'LECTURA_REPETIDA']) {
    assert.match(tabla, new RegExp(`<code>${codigo}</code>`), codigo);
    assert.match(ORACULO, new RegExp(`errorOraculo\\('${codigo}'`), codigo);
  }
  assert.match(tabla, /<code>LoteYaAutorizado<\/code>/);
  assert.match(tabla, /<code>evaluarLectura<\/code>/);
  assert.match(ORACULO, /verifyMessage\(contenidoFirmado\(paquete\.lectura\), paquete\.firma\)/);
  assert.ok(!/<table>/.test(comprende.replace(/<div class="table-scroll"><table>[\s\S]*?<\/table><\/div>/g, '')), 'toda tabla tiene su propio desplazamiento');
});

test('el texto firmado del ejemplo es el que produce contenidoFirmado', () => {
  const firmado = contenidoFirmado({ nonce: 'n', acidez: 16, temperatura: 3.5, idLote: 1, extra: 'ignorado' });
  assert.equal(firmado, '{"idLote":1,"temperatura":3.5,"acidez":16,"nonce":"n"}');
  assert.ok(sinEtiquetas(comprende).includes(firmado), 'Comprende muestra el texto firmado');
  // Solo cuatro campos entran en la firma: el resto se puede cambiar sin que la verificación lo note.
  assert.deepEqual(Object.keys(JSON.parse(firmado)), ['idLote', 'temperatura', 'acidez', 'nonce']);
  for (const campo of ['idLote', 'temperatura', 'acidez', 'nonce']) assert.match(comprende, new RegExp(`<code>${campo}</code>`), campo);
});

test('la custodia de la clave describe lo que hace el código del taller y del aula', () => {
  const taller = leer('taller/solucion/contracts/GarantiaAgroPay.sol');
  const base = leer('contracts/DineroProgramableBase.sol');
  assert.match(taller, /address public immutable oraculo;/);
  assert.match(base, /function actualizarOraculoIA\(address _nuevoOraculo\) external soloAdmin/);
  assert.match(SEGURIDAD, /const \[, oraculo, , atacante\] = await ethers\.getSigners\(\)/);
  assert.match(FIRMAS_AULA, /generateKeyPairSync\('ec', \{ namedCurve: 'prime256v1' \}\)/);
  const texto = sinEtiquetas(comprende);
  assert.match(texto, /inmutable/);
  assert.match(comprende, /<code>actualizarOraculoIA\(\)<\/code>/);
  assert.match(texto, /cuentas de prueba de Hardhat/);
  assert.match(texto, /Windows Credential Manager/);
});

test('los escenarios del oráculo coinciden con evaluarLectura y con probar-seguridad.js', () => {
  const tabla = tablas(ejemplo).find(item => /¿Se autorizó el pago\?/.test(item));
  assert.ok(tabla, 'tabla de escenarios con las columnas de MG-A04');
  for (const columna of ['Escenario', 'Resultado de la firma', 'Dictamen de la regla']) assert.match(tabla, new RegExp(`<th>${columna}</th>`), columna);
  for (const escenario of ['Paquete íntegro', 'Lectura alterada', 'Paquete repetido', 'Lectura firmada fuera de rango']) assert.match(tabla, new RegExp(escenario), escenario);
  assert.match(SEGURIDAD, /\{ idLote: 201, temperatura: 8\.0, acidez: 16, nonce: 'nonce-exp-1' \}/);
  assert.match(SEGURIDAD, /temperatura: 3\.5 \}/);
  assert.match(SEGURIDAD, /\{ idLote: 202, temperatura: 3\.2, acidez: 15, nonce: 'nonce-exp-2' \}/);
  const texto = sinEtiquetas(tabla);
  for (const dato of ['201', '8 °C', '3,5 °C', '202', '3,2 °C', 'acidez 15']) assert.ok(texto.includes(dato), `falta ${dato}`);
  const fueraDeRango = evaluarLectura({ temperatura: 8, acidez: 16 });
  assert.equal(fueraDeRango.aprobada, false);
  for (const motivo of fueraDeRango.motivos) assert.ok(texto.includes(motivo), `falta el motivo literal: ${motivo}`);
  assert.equal(evaluarLectura({ temperatura: 3.2, acidez: 15 }).aprobada, true);
  assert.match(tabla, /<code>txHash: null<\/code>/);
  assert.match(PRUEBAS_ETAPA_4, /txHash: null/);
});

test('el fragmento de procesarLectura está copiado del taller', () => {
  const [, bloque] = ejemplo.match(/<pre><code>(const lectura = verificador\.verificar[\s\S]*?)<\/code><\/pre>/) ?? [];
  assert.ok(bloque, 'el ejemplo muestra el orden verificar, evaluar, autorizar');
  for (const linea of bloque.split('\n').map(item => item.trim()).filter(Boolean)) assert.ok(ORACULO.includes(linea), `no está en oraculo.js: ${linea}`);
  // El nonce se registra solo cuando la firma ya se comprobó.
  const verificar = ORACULO.slice(ORACULO.indexOf('verificar(paquete)'));
  assert.ok(verificar.indexOf("'FIRMA_INVALIDA'") < verificar.indexOf("'LECTURA_REPETIDA'"));
  assert.ok(verificar.indexOf("'LECTURA_REPETIDA'") < verificar.indexOf('usados.add'));
  assert.match(sinEtiquetas(ejemplo), /solo después de comprobar la firma/);
});

test('la regla reproducible coincide con el puntaje de los laboratorios', () => {
  const [aprobada, rechazada] = [evaluateMilk({ temperature: 3.5, acidity: 16 }), evaluateMilk({ temperature: 8, acidity: 16 })];
  assert.deepEqual([aprobada.score, aprobada.accepted, rechazada.score, rechazada.accepted], [98, true, 58, false]);
  assert.equal(evaluateMilk({ temperature: 4, acidity: 18 }).score, 98);
  assert.equal(evaluateMilk({ temperature: 9, acidity: 20 }).score, 30);
  const texto = sinEtiquetas(ejemplo);
  for (const dato of ['60 puntos', '20', '38 puntos', '10', 'puntaje ≥ 90', '98 puntos', '58']) assert.ok(texto.includes(dato), `falta ${dato}`);
});

test('las dos implementaciones de la firma citan los códigos reales', () => {
  const tabla = tablas(ejemplo).find(item => /Laboratorio Firma de datos/.test(item));
  assert.ok(tabla, 'tabla comparativa de las firmas');
  for (const codigo of ['SIGNATURE_INVALID', 'SIGNATURE_REPLAY', 'SIGNATURE_EXPIRED', 'DEVICE_UNKNOWN']) {
    assert.match(tabla, new RegExp(`<code>${codigo}</code>`), codigo);
    assert.match(FIRMAS_AULA, new RegExp(`failure\\('${codigo}'`), codigo);
  }
  for (const codigo of ['FIRMA_INVALIDA', 'LECTURA_REPETIDA']) assert.match(tabla, new RegExp(`<code>${codigo}</code>`), codigo);
  assert.match(FIRMAS_AULA, /age > 300000/);
  assert.match(sinEtiquetas(tabla), /cinco minutos/);
  assert.match(FIRMAS_AULA, /algorithm: 'ECDSA-P256-SHA256'/);
  assert.match(tabla, /ECDSA-P256-SHA256/);
  assert.match(ORACULO, /firmante\.signMessage/);
  assert.match(tabla, /<code>signMessage<\/code>/);
  for (const campo of ['deviceId', 'issuedAt']) {
    assert.match(tabla, new RegExp(`<code>${campo}</code>`), campo);
    assert.match(FIRMAS_AULA, new RegExp(`${campo}: envelope\\.${campo}`), campo);
  }
});

test('las etapas del flujo coinciden con las del laboratorio real', () => {
  const etapas = pipelineStages({ payload: {}, signature: '', publicKey: '', nonce: '' }, {}, { approved: false, score: 58, receipts: [] }, { status: 'indexed' });
  assert.deepEqual(etapas.map(etapa => etapa.label), ['Captura', 'Firma', 'Verificación', 'Evaluación', 'Transacción', 'Indexación']);
  const flujo = ejemplo.match(/<ol class="flow">([\s\S]*?)<\/ol>/)?.[1] ?? '';
  const pasos = [...flujo.matchAll(/<strong>\d\. ([^<]+)<\/strong>/g)].map(([, nombre]) => nombre);
  assert.deepEqual(pasos, etapas.map(etapa => etapa.label));
  assert.equal(etapas[4].status, 'skipped');
  assert.ok(sinEtiquetas(todo).includes(etapas[4].result.reason), 'cita el motivo de la etapa omitida');
});

test('las prácticas de firma y flujo coinciden con la simulación', () => {
  const valida = simulateLab('signatures', { reading: 4.2 }).result;
  const alterada = simulateLab('signatures', { reading: 4.2, tamper: true }).result;
  const repetida = simulateLab('signatures', { reading: 4.2, replay: true }).result;
  assert.deepEqual([valida.accepted, alterada.accepted, repetida.accepted], [true, false, false]);
  const texto = sinEtiquetas(practica);
  for (const explicacion of [valida.explanation, alterada.explanation, repetida.explanation]) assert.ok(texto.includes(explicacion), `falta: ${explicacion}`);
  // El laboratorio acepta 4,2 °C porque solo comprueba la firma; la regla del taller la rechazaría.
  assert.equal(evaluarLectura({ temperatura: 4.2, acidez: 16 }).aprobada, false);
  assert.match(texto, /4,2 °C/);
  const execute = leer('backend/labs/execute.cjs');
  assert.match(execute, /envelope\.payload\.reading = Number\(envelope\.payload\.reading\) \+ 1/);
  assert.match(texto, /suma 1 a la lectura/);
  const [aprobada, rechazada] = [simulateLab('pipeline', { temperature: 3.5, acidity: 16 }).result, simulateLab('pipeline', { temperature: 9, acidity: 16 }).result];
  assert.deepEqual([aprobada.score, rechazada.score], [98, 58]);
  for (const dato of ['98 puntos', '58 puntos', '9 °C']) assert.ok(texto.includes(dato), dato);
});

test('cada función citada existe en el taller, en el aula o en los contratos', () => {
  const fuentes = [ORACULO, leer('taller/solucion/src/reglas.js'), leer('taller/solucion/src/indexador.js'), leer('taller/solucion/contracts/GarantiaAgroPay.sol'), leer('contracts/DineroProgramableBase.sol')].join('\n');
  const funciones = [...todo.matchAll(/<code>([a-z][A-Za-z]+)\(\)<\/code>/g)].map(([, nombre]) => nombre);
  for (const nombre of ['firmarLectura', 'crearVerificador', 'procesarLectura', 'autorizarPago']) assert.ok(funciones.includes(nombre), `no se cita ${nombre}()`);
  for (const nombre of new Set(funciones)) assert.match(fuentes, new RegExp(`(function ${nombre}\\(|${nombre}\\(paquete\\) \\{)`), `${nombre}() no existe`);
  const errores = [...todo.matchAll(/<code>([A-Z][a-z]+(?:[A-Z][a-z]+)+)<\/code>/g)].map(([, nombre]) => nombre);
  for (const nombre of new Set(errores)) assert.match(fuentes, new RegExp(`(error|event|contract) ${nombre}\\b`), `${nombre} no existe`);
});

test('las pruebas citadas de la etapa 4 existen con ese nombre', () => {
  const citadas = [...todo.matchAll(/«([^»]+)»/g)].map(([, titulo]) => titulo).filter(titulo => PRUEBAS_ETAPA_4.includes(`it('${titulo}'`));
  assert.ok(citadas.length >= 4, `solo cita ${citadas.length} pruebas de la etapa 4`);
});

test('cada comando citado existe en el taller o en la guía', () => {
  const scripts = { ...JSON.parse(leer('taller/solucion/package.json')).scripts, ...JSON.parse(leer('package.json')).scripts };
  const comandos = [...todo.matchAll(/npm run ([a-z0-9:-]+)/g)].map(([, nombre]) => nombre);
  for (const nombre of ['etapa:4', 'probar:seguridad']) assert.ok(comandos.includes(nombre), `no se cita npm run ${nombre}`);
  for (const nombre of comandos) assert.ok(scripts[nombre], `npm run ${nombre} no existe`);
});

test('Practica guía cada laboratorio y la etapa 4 con predicción, ejecución y anotación', () => {
  for (const destino of [...m4.labs.map(lab => `#lab/${lab}`), '#taller/4']) assert.ok(practica.includes(`href="${destino}"`), destino);
  assert.equal([...practica.matchAll(/<strong>Predice:<\/strong>/g)].length, 3);
  assert.equal([...practica.matchAll(/<strong>Ejecuta:<\/strong>/g)].length, 3);
  assert.equal([...practica.matchAll(/<strong>Anota:<\/strong>/g)].length, 3);
  assert.match(practica, /<h3>Errores frecuentes al integrar<\/h3>/);
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
  assert.match(aplica, /<h2>MG-A04 · Validación del oráculo<\/h2>/);
  assert.ok(sinEtiquetas(aplica).length < 900, 'la ficha completa vive en la estación');
  assert.match(aplica, /href="#taller\/4"/);
  assert.match(aplica, /href="#lab\/signatures"/);
});
