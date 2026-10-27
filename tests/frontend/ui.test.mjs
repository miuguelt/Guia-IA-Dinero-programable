import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createAula } from '../../frontend/web/main.js';
import { createProgress, createMemoryStorage } from '../../frontend/web/learning/progress.mjs';
import { labs } from '../../frontend/web/labs/catalog.mjs';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { artifacts, composeEvidence, evidenceSummaryHtml, exportPortfolio } from '../../frontend/web/evidence/view.mjs';
import { escapeHtml, icon, announce } from '../../frontend/web/dom.mjs';
import { evaluateHoney, parseEtherInput, formatEtherValue } from '../../frontend/web/labs/rules.mjs';
import { decorateCode } from '../../frontend/web/learning/code-view.mjs';

const tick = () => new Promise(resolve => setTimeout(resolve, 10));
function setup(hash = '', overrides = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="aula"></div></body></html>', { url: 'http://localhost:8153/' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.eval(readFileSync('js/vendor/devbrain-learner-sdk.js', 'utf8'));
  if (overrides.savedProgress) dom.window.localStorage.setItem('aula-dinero-v2', JSON.stringify(overrides.savedProgress));
  const document = dom.window.document;
  const api = {
    runtime: async () => ({ api: true, chain: { connected: true }, database: { connected: true } }),
    run: async (id, input, update) => {
      update({ labId: id, mode: 'real', status: 'running', id: 'run-observed' });
      return { labId: id, mode: 'real', status: 'completed', id: 'run-observed', result: { accepted: true, reading: input.temperature } };
    }
  };
  const app = createAula({ window: dom.window, document, storage: overrides.storage || dom.window.localStorage, api: overrides.api || api, auth: overrides.auth || (async () => 'Autenticación comprobada.') });
  return { dom, document, app };
}
function labPage(context, labId) { return context.document.getElementById('lab/' + labId); }
function activeHeading(context) { return context.document.querySelector('.module-page[style*="display: block"] h1'); }
async function navigate(context, hash) {
  const win = context.dom.window;
  if (win.location.hash !== hash) win.location.hash = hash;
  context.app?.render();
  await tick();
}
function submit(context, selector) {
  const form = context.document.querySelector(selector);
  form.dispatchEvent(new context.dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
function changeMode(context, value) {
  const labId = context.dom.window.location.hash.match(/^#lab\/([a-z-]+)$/)?.[1];
  const radio = labPage(context, labId).querySelector('input[name=mode][value="' + value + '"]');
  radio.checked = true;
  radio.dispatchEvent(new context.dom.window.Event('change', { bubbles: true }));
}

test('la navegación muestra módulos, restaura enlaces directos y completa sin duplicar puntos', async () => {
  const context = setup();
  await context.app.ready;
  const { document, dom, app } = context;
  assert.match(activeHeading(context).textContent, /Del dato al pago/);
  assert.equal(document.querySelectorAll('.module-card').length, 6);
  assert.deepEqual([...document.querySelectorAll('.learning-stage h3')].map(node => node.textContent), ['Comprender y decidir', 'Construir y conectar', 'Verificar y entregar']);
  assert.deepEqual([...document.querySelectorAll('.learning-stage')].map(stage => [...stage.querySelectorAll('.module-card')].map(card => card.getAttribute('href'))), [['#m1/0', '#m2/0'], ['#m3/0', '#m4/0'], ['#m5/0', '#m6/0']]);
  for (const module of modules) {
    for (let step = 0; step < 4; step++) {
      await navigate(context, '#' + module.id + '/' + step);
      assert.equal(document.querySelector('#' + module.id + ' h1').textContent, module.title);
      assert.equal(document.querySelector('#' + module.id + ' .step-nav [aria-current=step]').textContent, String(step + 1) + module.steps[step].title);
      assert.ok(document.querySelector('#' + module.id + ' .lesson-body h2'));
    }
  }
  await navigate(context, '#m1/3');
  const bloques = [...document.querySelectorAll('#m1 .dbe-campo__etiqueta')].map(node => node.textContent.match(/^\d · (Observa|Explica|Tu proyecto)/)?.[0]).filter(Boolean);
  assert.deepEqual([...new Set(bloques)], ['1 · Observa', '2 · Explica', '3 · Tu proyecto']);
  const explicacion = document.querySelector('#dbe-MG-A01-explicacion');
  explicacion.value = '<Una decisión> con un costo de gas.';
  explicacion.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const textarea = document.querySelector('#dbe-MG-A01-proyecto');
  textarea.value = 'Mi proceso de préstamos queda en PostgreSQL.';
  textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tick();
  const mga01 = artifacts.find(artifact => artifact.id === 'MG-A01');
  const etiqueta = key => mga01.fields.find(campo => campo.key === key).label;
  assert.equal(app.progress.read().evidence['MG-A01'], `${etiqueta('explicacion')}: ${explicacion.value}\n${etiqueta('proyecto')}: ${textarea.value}`);
  assert.equal(document.querySelector('#m1 [data-db-evidence-status]').getAttribute('data-db-evidence-status'), 'borrador');
  document.querySelector('[data-complete=m1]').click();
  await tick();
  assert.equal(document.querySelector('#progress-label').textContent, '1 de 6');
  assert.equal(app.progress.read().xp, 150);
  await navigate(context, '#home');
  assert.match(document.querySelector('.hero .button').textContent, /Continuar/);
  await navigate(context, '#labs');
  assert.equal(document.querySelectorAll('#labs-catalog .lab-card').length, 13);
  assert.deepEqual([...document.querySelectorAll('.lab-stage h2')].map(node => node.textContent), ['Comprender y decidir', 'Construir y conectar', 'Verificar y entregar']);
  assert.ok([...document.querySelectorAll('.lab-stage')].every(stage => stage.querySelectorAll('.lab-card').length > 0));
  await navigate(context, '#portfolio');
  assert.ok(artifacts.every(artifact => document.querySelector('[data-db-evidence-dossier]').textContent.includes(artifact.name)));
  assert.equal(document.querySelectorAll('.evidence-summary').length, 5);
  assert.match(document.querySelector('.portfolio-stats').textContent, /Pendiente/);
  assert.deepEqual([...document.querySelectorAll('[data-evidence-content="MG-A01"] p')].map(node => node.textContent), app.progress.read().evidence['MG-A01'].split('\n'));
  assert.equal(document.querySelector('[data-evidence-content="MG-A01"] una'), null);
  app.destroy();
  context.dom.window.close();
});

test('el buscador consulta el contenido, orienta sin coincidencias y permite menú por teclado', async () => {
  const context = setup();
  await context.app.ready;
  const { document, dom, app } = context;
  const search = document.querySelector('#guide-search');
  search.value = 'reentrada';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#search-results').hidden, false);
  assert.match(document.querySelector('#search-results a').getAttribute('href'), /m3/);
  search.value = 'sin-coincidencias-únicas';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.match(document.querySelector('#search-results').textContent, /No encontramos/);
  search.value = '';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#search-results').hidden, true);
  document.body.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '/', bubbles: true }));
  assert.equal(document.activeElement, search);
  search.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '/', bubbles: true }));
  document.querySelector('[data-toggle-menu]').click();
  assert.equal(document.querySelector('[data-toggle-menu]').getAttribute('aria-expanded'), 'true');
  const focusable = [...document.querySelectorAll('#sidebar a, #sidebar button')];
  focusable.at(-1).focus();
  document.body.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, focusable[0]);
  document.body.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, focusable.at(-1));
  document.body.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(document.querySelector('[data-toggle-menu]').getAttribute('aria-expanded'), 'false');
  document.querySelector('[data-toggle-menu]').click();
  document.querySelector('[data-close-menu]').click();
  assert.equal(document.querySelector('[data-toggle-menu]').getAttribute('aria-expanded'), 'false');
  await navigate(context, '#m3/1');
  assert.equal(search.value, '');
  app.destroy();
  context.dom.window.close();
});

