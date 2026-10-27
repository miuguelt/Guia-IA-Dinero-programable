// Módulo 6: el contenido ayuda a consolidar el Portafolio (estados de la interfaz, registro verificable,
// relación entre evidencias y propuesta) y cada mensaje, cifra y comando citado coincide con el código.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { simulateLab } from '../../frontend/web/labs/simulation.mjs';
import { exportPortfolio } from '../../frontend/web/evidence/view.mjs';

const leer = archivo => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
const m6 = modules.find(module => module.id === 'm6');
const [comprende, ejemplo, practica, aplica] = m6.steps.map(step => step.body);
const todo = m6.steps.map(step => step.body).join('\n');
const sinEtiquetas = html => html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const tablas = html => [...html.matchAll(/<div class="table-scroll"><table>([\s\S]*?)<\/table><\/div>/g)].map(match => match[1]);
const REGISTRO = JSON.parse(leer('deliverables.registry.json'));
const RECORRIDO = leer('taller/solucion/src/recorrido.js');
const INSPECCION = leer('taller/solucion/scripts/inspeccionar-estado.js');

test('el módulo 6 conserva su estructura, su duración y no tiene estación propia', () => {
  assert.deepEqual(m6.steps.map(step => step.title), ['Comprende', 'Revisa el ejemplo', 'Practica', 'Aplica']);
  assert.equal(m6.minutes, 60);
  assert.deepEqual(m6.labs, ['architecture', 'database']);
  assert.equal(m6.evidence, null);
});

test('los estados de la interfaz citan mensajes reales del aula', () => {
  for (const titulo of ['Estados que orientan', 'Claves de acceso y relé local', 'Tres capas, una historia']) assert.match(comprende, new RegExp(`<h3>${titulo}`), titulo);
  const tabla = tablas(comprende).find(item => /Mensaje real del aula/.test(item));
  assert.ok(tabla, 'tabla de estados con mensajes reales');
  for (const estado of ['Sin datos', 'En ejecución', 'Confirmado', 'Pendiente', 'Error']) assert.match(tabla, new RegExp(`<strong>${estado}`), estado);
  const mensajes = [
    ['backend/labs/execute.cjs', 'Despliega los contratos antes de sincronizar la base.'],
    ['backend/labs/index-events.cjs', 'La operación se ejecutó. La indexación está pendiente; revisa PostgreSQL y vuelve a sincronizar.'],
    ['backend/security/webauthn.cjs', 'Registra primero una credencial para esta sesión.'],
    ['frontend/web/labs/view.mjs', 'Tu próxima comprobación empieza aquí'],
    ['frontend/web/labs/view.mjs', 'Sincronizando eventos'],
    ['frontend/web/labs/view.mjs', 'Transacción confirmada'],
    ['frontend/web/labs/view.mjs', 'Reintentar actividad'],
  ];
  for (const [archivo, mensaje] of mensajes) {
    assert.ok(leer(archivo).includes(mensaje), `${archivo} ya no dice: ${mensaje}`);
    assert.ok(sinEtiquetas(tabla).includes(mensaje), `falta: ${mensaje}`);
  }
  assert.ok(!/<table>/.test(comprende.replace(/<div class="table-scroll"><table>[\s\S]*?<\/table><\/div>/g, '')), 'toda tabla tiene su propio desplazamiento');
});

test('la práctica WebAuthn describe los límites que aplica el servidor', () => {
  const webauthn = leer('backend/security/webauthn.cjs');
  assert.match(webauthn, /now\(\) - value\.createdAt > 120000/);
  assert.ok(webauthn.includes('El desafío no existe, venció o ya se utilizó. Inicia la operación de nuevo.'));
  assert.ok(webauthn.includes('La práctica de credenciales funciona desde localhost.'));
  assert.match(leer('backend/persistence/schema.cjs'), /public_key BYTEA NOT NULL,\s*counter BIGINT/);
  const texto = sinEtiquetas(comprende);
  assert.match(texto, /dos minutos/);
  assert.ok(texto.includes('El desafío no existe, venció o ya se utilizó. Inicia la operación de nuevo.'));
  assert.match(texto, /localhost/);
  assert.match(texto, /clave pública y un contador/);
});

test('las tres capas citan lo que imprime inspeccionar-estado.js', () => {
  for (const capa of ['CAPA 1: EVM STORAGE', 'CAPA 2: BITÁCORA DE EVENTOS', 'CAPA 3: PROYECCIÓN EN BASE DE DATOS']) {
    assert.ok(INSPECCION.includes(capa), capa);
    assert.ok(sinEtiquetas(comprende).includes(capa), `falta ${capa}`);
  }
  assert.match(INSPECCION, /idLote: 101/);
  assert.match(INSPECCION, /montoEth: '0\.5'/);
  assert.match(INSPECCION, /garantiaEth: '1\.5'/);
  const texto = sinEtiquetas(comprende);
  for (const dato of ['lote 101', '1,5 ETH', '0,5 ETH', '1 ETH']) assert.ok(texto.includes(dato), `falta ${dato}`);
});

test('el registro verificable usa los datos de npm run demo', () => {
  const demo = leer('taller/solucion/scripts/demo.js');
  assert.match(demo, /LECTURA_DE_PRACTICA = \{ idLote: 1, temperatura: 3\.5, acidez: 16, nonce: 'demo-1' \}/);
  assert.match(RECORRIDO, /montoEth = '1', garantiaEth = '2'/);
  const verificable = ejemplo.match(/<h3>Registro verificable<\/h3>([\s\S]*?)<\/article>/)?.[1] ?? '';
  assert.ok(verificable, 'el ejemplo tiene un registro verificable');
  const texto = sinEtiquetas(verificable);
  for (const dato of ['npm run demo', 'lote 1', '3,5 °C', 'acidez 16', '2 ETH', '1 ETH', 'Eventos leídos: 3; nuevos en la proyección: 3', 'evidencia-taller.md']) {
    assert.ok(texto.includes(dato), `falta ${dato}`);
  }
  assert.ok(RECORRIDO.includes('- Eventos leídos: '));
});

