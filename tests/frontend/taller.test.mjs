import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createAula } from '../../frontend/web/main.js';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { labs } from '../../frontend/web/labs/catalog.mjs';
import { labGuidance } from '../../frontend/web/labs/guidance.mjs';
import { simulateLab, PC_COMMANDS } from '../../frontend/web/labs/simulation.mjs';
import { etapas, etapasDelModulo, MINUTOS_TALLER } from '../../frontend/web/taller/catalog.mjs';
import { etapaView } from '../../frontend/web/taller/view.mjs';
import { lenguajes } from '../../frontend/web/taller/preparar.mjs';
import { resolveRoute, searchGuide } from '../../frontend/web/navigation/model.mjs';

const tick = () => new Promise(resolve => setTimeout(resolve, 10));
function setup(hash = '') {
  const dom = new JSDOM('<!doctype html><html><body><div id="aula"></div></body></html>', { url: 'http://localhost:8153/' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.eval(readFileSync('js/vendor/devbrain-learner-sdk.js', 'utf8'));
  const api = { runtime: async () => { throw new Error('sin servicio'); }, run: async () => { throw new Error('sin servicio'); } };
  const app = createAula({ window: dom.window, document: dom.window.document, storage: dom.window.localStorage, api, auth: async () => '' });
  return { dom, document: dom.window.document, app };
}
async function navigate(context, hash) {
  context.dom.window.location.hash = hash;
  context.app?.render();
  await tick();
}
const visible = element => element && !element.hidden && !element.closest('[hidden]');

test('las rutas del taller, la preparación y el anexo se resuelven y validan', () => {
  assert.deepEqual(resolveRoute('#taller/3'), { page: 'etapa', etapa: 3, route: 'taller/3' });
  assert.deepEqual(resolveRoute('#taller/0'), { page: 'etapa', etapa: 0, route: 'taller/0' });
  assert.deepEqual(resolveRoute('#taller/9'), { page: 'taller', route: 'taller' });
  assert.deepEqual(resolveRoute('#taller'), { page: 'taller', route: 'taller' });
  assert.deepEqual(resolveRoute('#preparar'), { page: 'preparar', route: 'preparar' });
  assert.deepEqual(resolveRoute('#instalacion'), { page: 'preparar', route: 'preparar' });
  assert.deepEqual(resolveRoute('#construye'), { page: 'taller', route: 'taller' });
  assert.deepEqual(resolveRoute('#publicar'), { page: 'publicar', route: 'publicar' });
});

test('la interfaz muestra preparación, catálogo, cada etapa y el anexo con navegación coherente', async () => {
  const context = setup('#preparar');
  await context.app.ready;
  const { document } = context;
  assert.equal(document.querySelector('#preparar h1').textContent, 'Prepara tu equipo');
  assert.equal(document.querySelector('[data-nav=preparar]').getAttribute('aria-current'), 'page');
  assert.match(document.querySelector('#preparar').textContent, /winget install --id OpenJS\.NodeJS\.LTS -e/);
  assert.match(document.querySelector('#preparar').textContent, /PostgreSQL\.PostgreSQL\.18/);

  await navigate(context, '#taller');
  assert.ok(visible(document.getElementById('taller-catalog')));
  assert.equal(document.querySelectorAll('#taller-catalog .lab-card').length, 7);
  assert.equal(document.getElementById('breadcrumb-current').textContent, 'Taller AgroPay');
  assert.equal(document.querySelector('#taller-catalog a[download]').getAttribute('href'), 'descargas/taller-agropay.zip');

  for (const etapa of etapas) {
    await navigate(context, '#taller/' + etapa.numero);
    assert.equal(document.getElementById('taller-catalog').hidden, true);
    const paginas = [...document.querySelectorAll('[data-etapa-page]')].filter(page => !page.hidden);
    assert.deepEqual(paginas.map(page => page.dataset.etapaPage), [String(etapa.numero)]);
    assert.equal(paginas[0].querySelector('h1').textContent, etapa.titulo);
    assert.equal(document.getElementById('breadcrumb-current').textContent, 'Taller · Etapa ' + etapa.numero);
    assert.equal(document.querySelector('[data-nav=taller]').getAttribute('aria-current'), 'page');
    assert.ok([...paginas[0].querySelectorAll('.code-toolbar span')].some(label => label.textContent === 'Salida de terminal'));
    for (const bloque of paginas[0].querySelectorAll('pre')) {
      assert.equal(bloque.tabIndex, 0);
      assert.equal(bloque.getAttribute('role'), 'region');
      assert.match(bloque.getAttribute('aria-label'), /^(Código de referencia|Salida de terminal)$/);
    }
    assert.ok(paginas[0].querySelector(`a[href="#${etapa.modulo}/0"]`));
    for (const lab of etapa.labs) assert.ok(paginas[0].querySelector(`a[href="#lab/${lab}"]`), lab);
  }

  assert.equal(context.app.progress.read().lastRoute, 'taller/6');
  // render() vuelve a sincronizar la ruta actual sin cambiar de página.
  context.app.render();
  assert.equal(document.getElementById('breadcrumb-current').textContent, 'Taller · Etapa 6');
  await navigate(context, '#publicar');
  assert.equal(document.querySelector('#publicar h1').textContent, 'Publica la guía en tu VPS');
  assert.match(document.querySelector('#publicar').textContent, /\/docker-compose\.yml/);
  assert.match(document.querySelector('#publicar').textContent, /\/docker-compose\.anvil\.yml/);
  assert.match(document.querySelector('#publicar').textContent, /Foundry Anvil/);
  assert.match(document.querySelector('#publicar').textContent, /Traefik Basic Auth/);
  assert.match(document.querySelector('#publicar').textContent, /ON CONFLICT DO NOTHING/);
  context.app.destroy();
});

test('una ruta interna escrita en la barra de direcciones vuelve a mostrar su página', async () => {
  const context = setup('#labs');
  await context.app.ready;
  const { document } = context;
  const paginas = () => [...document.querySelectorAll('#main-content .module-page')];
  for (const [hash, pageId] of [['#lab/evm', 'labs'], ['#taller/3', 'taller']]) {
    // Simula el efecto de SpaRouter.showPage con un id que no es de página: oculta todas.
    for (const page of paginas()) page.style.display = 'none';
    await navigate(context, hash);
    assert.deepEqual(paginas().filter(page => page.style.display === 'block').map(page => page.id), [pageId], hash);
  }
  // Si la página ya está visible, no se altera la presentación del lector.
  document.getElementById('taller').style.display = '';
  await navigate(context, '#taller/4');
  assert.equal(document.getElementById('taller').style.display, '');
  context.app.destroy();
});

test('cada evidencia tiene una sola estación y cada módulo enlaza sus etapas del taller', async () => {
  const context = setup('#m6/3');
  await context.app.ready;
  const { document } = context;
  for (const id of ['MG-A01', 'MG-A02', 'MG-A03', 'MG-A04', 'MG-A05']) {
    assert.equal(document.querySelectorAll(`.lesson-step [data-db-evidence="${id}"]`).length, 1, id);
  }
  assert.equal(document.querySelector('#m6').querySelector('[data-db-evidence]'), null);
  for (const module of modules) {
    const practica = document.getElementById(`${module.id}/2`);
    const enlaces = [...practica.querySelectorAll('a[href^="#taller/"]')].map(a => Number(a.getAttribute('href').split('/')[1]));
    assert.deepEqual(enlaces, etapasDelModulo(module.id).map(etapa => etapa.numero), module.id);
  }
  context.app.destroy();
});

test('cada laboratorio explica cómo hacerlo, qué esperar y cómo seguir si falla', async () => {
  assert.deepEqual(Object.keys(labGuidance).sort(), labs.map(lab => lab.id).sort());
  const context = setup('#labs');
  await context.app.ready;
  for (const lab of labs) {
    assert.ok(lab.steps.length >= 3 && lab.steps.length <= 5, lab.id);
    assert.ok(lab.expect.length > 20 && lab.troubleshoot.length > 20, lab.id);
    const page = context.document.getElementById('lab/' + lab.id);
    assert.equal(page.querySelectorAll('.lab-steps li').length, lab.steps.length, lab.id);
    const enlace = page.querySelector('a[href^="#taller/"]');
    if (lab.taller === null) assert.equal(enlace, null, lab.id);
    else assert.equal(enlace.getAttribute('href'), '#taller/' + lab.taller, lab.id);
  }
  context.app.destroy();
});

test('la búsqueda encuentra etapas del taller y la preparación del equipo', () => {
  assert.ok(searchGuide('reentrada').some(item => item.route === 'taller/3' && item.kind === 'Taller'));
  assert.ok(searchGuide('ON CONFLICT').some(item => item.route === 'taller/5'));
  assert.ok(searchGuide('winget').some(item => item.route === 'preparar'));
  assert.ok(searchGuide('coolify').some(item => item.route === 'publicar'));
  assert.ok(searchGuide('anvil').some(item => item.route === 'publicar'));
  assert.ok(searchGuide('traefik').some(item => item.route === 'publicar'));
});

test('la navegación entre etapas empieza en la preparación y termina en el Portafolio', () => {
  assert.match(etapaView(etapas[0]), /href="#preparar">← Prepara tu equipo/);
  assert.match(etapaView(etapas[0]), /href="#taller\/1">Etapa 1/);
  assert.match(etapaView(etapas[6]), /href="#taller\/5">← Etapa 5/);
  assert.match(etapaView(etapas[6]), /href="#portfolio">Consolidar en el Portafolio/);
  assert.match(etapaView(etapas[3]), /Registrar MG-A03/);
  assert.doesNotMatch(etapaView(etapas[2]), /Registrar MG-/);
  assert.equal(MINUTOS_TALLER, etapas.reduce((total, etapa) => total + etapa.minutos, 0));
});

test('la simulación del entorno en PC muestra los comandos que ejecuta la modalidad real', () => {
  assert.deepEqual(simulateLab('pc', { task: 'compile' }).result.commands, ['npx hardhat compile']);
  assert.deepEqual(simulateLab('pc', { task: 'test' }).result.commands, ['npx hardhat test']);
  assert.deepEqual(simulateLab('pc', { task: 'audit' }).result.commands, PC_COMMANDS.audit);
  assert.deepEqual(simulateLab('pc', {}).result.commands, PC_COMMANDS.compile);
  const runner = readFileSync('backend/audit/runner.cjs', 'utf8');
  assert.match(runner, /test\/WithdrawalSecurity\.test\.js/);
  assert.match(runner, /slither_driver\.py/);
});

test('el contenido del taller coincide con el paquete real: archivos, comandos y pruebas', () => {
  const inicio = 'taller/inicio';
  const scripts = JSON.parse(readFileSync(`${inicio}/package.json`, 'utf8')).scripts;
  const pruebas = readdirSync(`${inicio}/test`);
  for (const etapa of etapas) {
    for (const [archivo] of etapa.archivos) assert.ok(existsSync(`${inicio}/${archivo}`), `${etapa.numero}: ${archivo}`);
    const textos = [etapa.comprobar.comando, ...etapa.pasos, ...etapa.codigo.map(bloque => bloque.texto)].join('\n');
    for (const [, script] of textos.matchAll(/npm run ([a-z0-9:-]+)/g)) assert.ok(scripts[script], `${etapa.numero}: npm run ${script}`);
    const archivoPrueba = pruebas.find(nombre => nombre.startsWith(`etapa-${etapa.numero}.`));
    const titulos = [...readFileSync(`${inicio}/test/${archivoPrueba}`, 'utf8').matchAll(/\bit\('([^']+)'/g)].map(match => match[1]);
    const mostrados = [...etapa.comprobar.despues.matchAll(/^ {4,}(?:√|-) (.+)$/gm)].map(match => match[1]).filter(titulo => !titulo.startsWith('guarda') || titulos.includes(titulo));
    for (const titulo of titulos) assert.ok(etapa.comprobar.despues.includes(titulo), `${etapa.numero}: falta «${titulo}» en la salida esperada`);
    for (const titulo of mostrados) assert.ok(titulos.includes(titulo), `${etapa.numero}: «${titulo}» no existe en las pruebas`);
    const aprobadas = Number(etapa.comprobar.despues.match(/(\d+) passing/)[1]);
    const pendientes = Number(etapa.comprobar.despues.match(/(\d+) pending/)?.[1] || 0);
    assert.equal(aprobadas + pendientes, titulos.length + (etapa.numero === 5 ? 3 : 0), `${etapa.numero}: conteo de pruebas`);
  }
});

test('la tabla de lenguajes responde qué escribe el aprendiz', () => {
  const texto = lenguajes.map(fila => fila.join(' ')).join(' ');
  for (const lenguaje of ['JavaScript', 'Solidity', 'SQL', 'PowerShell', 'Python']) assert.match(texto, new RegExp(lenguaje));
  assert.match(lenguajes.find(fila => fila[0].includes('Python'))[2], /^No\./);
});