test('los trece laboratorios ejecutan la simulación real de la UI y conservan errores', async () => {
  const context = setup('#labs');
  await context.app.ready;
  for (const lab of labs) {
    await navigate(context, '#lab/' + lab.id);
    assert.equal(labPage(context, lab.id).querySelector('h1').textContent, lab.title);
    assert.match(labPage(context, lab.id).querySelector('#run-result-' + lab.id).textContent, /próxima comprobación/);
    submit(context, '#lab-form-' + lab.id);
    await tick();
    assert.match(labPage(context, lab.id).querySelector('#run-result-' + lab.id).textContent, /Ejecución terminada/);
    assert.match(labPage(context, lab.id).querySelector('#run-result-' + lab.id).textContent, /no acredita/);
    assert.equal(context.app.progress.read().verified.length, 0);
    context.document.querySelector('[data-reset-lab]').click();
    assert.match(labPage(context, lab.id).querySelector('#run-result-' + lab.id).textContent, /próxima comprobación/);
  }
  await navigate(context, '#lab/elections');
  labPage(context, 'elections').querySelector('#lab-elections-scenario').value = 'invalid';
  submit(context, '#lab-form-elections');
  await tick();
  assert.match(labPage(context, 'elections').querySelector('[role=alert]').textContent, /inválida/);
  labPage(context, 'elections').querySelector('[data-retry]').click();
  await tick();
  assert.match(labPage(context, 'elections').querySelector('[role=alert]').textContent, /inválida/);
  await navigate(context, '#lab/honey');
  labPage(context, 'honey').querySelector('#lab-honey-humidity').value = '22';
  changeMode(context, 'real');
  assert.equal(labPage(context, 'honey').querySelector('#lab-honey-humidity').value, '22');
  submit(context, '#lab-form-honey');
  await tick();
  assert.equal(context.app.progress.read().verified.length, 1);
  assert.match(labPage(context, 'honey').querySelector('#run-result-honey').textContent, /run-observed/);
  changeMode(context, 'simulation');
  assert.equal(labPage(context, 'honey').querySelector('#run-mode-honey').textContent, 'Simulación');
  context.app.destroy();
  context.dom.window.close();
});

