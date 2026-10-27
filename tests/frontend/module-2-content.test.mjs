// Módulo 2: el contenido enseña lo que pide MG-A02 (dictamen, responsabilidades,
// fallas y permisos) y cada dato citado coincide con el código del taller y de los laboratorios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { simulateLab, createSimulationState } from '../../frontend/web/labs/simulation.mjs';
import { evaluateHoney, evaluateMilk } from '../../frontend/web/labs/rules.mjs';

const require = createRequire(import.meta.url);
const { evaluarLectura, LIMITES } = require('../../taller/solucion/src/reglas.js');
const leer = archivo => readFileSync(archivo, 'utf8');
const m2 = modules.find(module => module.id === 'm2');
const [comprende, ejemplo, practica, aplica] = m2.steps.map(step => step.body);
const todo = m2.steps.map(step => step.body).join('\n');
const sinEtiquetas = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const CONTRATOS_AULA = readdirSync('contracts').filter(archivo => archivo.endsWith('.sol')).map(archivo => `contracts/${archivo}`);

test('el módulo 2 conserva su estructura y dedica 90 minutos', () => {
  assert.deepEqual(m2.steps.map(step => step.title), ['Comprende', 'Revisa el ejemplo', 'Practica', 'Aplica']);
  assert.equal(m2.minutes, 90);
  assert.deepEqual(m2.labs, ['pharma', 'honey', 'elections']);
});

test('Comprende explica qué es un caso de uso, cómo decidir y qué garantiza la cadena', () => {
  for (const titulo of ['Qué es un caso de uso', 'Cinco preguntas para decidir', 'Qué garantiza la cadena y qué no', 'Compara cinco casos', 'Qué no se guarda en la cadena']) {
    assert.match(comprende, new RegExp(`<h3>${titulo}`), titulo);
  }
  for (const color of ['Verde', 'Amarillo', 'Púrpura']) assert.match(comprende, new RegExp(color), color);
  const tablas = [...comprende.matchAll(/<div class="table-scroll"><table>([\s\S]*?)<\/table><\/div>/g)].map(match => match[1]);
  const casos = tablas.find(tabla => /Dentro y fuera de la cadena/.test(tabla) && /GovTrust/.test(tabla));
  assert.ok(casos, 'tabla de casos dentro de .table-scroll');
  for (const caso of ['Cadena de frío', 'Miel', 'Votación', 'AgroPay', 'GovTrust']) assert.match(casos, new RegExp(caso), caso);
  assert.equal([...casos.matchAll(/<tr>/g)].length, 6, 'encabezado y cinco casos');
  assert.match(comprende, /Ley 1581 de 2012/);
  assert.ok(!/<table>/.test(comprende.replace(/<div class="table-scroll"><table>[\s\S]*?<\/table><\/div>/g, '')), 'toda tabla tiene su propio desplazamiento');
});

