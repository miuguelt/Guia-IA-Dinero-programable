import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { mountGuideEvidence } from '../../frontend/web/navigation/sdk-adapter.mjs';
import { createProgress, createMemoryStorage } from '../../frontend/web/learning/progress.mjs';

const prosePath = fileURLToPath(new URL('../../frontend/web/devbrain-prose.js', import.meta.url));
const proseSource = readFileSync(prosePath, 'utf8');

// Carga el script compartido en la ventana de jsdom con su ruta real para medir su cobertura.
function loadProse(dom, { loading = false, withModule = false } = {}) {
  const win = dom.window;
  const observed = [];
  win.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observed.push(this); this.targets = new Set(); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
  };
  Object.defineProperty(win.document, 'readyState', { configurable: true, get: () => loading ? 'loading' : 'complete' });
  const context = dom.getInternalVMContext();
  if (withModule) context.module = { exports: {} };
  new vm.Script(proseSource, { filename: prosePath }).runInContext(context);
  return { observed, module: context.module };
}
function width(element, value) {
  element.getBoundingClientRect = () => ({ width: value });
}

test('la prosa se justifica desde 40rem y vuelve a alineación inicial en regiones estrechas', async () => {
  const dom = new JSDOM('<main><p id="ancho">Texto</p><p id="estrecho" style="text-align: right">Texto</p><nav><p id="menu">Menú</p></nav></main>', { pretendToBeVisual: true, runScripts: 'outside-only' });
  const doc = dom.window.document;
  width(doc.getElementById('ancho'), 700); width(doc.getElementById('estrecho'), 300); width(doc.getElementById('menu'), 900);
  const { observed } = loadProse(dom);
  const layout = dom.window.DevBrainProseLayout;
  assert.ok(layout);
  assert.equal(doc.getElementById('ancho').style.textAlign, 'justify');
  assert.equal(doc.getElementById('ancho').style.getPropertyValue('--text-align-reading'), 'justify');
  assert.equal(doc.getElementById('estrecho').style.textAlign, 'start');
  assert.equal(doc.getElementById('menu').style.textAlign, '', 'la navegación conserva su alineación');

  // El ResizeObserver recalcula cuando cambia el ancho del párrafo.
  width(doc.getElementById('ancho'), 200);
  observed[0].callback([{ target: doc.getElementById('ancho') }]);
  assert.equal(doc.getElementById('ancho').style.textAlign, 'start');

  // Un párrafo nuevo se mide al insertarse y uno retirado deja de observarse.
  const nuevo = doc.createElement('p');
  width(nuevo, 800);
  doc.querySelector('main').append(nuevo);
  doc.getElementById('estrecho').remove();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(nuevo.style.textAlign, 'justify');
  assert.equal(observed[0].targets.has(doc.getElementById('estrecho')), false);

  dom.window.dispatchEvent(new dom.window.Event('resize'));
  layout.destroy();
  assert.equal(doc.getElementById('ancho').style.getPropertyValue('--text-align-reading'), '');
  assert.equal(doc.getElementById('ancho').style.textAlign, '');
  assert.equal(nuevo.style.textAlign, '');
});

test('la prosa espera al documento, no se monta dos veces y expone su API como módulo', () => {
  const dom = new JSDOM('<p>Texto</p>', { pretendToBeVisual: true, runScripts: 'outside-only' });
  const { module } = loadProse(dom, { loading: true, withModule: true });
  assert.equal(typeof module.exports.initProseLayout, 'function');
  assert.equal(dom.window.DevBrainProseLayout, undefined);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const primero = dom.window.DevBrainProseLayout;
  assert.ok(primero);
  module.exports.start();
  assert.equal(dom.window.DevBrainProseLayout, primero);
  primero.destroy();
});

test('una evidencia editada en el SDK se guarda aunque no se indique otra reacción', async () => {
  const suscriptores = [];
  const store = { suscribir: callback => { suscriptores.push(callback); return () => {}; }, leer: () => ({ values: { evidencia: '' } }) };
  const sdk = { evidence: { Store: class { leer() { return { values: {} }; } guardar() {} }, montar: async () => ({ store }) } };
  const progress = createProgress(createMemoryStorage());
  const fields = [{ key: 'proyecto', label: '3 · Tu proyecto', type: 'area' }, { key: 'evidencia', label: 'Notas', type: 'area', required: false }];
  const montado = await mountGuideEvidence({ sdk, root: {}, registry: { artifacts: [{ id: 'MG-A01', fields }] }, progress });
  suscriptores[0]('MG-A01', { values: { proyecto: 'Decisión con fuentes.', evidencia: 'Registro anterior.' } });
  suscriptores[0]('OTRA', { values: { evidencia: 'Ignorada.' } });
  assert.equal(progress.read().evidence['MG-A01'], '3 · Tu proyecto: Decisión con fuentes.\nNotas: Registro anterior.');
  assert.equal(typeof montado.destroy, 'function');
});