test('un fallo de ejecución queda en modalidad real y WebAuthn explica resultado y cancelación', async () => {
  const api = {
    runtime: async () => ({ chain: { connected: false }, database: { connected: false } }),
    run: async () => { throw new Error('Nodo desconectado. Inicia el entorno.'); }
  };
  const context = setup('#lab/architecture', { api, auth: async action => { if (action === 'register') return 'Clave registrada.'; throw new Error('La persona canceló.'); } });
  await context.app.ready;
  labPage(context, 'architecture').querySelector('[data-auth=register]').click();
  await tick();
  assert.match(labPage(context, 'architecture').querySelector('#auth-status-architecture').textContent, /Selecciona Real local/);
  changeMode(context, 'real');
  submit(context, '#lab-form-architecture');
  await tick();
  assert.match(labPage(context, 'architecture').querySelector('#run-result-architecture').textContent, /Nodo desconectado/);
  assert.equal(labPage(context, 'architecture').querySelector('#run-mode-architecture').textContent, 'Real local');
  labPage(context, 'architecture').querySelector('[data-auth=register]').click();
  await tick();
  assert.match(labPage(context, 'architecture').querySelector('#auth-status-architecture').textContent, /Clave registrada/);
  labPage(context, 'architecture').querySelector('[data-auth=login]').click();
  await tick();
  assert.match(labPage(context, 'architecture').querySelector('#auth-status-architecture').textContent, /canceló/);
  assert.match(context.document.querySelector('#environment-chip').textContent, /dependencias/);
  context.app.destroy();
  context.dom.window.close();
});

