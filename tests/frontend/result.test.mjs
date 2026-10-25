import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { resultView } from '../../frontend/web/labs/view.mjs';

test('un fallo conserva la salida real en un detalle accesible y permite reintentar', () => {
  const result = { stderr: 'ParserError: Expected identifier.', attackTests: { stdout: 'La llamada revirtió como se esperaba.' } };
  const dom = new JSDOM(resultView({ status: 'failed', mode: 'real', error: { message: 'La herramienta terminó con errores.' }, result }));
  const document = dom.window.document;
  assert.match(document.querySelector('[role=alert]').textContent, /La herramienta terminó con errores/);
  assert.ok(document.querySelector('details'), 'El error debe conservar un panel de detalle.');
  assert.match(document.querySelector('details > summary').textContent, /detalles de la ejecución/i);
  assert.equal(document.querySelector('details pre code').textContent, JSON.stringify(result, null, 2));
  assert.match(document.querySelector('[data-retry]').textContent, /Reintentar/);
  dom.window.close();
});

test('la salida fallida escapa etiquetas sin ejecutar código ni perder información', () => {
  const result = { stderr: '</code><script>globalThis.intrusion = true</script><img src=x onerror=alert(1)>', attackTests: { stdout: '<b>reverted</b>' } };
  const dom = new JSDOM(resultView({ status: 'failed', mode: 'real', error: { message: '<script>mensaje</script>' }, result }));
  const document = dom.window.document;
  assert.equal(document.querySelector('script'), null);
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('details b'), null);
  assert.equal(document.querySelector('details pre code').textContent, JSON.stringify(result, null, 2));
  assert.match(document.querySelector('[role=alert] > p').textContent, /<script>mensaje<\/script>/);
  assert.match(document.querySelector('details').innerHTML, /&lt;script&gt;/);
  dom.window.close();
});

test('un fallo sin resultado mantiene el mensaje y el reintento sin inventar detalles', () => {
  const dom = new JSDOM(resultView({ status: 'failed', error: {} }));
  assert.equal(dom.window.document.querySelector('details'), null);
  assert.match(dom.window.document.querySelector('[role=alert]').textContent, /Revisa los datos/);
  assert.ok(dom.window.document.querySelector('[data-retry]'));
  dom.window.close();
});
test('el flujo completo presenta seis etapas y sus estados observados antes de la evidencia JSON', () => {
  const labels = ['Captura', 'Firma', 'Verificación', 'Evaluación', 'Transacción', 'Indexación'];
  const stages = labels.map((label, index) => ({ id: String(index), label, status: index === 4 ? 'confirmed' : index === 5 ? 'indexed' : 'completed', result: { observed: index } }));
  const dom = new JSDOM(resultView({ status: 'completed', mode: 'real', result: { stages } }));
  const document = dom.window.document;
  assert.equal(document.querySelectorAll('ol.pipeline-stages > li').length, 6);
  assert.deepEqual([...document.querySelectorAll('.stage-label')].map(node => node.textContent), labels);
  assert.deepEqual([...document.querySelectorAll('.stage-status')].map(node => node.textContent), ['Completada', 'Completada', 'Completada', 'Completada', 'Confirmada', 'Indexada']);
  assert.equal(document.querySelector('details pre code').textContent, JSON.stringify({ stages }, null, 2));
  assert.match(document.querySelector('details > summary').textContent, /datos y referencias/i);
  dom.window.close();
});

