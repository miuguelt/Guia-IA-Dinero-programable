import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { markScrollableRegions, watchScrollableRegions } from '../../frontend/web/navigation/scroll-regions.mjs';

function medir(element, scrollWidth, clientWidth) {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, get: () => scrollWidth });
  Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => clientWidth });
}

test('solo las regiones que se desplazan entran al orden de tabulación', () => {
  const { window } = new JSDOM('<main><table id="ancha"></table><table id="estrecha"></table><pre id="codigo" tabindex="0"></pre><pre class="result-json" id="json"></pre><div class="dossier-table" id="dosier"></div></main>');
  const root = window.document.querySelector('main');
  const [ancha, estrecha, codigo, json, dosier] = ['ancha', 'estrecha', 'codigo', 'json', 'dosier'].map(id => window.document.getElementById(id));
  medir(ancha, 600, 300); medir(estrecha, 300, 300); medir(codigo, 10, 900); medir(json, 900, 300); medir(dosier, 700, 320);
  markScrollableRegions(root);
  assert.equal(ancha.getAttribute('tabindex'), '0');
  assert.equal(estrecha.hasAttribute('tabindex'), false);
  assert.equal(json.getAttribute('tabindex'), '0');
  assert.equal(dosier.getAttribute('tabindex'), '0');
  // Un tabindex propio (bloque de código decorado) no se modifica.
  assert.equal(codigo.getAttribute('tabindex'), '0');
  assert.equal(codigo.hasAttribute('data-scroll-region'), false);
  // Al ensancharse la ventana, la región deja de desplazarse y sale del orden de tabulación.
  medir(ancha, 300, 300);
  markScrollableRegions(root);
  assert.equal(ancha.hasAttribute('tabindex'), false);
  assert.equal(ancha.hasAttribute('data-scroll-region'), false);
});

test('el observador marca contenido nuevo, responde al cambio de tamaño y se detiene al destruirlo', async () => {
  const { window } = new JSDOM('<main></main>', { pretendToBeVisual: true });
  const root = window.document.querySelector('main');
  const espera = () => new Promise(resolve => setTimeout(resolve, 80));
  const vigilante = watchScrollableRegions({ window, root });
  const tabla = window.document.createElement('table');
  medir(tabla, 800, 320);
  root.append(tabla);
  await espera();
  assert.equal(tabla.getAttribute('tabindex'), '0');
  medir(tabla, 320, 320);
  window.dispatchEvent(new window.Event('resize'));
  await espera();
  assert.equal(tabla.hasAttribute('tabindex'), false);
  vigilante.schedule();
  vigilante.destroy();
  medir(tabla, 800, 320);
  root.append(window.document.createElement('p'));
  await espera();
  assert.equal(tabla.hasAttribute('tabindex'), false);
});

test('los bloques de código conservan sus líneas y los cortes forzados declaran su excepción', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../../frontend/web/styles.css', import.meta.url), 'utf8');
  const reglaCodigo = css.split('\n').find(linea => linea.startsWith('.lesson-body pre,pre.result-json {'));
  assert.ok(reglaCodigo, 'falta la regla de bloques de código');
  assert.match(reglaCodigo, /white-space:\s*pre;/);
  assert.match(reglaCodigo, /overflow-x:\s*auto;/);
  assert.doesNotMatch(reglaCodigo, /overflow-wrap:\s*anywhere|word-break:\s*break-(word|all)/);
  for (const linea of css.split('\n').filter(l => /overflow-wrap:\s*anywhere|word-break:\s*break-all/.test(l))) {
    assert.match(linea, /text-layout-exception: \S.+\*\//, `sin excepción declarada: ${linea.slice(0, 60)}`);
  }
});