test('exporta los cinco registros sin otorgar un juicio y libera las descargas', async () => {
  const context = setup('#portfolio');
  await context.app.ready;
  const created = [], revoked = [], downloads = [];
  context.dom.window.URL.createObjectURL = blob => { created.push(blob); return 'blob:local-export'; };
  context.dom.window.URL.revokeObjectURL = url => revoked.push(url);
  context.dom.window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  context.document.querySelector('[data-export=json]').click();
  context.document.querySelector('[data-export=markdown]').click();
  assert.equal(created.length, 2);
  assert.ok(downloads[0].endsWith('.json'));
  assert.ok(downloads[1].endsWith('.md'));
  const progress = context.app.progress.read();
  const json = JSON.parse(exportPortfolio(progress, 'json', new Date('2026-10-21T00:00:00Z')));
  assert.equal(Object.keys(json.evidence).length, 5);
  assert.equal(json.instructorJudgment, 'Pendiente');
  assert.match(exportPortfolio(progress, 'markdown'), /Pendiente de registro/);
  progress.evidence['MG-A01'] = 'Decisión con resultado.';
  assert.match(exportPortfolio(progress, 'markdown'), /Decisión con resultado/);
  await new Promise(resolve => setTimeout(resolve, 1050));
  assert.equal(revoked.length, 2);
  context.app.destroy();
  context.dom.window.close();
});

test('migra evidencias, recupera lección y tolera el almacenamiento bloqueado', async () => {
  const storage = createMemoryStorage({ guia_ia_dinero_programable_evidencia_MG_A01: '{}' });
  storage.setItem('guia_ia_dinero_programable_evidencia_MG-A01', JSON.stringify({ values: { evidencia: 'Registro anterior.' }, status: 'listo' }));
  assert.equal(createProgress(storage).read().evidence['MG-A01'], 'Registro anterior.');
  const brokenStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  const context = setup('#m1/3', { storage: brokenStorage, api: { runtime: async () => { throw new Error('offline'); } } });
  const { dom, app } = context;
  await app.ready;
  await tick();
  const textarea = dom.window.document.querySelector('#dbe-MG-A01-evidencia');
  textarea.value = 'Registro con almacenamiento bloqueado.';
  textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tick();
  assert.equal(dom.window.document.querySelector('#aula').classList.contains('guide-reader'), true);
  assert.equal(app.progress.read().persistenceError, true);
  assert.match(dom.window.document.querySelector('#environment-chip').textContent, /Lectura/);
  app.destroy();
  dom.window.close();
  const resumed = setup('', { savedProgress: { lastRoute: 'm4/2' } });
  await resumed.app.ready;
  assert.equal(resumed.dom.window.location.hash, '#m4/2');
  assert.equal(activeHeading(resumed).textContent, 'Oráculos y datos firmados');
  resumed.app.destroy();
  resumed.dom.window.close();
});

test('sincroniza el progreso anterior con el SDK y migra las estaciones a su registro', async () => {
  const context = setup('', { savedProgress: {
    completed: ['m1'], verified: ['pharma'], evidence: { 'MG-A01': 'Registro anterior con resultado y límites.' }, lastRoute: 'm1/3'
  } });
  await context.app.ready;
  assert.equal(typeof context.dom.window.DevBrainSDK.reader.montarLector, 'function');
  assert.equal(context.dom.window.localStorage.getItem('aula-dinero-v2_completed'), '["m1"]');
  assert.equal(context.dom.window.localStorage.getItem('aula-dinero-v2_xp'), '200');
  assert.equal(context.dom.window.localStorage.getItem('aula-dinero-v2_evidencia_MG-A01') !== null, true);
  assert.equal(context.document.querySelector('#dbe-MG-A01-evidencia').value, 'Registro anterior con resultado y límites.');
  assert.equal(context.document.querySelector('#progress-label').textContent, '1 de 6');
  context.app.destroy();
  context.dom.window.close();
});