test('un flujo rechazado o incompleto no inventa confirmaciones y escapa las etiquetas de etapas', () => {
  const stages = [
    { id: 'capture', label: '<img src=x onerror=alert(1)>', status: 'completed' },
    { id: 'sign', label: 'Firma', status: 'completed' },
    { id: 'verify', label: 'Verificación', status: false, result: false },
    { id: 'evaluate', label: 'Evaluación', status: 'completed', result: { approved: false } },
    { id: 'transaction', label: 'Transacción', status: 'skipped' },
    { id: 'index', label: 'Indexación', status: 'pending' }
  ];
  const dom = new JSDOM(resultView({ status: 'failed', mode: 'real', error: { message: 'Falta indexar el resultado.' }, result: { stages } }));
  const document = dom.window.document;
  assert.equal(document.querySelectorAll('ol.pipeline-stages > li').length, 6);
  assert.deepEqual([...document.querySelectorAll('.stage-status')].map(node => node.textContent), ['Completada', 'Completada', 'Pendiente', 'Completada', 'Sin transacción', 'Pendiente']);
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('.stage-label').textContent, '<img src=x onerror=alert(1)>');
  assert.doesNotMatch(document.querySelector('.pipeline-stages').textContent, /Confirmada|Indexada/);
  assert.ok(document.querySelector('[data-retry]'));
  assert.equal(document.querySelector('details pre code').textContent, JSON.stringify({ stages }, null, 2));
  dom.window.close();
});
test('una transacción pendiente muestra su fase y hash sin anunciar confirmación', () => {
  const phase = { phase: 'pending', hash: '0x1234<script>intrusion()</script>' };
  const dom = new JSDOM(resultView({ status: 'running', mode: 'real', phase, timeline: [phase] }));
  const document = dom.window.document;
  assert.equal(document.querySelector('.phase-current strong')?.textContent, 'Transacción pendiente');
  assert.equal(document.querySelector('.phase-current .phase-hash')?.textContent, phase.hash);
  assert.equal(document.querySelector('script'), null);
  assert.equal(document.querySelectorAll('.operation-timeline > li').length, 1);
  assert.doesNotMatch(document.body.textContent, /Transacción confirmada|Eventos indexados|Ejecución terminada/);
  dom.window.close();
});

test('las transiciones observadas distinguen confirmación y sincronización incluso entre consultas', () => {
  const timeline = [
    { phase: 'pending', hash: '0x1' },
    { phase: 'confirmed', hash: '0x1', blockNumber: 24 },
    { phase: 'indexing' },
    { phase: 'indexed' }
  ];
  const dom = new JSDOM(resultView({ status: 'completed', mode: 'real', phase: timeline.at(-1), timeline, result: { accepted: true } }));
  const document = dom.window.document;
  assert.equal(document.querySelector('.phase-current strong')?.textContent, 'Eventos indexados');
  assert.deepEqual([...document.querySelectorAll('.operation-timeline .phase-label')].map(node => node.textContent), ['Transacción pendiente', 'Transacción confirmada', 'Sincronizando eventos', 'Eventos indexados']);
  assert.deepEqual([...document.querySelectorAll('.operation-timeline .phase-hash')].map(node => node.textContent), ['0x1', '0x1']);
  assert.match(document.querySelector('.operation-timeline').textContent, /Bloque 24/);
  dom.window.close();
});

test('la indexación fallida conserva confirmaciones anteriores y señala la dependencia pendiente', () => {
  const dom = new JSDOM(resultView({ status: 'failed', mode: 'real', phase: { phase: 'index-pending' }, timeline: [{ phase: 'confirmed', hash: '<img src=x onerror=alert(1)>' }, { phase: 'index-pending' }, { phase: 'unknown<script>' }], error: { message: 'PostgreSQL no está disponible.' } }));
  const document = dom.window.document;
  assert.equal(document.querySelector('.phase-current strong')?.textContent, 'Indexación pendiente');
  assert.deepEqual([...document.querySelectorAll('.operation-timeline .phase-label')].map(node => node.textContent), ['Transacción confirmada', 'Indexación pendiente', 'Estado por comprobar']);
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('script'), null);
  assert.match(document.querySelector('[role=alert]').textContent, /PostgreSQL/);
  assert.ok(document.querySelector('[data-retry]'));
  dom.window.close();
});
