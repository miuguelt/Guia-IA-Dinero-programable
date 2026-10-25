// Coherencia de los materiales del aprendiz: comandos existentes, versiones vigentes,
// evidencias con una sola estación y catálogos alineados con el manifiesto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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

test('la plantilla del Portafolio incluye cada evidencia con su lista de chequeo', () => {
  const plantilla = leer('docs/evidencias-template.md');
  for (const artefacto of JSON.parse(leer('deliverables.registry.json')).artifacts) {
    assert.ok(plantilla.includes(`## ${artefacto.id} · ${artefacto.name}`), artefacto.id);
    for (const item of artefacto.checklist) assert.ok(plantilla.includes(`- [ ] ${item}`), `${artefacto.id}: ${item}`);
  }
  assert.match(plantilla, /no contienen registros reales/);
});