test('la ficha de tres bloques se compone para el Portafolio sin perder filas ni escapar HTML', () => {
  const artifact = {
    fields: [
      { key: 'observacion', label: '1 · Observa', type: 'tabla', columns: [{ key: 'a' }, { key: 'b' }] },
      { key: 'explicacion', label: '2 · Explica', type: 'area' },
      { key: 'proyecto', label: '3 · Tu proyecto', type: 'area' },
      { key: 'evidencia', label: 'Notas', type: 'area', required: false }
    ]
  };
  const text = composeEvidence(artifact, { observacion: [{ a: 'Inventario', b: 'Verde' }, { a: 'Garantía', b: '' }], explicacion: '  <b>Gas</b>  ', proyecto: '   ' });
  assert.equal(text, '1 · Observa: Inventario · Verde; Garantía · —\n2 · Explica: <b>Gas</b>');
  assert.equal(composeEvidence(artifact, undefined), '');
  assert.equal(composeEvidence(artifact, { observacion: [], evidencia: 'Registro anterior.' }), 'Notas: Registro anterior.');
  assert.equal(evidenceSummaryHtml(text), '<p>1 · Observa: Inventario · Verde; Garantía · —</p><p>2 · Explica: &lt;b&gt;Gas&lt;/b&gt;</p>');
  assert.equal(evidenceSummaryHtml('  '), '<p>Pendiente de registro.</p>');
});

