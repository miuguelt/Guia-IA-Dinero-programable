// Coherencia de los materiales del aprendiz: comandos existentes, versiones vigentes,
// evidencias con una sola estación y catálogos alineados con el manifiesto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { labs } from '../../frontend/web/labs/catalog.mjs';
import { etapas } from '../../frontend/web/taller/catalog.mjs';
import { prepararView } from '../../frontend/web/taller/preparar.mjs';
import { publicarView } from '../../frontend/web/taller/publicar.mjs';
import { tallerView } from '../../frontend/web/taller/view.mjs';

const leer = archivo => readFileSync(archivo, 'utf8');
const documentos = ['README.md', 'GUIA_EJERCICIO_BASE_ENTORNO.md', ...readdirSync('docs').filter(f => f.endsWith('.md') && !f.startsWith('VALIDACION') && f !== 'COMPARACION-VISUAL.md').map(f => `docs/${f}`)];
const web = {
  'módulos': modules.flatMap(module => module.steps.map(step => step.body)).join('\n'),
  'preparar': prepararView(),
  'taller': tallerView(),
  'publicar': publicarView(),
};
const materiales = { ...Object.fromEntries(documentos.map(archivo => [archivo, leer(archivo)])), ...web };

test('cada comando npm run citado existe en la guía o en el taller', () => {
  const scripts = new Set([...Object.keys(JSON.parse(leer('package.json')).scripts), ...Object.keys(JSON.parse(leer('taller/inicio/package.json')).scripts)]);
  for (const [origen, texto] of Object.entries(materiales)) {
    for (const [, script] of texto.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) {
      // «npm run etapa:N» es la forma genérica de las siete etapas.
      const existe = script.endsWith(':') ? [...scripts].some(nombre => nombre.startsWith(script)) : scripts.has(script);
      assert.ok(existe, `${origen}: npm run ${script}`);
    }
  }
});

test('los materiales del aprendiz no contienen versiones, archivos ni enlaces retirados', () => {
  const prohibidos = [
    [/PostgreSQL 16/, 'PostgreSQL 16'],
    [/file:\/\/\//, 'enlace file:///'],
    [/\b[\w-]+\.ts\b/, 'archivo TypeScript'],
    [/ColdChainTracker/, 'contrato inexistente'],
    [/docker compose (up|logs|down)/i, 'Docker como ejecución local'],
    [/Node\.js 18|Node 18/, 'Node.js 18'],
    [/Nadie en el mundo/i, 'afirmación absoluta'],
  ];
  for (const [origen, texto] of Object.entries(materiales)) {
    for (const [patron, motivo] of prohibidos) assert.doesNotMatch(texto, patron, `${origen}: ${motivo}`);
    for (const linea of texto.split('\n').filter(l => /Circom/.test(l))) assert.match(linea, /Semaphore/, `${origen}: Circom sin contexto de Semaphore`);
  }
});

test('cada evidencia se produce en una sola estación y coincide con el registro', () => {
  const registro = JSON.parse(leer('deliverables.registry.json'));
  const conEvidencia = modules.filter(module => module.evidence);
  assert.equal(new Set(conEvidencia.map(module => module.evidence)).size, conEvidencia.length);
  for (const artefacto of registro.artifacts) {
    assert.equal(modules.find(module => module.id === artefacto.station.sectionId).evidence, artefacto.id, artefacto.id);
  }
  assert.equal(modules.find(module => module.id === 'm6').evidence, null);
});

test('el manifiesto, los catálogos y el taller concuerdan', () => {
  const manifiesto = JSON.parse(leer('guide.manifest.json'));
  assert.equal(manifiesto.platform.modules, modules.length);
  assert.equal(manifiesto.platform.laboratories, labs.length);
  assert.deepEqual(etapas.map(etapa => etapa.numero), [0, 1, 2, 3, 4, 5, 6]);
  for (const etapa of etapas) {
    assert.ok(modules.some(module => module.id === etapa.modulo), `etapa ${etapa.numero}`);
    for (const lab of etapa.labs) assert.ok(labs.some(item => item.id === lab), `etapa ${etapa.numero}: ${lab}`);
  }
});

test('las imágenes y enlaces locales de los documentos apuntan a archivos existentes', () => {
  for (const archivo of documentos) {
    const base = dirname(archivo);
    for (const [, destino] of leer(archivo).matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(destino)) continue;
      const ruta = decodeURIComponent(destino.split('#')[0]);
      assert.ok(existsSync(join(base, ruta)), `${archivo}: ${destino}`);
    }
  }
});

test('el README relaciona cada documento de apoyo con su módulo web', () => {
  const readme = leer('README.md');
  const seccion = readme.slice(readme.indexOf('## Documentos de apoyo'), readme.indexOf('## Mantenimiento e instructor'));
  assert.ok(seccion.length > 30, 'falta la sección Documentos de apoyo');
  for (const archivo of documentos.filter(f => f.startsWith('docs/') && f !== 'docs/evidencias-template.md')) {
    assert.ok(seccion.includes(`](${archivo})`), `${archivo} sin fila en la tabla`);
  }
  for (const artefacto of JSON.parse(leer('deliverables.registry.json')).artifacts) {
    const fila = seccion.split('\n').find(linea => linea.includes(`](${artefacto.evidence})`));
    assert.ok(fila?.includes(artefacto.station.sectionId), `${artefacto.evidence}: módulo ${artefacto.station.sectionId}`);
  }
});