test('el diagrama de límites sigue el contrato accesible de las figuras del aula', () => {
  const figuras = [...comprende.matchAll(/<figure class="chain-diagram">([\s\S]*?)<\/figure>/g)].map(match => match[1]);
  assert.equal(figuras.length, 1);
  const [figura] = figuras;
  assert.match(figura, /^<div class="chain-diagram-scroll" tabindex="0" role="region" aria-label="[^"]+"><svg/);
  assert.match(figura, /<svg[^>]*role="img"[^>]*aria-labelledby="m2-[^"]+"/);
  assert.match(figura, /<title id="m2-[^"]+">[^<]{10,}<\/title>/);
  assert.match(figura, /<desc id="m2-[^"]+">[^<]{40,}<\/desc>/);
  assert.match(figura, /<figcaption>[^<]{20,}/);
  assert.doesNotMatch(figura, /fill="#|stroke="#|bad-card/, 'los colores salen de styles.css y funcionan en tema oscuro');
  for (const pieza of ['Captura', 'Verificación', 'Regla', 'Contrato', 'Indexador', 'PostgreSQL']) assert.match(figura, new RegExp(pieza), pieza);
});

test('las funciones y errores de Solidity citados existen en GarantiaAgroPay', () => {
  // El ejemplo cita el contrato del taller y, en «Del caso al contrato», los del aula.
  const contrato = [leer('taller/solucion/contracts/GarantiaAgroPay.sol'), ...CONTRATOS_AULA.map(leer)].join('\n');
  // Funciones del contrato (con paréntesis) y errores o eventos en PascalCase citados en el ejemplo.
  const funciones = [...ejemplo.matchAll(/<code>(depositarGarantia|autorizarPago|retirar)\(\)<\/code>/g)].map(([, nombre]) => nombre);
  const errores = [...ejemplo.matchAll(/<code>([A-Z][a-z]+(?:[A-Z][a-z]+)+)<\/code>/g)].map(([, nombre]) => nombre);
  const citados = new Set([...funciones, ...errores]);
  for (const nombre of ['depositarGarantia', 'autorizarPago', 'retirar', 'SoloOraculo', 'LoteYaAutorizado', 'FondosInsuficientes', 'SinSaldoPendiente']) {
    assert.ok(citados.has(nombre), `el ejemplo no cita ${nombre}`);
  }
  for (const nombre of citados) assert.match(contrato, new RegExp(`(function|error|event|contract) ${nombre}\\b`), `${nombre} no existe en el contrato`);
});

test('el dictamen trazado coincide con evaluarLectura de la etapa 1', () => {
  const aprobada = evaluarLectura({ temperatura: 3.5, acidez: 16 });
  const rechazada = evaluarLectura({ temperatura: 9, acidez: 16 });
  assert.equal(aprobada.aprobada, true);
  assert.equal(rechazada.aprobada, false);
  const texto = sinEtiquetas(ejemplo);
  for (const motivo of rechazada.motivos) assert.ok(texto.includes(motivo), `falta el motivo literal: ${motivo}`);
  assert.match(texto, new RegExp(`máximo de ${LIMITES.temperaturaMaxima} °C`));
  assert.match(texto, new RegExp(`${LIMITES.acidezMinima} a ${LIMITES.acidezMaxima}`));
});

test('los umbrales de los laboratorios citados coinciden con la simulación', () => {
  const estado = createSimulationState();
  const lectura = temperature => simulateLab('pharma', { batchId: 'LOTE-01', temperature }, estado).result.quarantined;
  assert.deepEqual([lectura(4.2), lectura(9), lectura(4)], [false, true, true], 'la cuarentena no se levanta');
  assert.equal(simulateLab('pharma', { batchId: 'LOTE-02', temperature: 8 }, estado).result.quarantined, false, '8 °C está dentro del rango');
  assert.match(todo, /2 a 8 °C/);
  assert.equal(evaluateHoney({ humidity: 17.2, hmf: 14, deltaC13: -26.4 }).accepted, true);
  assert.equal(evaluateHoney({ humidity: 22, hmf: 14, deltaC13: -26.4 }).reasons.length, 1);
  assert.equal(evaluateHoney({ humidity: 22, hmf: 14, deltaC13: -20 }).reasons.length, 2);
  assert.match(practica, /22 %/);
  assert.match(practica, /−20|-20/);
  assert.match(sinEtiquetas(todo), /humedad[^.]*20 %/i);
  assert.match(sinEtiquetas(todo), /40 mg\/kg/);
});

test('la tabla de fallas cubre red, PostgreSQL, lecturas, firmas y sensor con mecanismos reales', () => {
  const tabla = [...ejemplo.matchAll(/<div class="table-scroll"><table>([\s\S]*?)<\/table><\/div>/g)].map(match => match[1]).find(item => /Cómo se recupera/.test(item));
  assert.ok(tabla, 'tabla de fallas con su columna de recuperación');
  for (const falla of [/red|RPC/, /PostgreSQL/, /LECTURA_REPETIDA/, /FIRMA_INVALIDA/, /sensor/i]) assert.match(tabla, falla);
  const oraculo = leer('taller/solucion/src/oraculo.js');
  for (const codigo of ['LECTURA_REPETIDA', 'FIRMA_INVALIDA']) assert.match(oraculo, new RegExp(`'${codigo}'`));
  const indexador = leer('taller/solucion/src/indexador.js');
  for (const funcion of ['sincronizar', 'reconstruir']) {
    assert.match(tabla, new RegExp(`<code>${funcion}\\(\\)</code>`), funcion);
    assert.match(indexador, new RegExp(`async function ${funcion}\\b`), funcion);
  }
  assert.match(tabla, /UNIQUE \(tx_hash, log_index\)/);
  assert.match(leer('taller/solucion/sql/001_proyeccion.sql'), /UNIQUE \(tx_hash, log_index\)/);
  assert.match(leer('taller/solucion/src/repositorio-postgres.js'), /ON CONFLICT \(tx_hash, log_index\) DO NOTHING/);
  assert.match(tabla, /ON CONFLICT \(tx_hash, log_index\) DO NOTHING/);
});

test('el ejemplo asigna permisos de escritura y una responsabilidad por componente', () => {
  assert.match(ejemplo, /<h3>Quién puede escribir cada dato<\/h3>/);
  assert.match(ejemplo, /<h3>Una responsabilidad por componente<\/h3>/);
  for (const actor of ['Comprador', 'Oráculo', 'Productor', 'Auditor']) assert.match(ejemplo, new RegExp(actor), actor);
  for (const componente of ['Oráculo', 'Contrato', 'Indexador', 'PostgreSQL', 'Interfaz']) assert.match(ejemplo, new RegExp(`<td><strong>${componente}`), componente);
});

test('Practica guía cada laboratorio con predicción, ejecución y anotación', () => {
  for (const destino of [...m2.labs.map(lab => `#lab/${lab}`), '#taller/1']) assert.ok(practica.includes(`href="${destino}"`), destino);
  assert.equal([...practica.matchAll(/<strong>Predice:<\/strong>/g)].length, 4, 'una predicción por laboratorio y por la etapa 1');
  assert.equal([...practica.matchAll(/<strong>Anota:<\/strong>/g)].length, 4);
  assert.match(practica, /npm run etapa:1/);
  assert.match(practica, /<h3>Errores frecuentes al diseñar<\/h3>/);
});

test('Aplica sigue breve y orienta a sus fuentes', () => {
  assert.match(aplica, /<h2>MG-A02 · Diseño razonado<\/h2>/);
  assert.ok(sinEtiquetas(aplica).length < 900, 'la ficha completa vive en la estación');
  assert.match(aplica, /href="#taller\/1"/);
});

test('«Del caso al contrato» cita los enteros, la cuarentena y la huella tal como están en el código', () => {
  assert.match(ejemplo, /<h3>Del caso al contrato<\/h3>/);
  const telemetria = leer('contracts/RegistroTelemetria.sol');
  const miel = leer('contracts/CertificacionMiel.sol');
  // Solidity no tiene decimales: las décimas se envían como enteros.
  assert.match(telemetria, /temperaturaX10 < 20 \|\| temperaturaX10 > 80/);
  assert.match(telemetria, /dato\.cuarentena = dato\.cuarentena \|\|/);
  assert.match(miel, /humedadX10 > 200 \|\| hmfX10 > 400 \|\| deltaX10 > -245/);
  assert.match(miel, /bytes32 documento/);
  const texto = sinEtiquetas(ejemplo);
  for (const dato of ['temperaturaX10', '42', '20', '80', 'dato.cuarentena ||', 'humedadX10', '200', '400', '-245', 'documento', 'bytes32', 'registrar()', 'certificar()']) {
    assert.ok(texto.includes(dato), `falta ${dato}`);
  }
  for (const nombre of ['LecturaDuplicada', 'LoteInvalido', 'CondicionesIncumplidas']) assert.match(ejemplo, new RegExp(`<code>${nombre}</code>`), nombre);
});

test('el dictamen relaciona los motivos de la etapa 1 con el puntaje de los laboratorios', () => {
  const aprobada = evaluateMilk({ temperature: 3.5, acidity: 16 });
  const rechazada = evaluateMilk({ temperature: 9, acidity: 16 });
  assert.deepEqual([aprobada.score, aprobada.accepted, rechazada.score, rechazada.accepted], [98, true, 58, false]);
  const texto = sinEtiquetas(ejemplo);
  assert.match(texto, /98 puntos/);
  assert.match(texto, /58 puntos/);
  assert.match(texto, /90 puntos/);
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

test('el documento de casos describe los contratos del aula y no promete lo que no implementan', () => {
  const documento = leer('docs/01b-casos-adso.md').replace(/\r\n/g, '\n');
  assert.match(documento.slice(0, 700), /se prepararon para aprender/);
  for (const retirado of [/recordTelemetry/, /QualityThresholdNotMet/, /NullifierAlreadyUsed/, /ERC-5192/, /ERC-721/, /IPFS/, /tercer producto más adulterado/i, /menos de 1 milisegundo/i, /sin intermediación bancaria/i, /-1\.0‰|−1\.0‰/]) {
    assert.doesNotMatch(documento, retirado, `${retirado} no corresponde al aula`);
  }
  const fuentes = CONTRATOS_AULA.map(leer).join('\n');
  const funciones = [...documento.matchAll(/`([a-z]\w+)\(\)`/g)].map(([, nombre]) => nombre);
  const errores = [...documento.matchAll(/`([A-Z][a-z]+(?:[A-Z][a-z]+)+)`/g)].map(([, nombre]) => nombre);
  for (const nombre of ['registrar', 'certificar', 'registrarElector', 'emitirVoto']) assert.ok(funciones.includes(nombre), `el documento no cita ${nombre}()`);
  for (const nombre of [...funciones, ...errores]) assert.match(fuentes, new RegExp(`(function|error|event|contract) ${nombre}\\b`), `${nombre} no existe en contracts/`);
  for (const umbral of ['2 a 8 °C', '20 %', '40 mg/kg', '−24,5 ‰']) assert.ok(documento.includes(umbral), umbral);
  assert.match(documento, /## En un sistema de producción/);
  assert.match(documento, /Semaphore/);
});

test('la sección MG-A02 del documento de diseño remite a las tablas del módulo 2', () => {
  const documento = leer('docs/02-diseno.md');
  const seccion = documento.slice(documento.indexOf('## Para tu evidencia MG-A02'));
  assert.match(seccion, /#m2\/1/);
  assert.match(seccion, /responsabilidades/);
  assert.match(seccion, /fallas/);
});