test('la estación queda lista solo con los bloques obligatorios y la lista de chequeo completos', async () => {
  const context = setup('#m3/3');
  await context.app.ready;
  const { document, dom, app } = context;
  const mga03 = artifacts.find(artifact => artifact.id === 'MG-A03');
  const status = () => document.querySelector('#m3 [data-db-evidence-status]').getAttribute('data-db-evidence-status');
  assert.equal(status(), 'pendiente');
  for (const campo of mga03.fields.filter(item => item.required !== false && item.type !== 'tabla')) {
    const control = document.querySelector(`#dbe-MG-A03-${campo.key}`);
    control.value = `Respuesta de ${campo.key}.`;
    control.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  }
  await tick();
  assert.equal(status(), 'borrador');
  mga03.checklist.forEach((_, index) => {
    const box = document.querySelector(`#dbe-MG-A03-c${index}`);
    box.checked = true;
    box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
  await tick();
  assert.equal(status(), 'lista');
  assert.match(app.progress.read().evidence['MG-A03'], /^1 · Observa/);
  app.destroy();
  dom.window.close();
});

test('las utilidades escapan texto, conservan precisión y explican validaciones', () => {
  assert.equal(escapeHtml('<&"\'>'), '&lt;&amp;&quot;&#39;&gt;');
  assert.match(icon('unknown'), /svg/);
  const dom = new JSDOM('<div id="announcer"></div>');
  const previous = globalThis.document;
  globalThis.document = dom.window.document;
  announce('Guardado.');
  assert.equal(dom.window.document.getElementById('announcer').textContent, 'Guardado.');
  dom.window.document.getElementById('announcer').remove();
  announce('Sin destinatario.');
  globalThis.document = previous;
  dom.window.close();
  assert.equal(parseEtherInput('0.000000000000000001'), 1n);
  assert.equal(formatEtherValue(1000000000000000000n), '1');
  assert.throws(() => parseEtherInput('1e20'), /hasta 18/);
  assert.throws(() => parseEtherInput('0'), /mayor/);
  assert.equal(evaluateHoney({ humidity: -1, hmf: -2, deltaC13: -101 }).accepted, false);
  assert.equal(artifacts.length, 5);
});

test('el código conserva contenido y sangría al resaltar y copiar; el rechazo del portapapeles se explica', async () => {
  const context = setup('#m3/1');
  await context.app.ready;
  const copied = [];
  Object.defineProperty(context.dom.window.navigator, 'clipboard', { configurable: true, value: { writeText: async text => copied.push(text) } });
  const code = context.document.querySelector('#m3 pre code');
  assert.match(code.textContent, /    uint256 monto/);
  assert.ok(code.querySelectorAll('.syntax-keyword').length > 0);
  context.document.querySelector('#m3 [data-copy-code]').click();
  await tick();
  assert.equal(copied[0], code.textContent);
  assert.match(context.document.querySelector('#m3 [data-copy-code]').textContent, /Copiado/);
  delete context.dom.window.navigator.clipboard;
  context.document.querySelector('#m3 [data-copy-code]').click();
  await tick();
  assert.match(context.document.querySelector('#announcer').textContent, /No se pudo copiar/);
  const example = context.document.createElement('section');
  example.innerHTML = '<pre><code></code></pre>';
  example.querySelector('code').textContent = 'const n = 42; return "valor"; &lt;tag&gt;';
  const original = example.textContent;
  decorateCode(context.document, example);
  assert.equal(example.querySelector('code').textContent, original);
  assert.equal(example.querySelectorAll('.syntax-string').length, 1);
  assert.equal(example.querySelectorAll('.syntax-number').length, 1);
  context.app.destroy();
  context.dom.window.close();
});

test('una respuesta tardía no reemplaza la simulación seleccionada ni concede una verificación', async () => {
  let finish, update;
  const pending = new Promise(resolve => { finish = resolve; });
  const context = setup('#lab/pharma', { api: { runtime: async () => ({}), run: async (id, input, observed) => { update = observed; return pending; } } });
  await context.app.ready;
  changeMode(context, 'real');
  submit(context, '#lab-form-pharma');
  await tick();
  changeMode(context, 'simulation');
  update({ labId: 'pharma', mode: 'real', status: 'confirmed' });
  finish({ labId: 'pharma', mode: 'real', status: 'completed', result: { late: true } });
  await tick();
  assert.match(labPage(context, 'pharma').querySelector('#run-result-pharma').textContent, /próxima comprobación/);
  assert.equal(context.app.progress.read().verified.length, 0);
  assert.equal(labPage(context, 'pharma').querySelector('#run-mode-pharma').textContent, 'Simulación');
  context.app.destroy();
  context.dom.window.close();
});

test('una confirmación con indexación pendiente no concede puntos ni una práctica verificada', async () => {
  const context = setup('#lab/pipeline', { api: {
    runtime: async () => ({}),
    run: async () => ({ mode: 'real', status: 'completed', verificationComplete: false,
      phase: { phase: 'index-pending' }, result: { receipt: { hash: '0x1' }, indexing: { status: 'pending' } } })
  } });
  await context.app.ready;
  changeMode(context, 'real');
  submit(context, '#lab-form-pipeline');
  await tick();
  assert.deepEqual(context.app.progress.read().verified, []);
  assert.equal(context.app.progress.read().xp, 0);
  assert.match(context.document.querySelector('#announcer').textContent, /indexación.*pendiente/i);
  assert.doesNotMatch(context.document.querySelector('#announcer').textContent, /Práctica real verificada/);
  context.app.destroy();
  context.dom.window.close();
});

test('el diagrama de inicio es una figura con nombre y el primer módulo regresa al inicio', async () => {
  const { homeView, lessonView } = await import('../../frontend/web/learning/view.mjs');
  const state = createProgress(createMemoryStorage()).read();
  const inicio = new JSDOM(homeView(state)).window.document;
  const diagrama = inicio.querySelector('.hero-diagram');
  assert.equal(diagrama.getAttribute('role'), 'figure');
  assert.match(diagrama.getAttribute('aria-label'), /se confirma en un contrato/);
  const anteriorDe = id => new JSDOM(lessonView(modules.find(m => m.id === id), 0, state)).window.document.querySelector('.lesson-footer a');
  assert.equal(anteriorDe('m1').getAttribute('href'), '#home');
  assert.equal(anteriorDe('m1').textContent, '← Inicio');
  assert.equal(anteriorDe('m3').getAttribute('href'), '#m2/3');
  assert.equal(anteriorDe('m3').textContent, '← Módulo anterior');
});