test('las horas de cada fase del manifiesto suman los minutos de sus módulos', () => {
  const manifiesto = JSON.parse(leer('guide.manifest.json'));
  const registro = JSON.parse(leer('deliverables.registry.json'));
  // m6 consolida el Portafolio sin estación propia; pertenece a la fase de transferencia.
  const fasePorModulo = { m6: 'transfer', ...Object.fromEntries(registro.artifacts.map(a => [a.station.sectionId, a.station.phase])) };
  const minutos = {};
  for (const module of modules) {
    const fase = fasePorModulo[module.id];
    assert.ok(fase, `${module.id} sin fase`);
    minutos[fase] = (minutos[fase] ?? 0) + module.minutes;
  }
  const declaradas = Object.fromEntries(manifiesto.learningSequence.map(f => [f.phase, f.hours * 60]));
  assert.deepEqual(declaradas, minutos);
  assert.equal(manifiesto.duration.hours * 60, modules.reduce((total, module) => total + module.minutes, 0));
});

test('la plantilla del Portafolio incluye cada evidencia con su lista de chequeo y sus bloques', () => {
  const plantilla = leer('docs/evidencias-template.md');
  for (const artefacto of JSON.parse(leer('deliverables.registry.json')).artifacts) {
    assert.ok(plantilla.includes(`## ${artefacto.id} · ${artefacto.name}`), artefacto.id);
    for (const item of artefacto.checklist) assert.ok(plantilla.includes(`- [ ] ${item}`), `${artefacto.id}: ${item}`);
    for (const campo of artefacto.fields) assert.ok(plantilla.includes(`**${campo.label}**`), `${artefacto.id}: ${campo.label}`);
  }
  assert.match(plantilla, /no contienen registros reales/);
});

// Cada estación sigue la misma ficha: observar un resultado de AgroPay, explicarlo
// y llevar una pieza al proyecto propio. El aprendiz aprende el formato una vez.
test('cada evidencia se construye con los bloques Observa, Explica y Tu proyecto', () => {
  const bloques = [['observacion', /^1 · Observa/], ['explicacion', /^2 · Explica/], ['proyecto', /^3 · Tu proyecto/]];
  for (const artefacto of JSON.parse(leer('deliverables.registry.json')).artifacts) {
    const claves = artefacto.fields.map(campo => campo.key);
    assert.equal(new Set(claves).size, claves.length, `${artefacto.id}: claves repetidas`);
    for (const [clave, etiqueta] of bloques) {
      const campo = artefacto.fields.find(item => item.key === clave);
      assert.ok(campo, `${artefacto.id}: falta ${clave}`);
      assert.match(campo.label, etiqueta, `${artefacto.id}: ${clave}`);
      assert.notEqual(campo.required, false, `${artefacto.id}: ${clave} debe ser obligatorio`);
    }
    for (const campo of artefacto.fields) {
      assert.ok(campo.hint?.trim(), `${artefacto.id}: ${campo.key} sin ayuda`);
      if (campo.type === 'tabla') assert.ok(campo.columns.length >= 2 && campo.columns.every(columna => columna.placeholder), `${artefacto.id}: ${campo.key} sin columnas guiadas`);
      else assert.ok(campo.placeholder?.trim(), `${artefacto.id}: ${campo.key} sin inicio de respuesta`);
    }
    // El campo heredado conserva lo que los aprendices ya escribieron, sin bloquear el estado.
    assert.equal(artefacto.fields.find(campo => campo.key === 'evidencia')?.required, false, `${artefacto.id}: notas opcionales`);
    assert.ok(artefacto.checklist.every(item => /^(Observa|Explica|Tu proyecto):/.test(item)), `${artefacto.id}: chequeo sin bloque`);
    assert.notEqual(artefacto.purpose, artefacto.instructions, `${artefacto.id}: propósito repetido`);
    assert.ok(artefacto.inputs.length && artefacto.inputs.every(entrada => !/Guía y contexto del caso/.test(entrada)), `${artefacto.id}: entradas genéricas`);
    assert.ok(artefacto.station.minutes > 0, `${artefacto.id}: sin minutos`);
    assert.ok(!/^Ayuda a revisar la claridad de esta evidencia/.test(artefacto.aiAssist.prompt), `${artefacto.id}: prompt genérico`);
  }
});

test('el paso Aplica orienta hacia su fuente sin repetir la estación', () => {
  const registro = JSON.parse(leer('deliverables.registry.json'));
  const rutas = new Set([...etapas.map(etapa => `#taller/${etapa.numero}`), ...labs.map(lab => `#lab/${lab.id}`), '#portfolio']);
  for (const module of modules) {
    const cuerpo = module.steps[3].body;
    assert.equal(module.steps[3].title, 'Aplica');
    assert.doesNotMatch(cuerpo, /<blockquote>/, `${module.id}: ejemplo duplicado`);
    const enlaces = [...cuerpo.matchAll(/href="(#[^"]+)"/g)].map(([, destino]) => destino);
    assert.ok(enlaces.length > 0, `${module.id}: sin enlace a la fuente`);
    for (const destino of enlaces) assert.ok(rutas.has(destino), `${module.id}: ${destino}`);
    const artefacto = registro.artifacts.find(item => item.id === module.evidence);
    if (!artefacto) continue;
    assert.match(cuerpo, new RegExp(`<h2>${artefacto.id} · ${artefacto.name}</h2>`), `${module.id}: título`);
    for (const texto of [artefacto.example, artefacto.instructions, artefacto.purpose]) assert.ok(!cuerpo.includes(texto), `${module.id}: repite la estación`);
  }
});