test('el recorrido rechazado coincide con la etapa 6', () => {
  const pruebas = leer('taller/solucion/test/etapa-6.recorrido.test.js');
  assert.match(pruebas, /temperatura: 8, acidez: 15/);
  assert.match(pruebas, /resultado\.eventos\.map\(e => e\.tipo\)\)\.to\.deep\.equal\(\['GarantiaDepositada'\]\)/);
  assert.ok(RECORRIDO.includes("resultado.autorizacion ?? 'no se envió'"));
  const texto = sinEtiquetas(ejemplo);
  for (const dato of ['8 °C', 'acidez 15', 'Autorización: no se envió', 'Retiro: no se envió', 'Temperatura 8 °C supera el máximo de 4 °C.']) assert.ok(texto.includes(dato), `falta ${dato}`);
  assert.match(ejemplo, /<code>GarantiaDepositada<\/code>/);
});

test('la tabla de la propuesta relaciona cada evidencia con su bloque «Tu proyecto»', () => {
  const tabla = tablas(ejemplo).find(item => /MG-A01/.test(item) && /MG-A05/.test(item));
  assert.ok(tabla, 'tabla de evidencias a propuesta');
  for (const artefacto of REGISTRO.artifacts) {
    const fila = [...tabla.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, f]) => f).find(f => f.includes(artefacto.id));
    assert.ok(fila, `falta ${artefacto.id}`);
    assert.ok(fila.includes(artefacto.name), `${artefacto.id}: falta el nombre`);
    const proyecto = artefacto.fields.find(campo => campo.key === 'proyecto').label.replace('3 · Tu proyecto: ', '');
    assert.ok(sinEtiquetas(fila).toLowerCase().includes(proyecto.toLowerCase()), `${artefacto.id}: falta «${proyecto}»`);
  }
});

test('la exportación citada coincide con el Portafolio', () => {
  const vista = leer('frontend/web/evidence/view.mjs');
  for (const boton of ['Exportar JSON', 'Exportar Markdown']) {
    assert.ok(vista.includes(boton), boton);
    assert.ok(sinEtiquetas(todo).includes(`«${boton}»`), `falta «${boton}»`);
  }
  const markdown = exportPortfolio({ completed: [], verified: [], evidence: Object.fromEntries(REGISTRO.artifacts.map(a => [a.id, ''])) }, 'markdown', new Date('2026-10-27T00:00:00Z'));
  assert.match(markdown, /Juicio del instructor: Pendiente/);
  assert.match(sinEtiquetas(ejemplo), /Juicio del instructor: Pendiente/);
});

test('las prácticas de arquitectura y PostgreSQL coinciden con la simulación', () => {
  const arquitectura = simulateLab('architecture').result;
  const texto = sinEtiquetas(practica);
  assert.ok(texto.includes(arquitectura.layers.join(', ')), 'cita las seis capas en orden');
  assert.ok(texto.includes(arquitectura.explanation));
  for (const destino of ['#lab/architecture', '#lab/database', '#portfolio', '#taller/6']) assert.ok(practica.includes(`href="${destino}"`), destino);
});

test('cada comando citado existe en el taller o en la guía', () => {
  const scripts = { ...JSON.parse(leer('taller/solucion/package.json')).scripts, ...JSON.parse(leer('package.json')).scripts };
  const comandos = [...todo.matchAll(/npm run ([a-z0-9:-]+)/g)].map(([, nombre]) => nombre);
  for (const nombre of ['etapa:6', 'demo', 'inspeccionar:estado']) assert.ok(comandos.includes(nombre), `no se cita npm run ${nombre}`);
  for (const nombre of comandos) assert.ok(scripts[nombre], `npm run ${nombre} no existe`);
});

test('cada función citada existe en el taller', () => {
  const fuentes = [RECORRIDO, leer('taller/solucion/src/indexador.js'), leer('taller/solucion/src/oraculo.js'), leer('taller/solucion/contracts/GarantiaAgroPay.sol')].join('\n');
  const funciones = [...todo.matchAll(/<code>([a-z][A-Za-z]+)\(\)<\/code>/g)].map(([, nombre]) => nombre);
  assert.ok(funciones.includes('recorrerFlujo'), 'cita recorrerFlujo()');
  for (const nombre of new Set(funciones)) assert.match(fuentes, new RegExp(`function ${nombre}\\(`), `${nombre}() no existe`);
});

test('Practica guía cada laboratorio y la etapa 6 con predicción, ejecución y anotación', () => {
  assert.equal([...practica.matchAll(/<strong>Predice:<\/strong>/g)].length, 3);
  assert.equal([...practica.matchAll(/<strong>Ejecuta:<\/strong>/g)].length, 3);
  assert.equal([...practica.matchAll(/<strong>Anota:<\/strong>/g)].length, 3);
  assert.match(practica, /<h3>Revisión entre pares<\/h3>/);
  assert.match(practica, /<h3>Errores frecuentes al entregar<\/h3>/);
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

test('Aplica consolida las cinco evidencias y conserva la duración de la ruta', () => {
  assert.match(aplica, /<h2>Entrega tu solución razonada<\/h2>/);
  for (const artefacto of REGISTRO.artifacts) assert.ok(aplica.includes(artefacto.id), artefacto.id);
  assert.match(aplica, /href="#portfolio"/);
  assert.ok(sinEtiquetas(aplica).length < 1500, 'Aplica orienta; el detalle vive en Revisa el ejemplo');
});
