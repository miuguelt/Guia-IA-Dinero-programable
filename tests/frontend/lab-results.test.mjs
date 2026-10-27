import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { genericResultView } from '../../frontend/web/labs/results.mjs';
import { labView, resultView } from '../../frontend/web/labs/view.mjs';
import { labs } from '../../frontend/web/labs/catalog.mjs';
import { simulateLab } from '../../frontend/web/labs/simulation.mjs';

const lab = id => labs.find(item => item.id === id);
const parse = html => new JSDOM(`<main>${html}</main>`).window.document;

test('la vista genérica presenta explicación, sí/no, listas y opciones con su nombre visible', () => {
  const document = parse(genericResultView({ action: 'deposit', balanceEth: '1.01', accepted: false, reasons: [], votes: [1, 0, 0], explanation: 'Modelo de saldos.' }, lab('evm')));
  assert.equal(document.querySelector('.result-explanation').textContent, 'Modelo de saldos.');
  const pairs = Object.fromEntries([...document.querySelectorAll('.result-summary > div')].map(node => [node.querySelector('dt').textContent, node.querySelector('dd').textContent]));
  assert.equal(pairs['Operación'], 'Depositar garantía');
  assert.equal(pairs['Garantía disponible (ETH)'], '1.01');
  assert.equal(pairs['¿Se acepta?'], 'No');
  assert.equal(pairs['Razones'], 'Ninguna');
  assert.deepEqual([...document.querySelectorAll('.result-summary li')].map(node => node.textContent), ['1', '0', '0']);
});

test('la vista genérica convierte listas de objetos en tablas y objetos anidados en descripciones', () => {
  const document = parse(genericResultView({ scenarios: [{ name: 'Depósito', effect: 'Aumenta' }, { name: 'Retiro', gasUsed: 21000 }], receipt: { hash: '0xabc', blockNumber: 7 }, nada: null }));
  const table = document.querySelector('table');
  assert.deepEqual([...table.querySelectorAll('th')].map(node => node.textContent), ['Nombre', 'Efecto', 'Gas usado']);
  assert.equal(table.querySelectorAll('tbody tr').length, 2);
  assert.equal(table.querySelector('tbody tr:last-child td:nth-child(2)').textContent, '—');
  assert.equal(document.querySelector('.table-scroll > table caption.visually-hidden').textContent, 'Escenarios', 'la tabla conserva su nombre accesible sin repetir el rótulo visible');
  assert.ok(table.closest('.result-wide'), 'la tabla ocupa toda la fila del resumen');
  assert.equal(document.querySelector('.result-summary > div:last-child').classList.contains('result-wide'), false);
  assert.match(document.querySelector('.result-summary dl').textContent, /Bloque7/);
  assert.doesNotMatch(document.body.textContent, /nada/i);
});

test('la vista genérica escapa valores, nombra claves desconocidas y muestra salidas largas como bloque de código', () => {
  const document = parse(genericResultView({ customValue: '<script>x</script>', stdout: 'línea 1\nlínea 2', task: 'otra' }, lab('pc')));
  assert.equal(document.querySelector('script'), null);
  const terms = [...document.querySelectorAll('dt')].map(node => node.textContent);
  assert.ok(terms.includes('Custom value'));
  assert.equal(document.querySelector('pre.result-json code').textContent, 'línea 1\nlínea 2');
  assert.match(document.body.textContent, /otra/);
  assert.equal(genericResultView(undefined), '');
  assert.equal(genericResultView('texto'), '');
});

test('el resultado completado usa la vista legible y deja el JSON en datos técnicos', () => {
  const record = simulateLab('pharma', lab('pharma').defaults);
  const document = parse(resultView(record, 'pharma'));
  assert.ok(document.querySelector('.result-summary'));
  assert.match(document.querySelector('details > summary').textContent, /Ver datos técnicos/);
  assert.equal(document.querySelector('details pre code').textContent, JSON.stringify(record.result, null, 2));
  assert.equal(document.querySelectorAll('pre').length, document.querySelectorAll('details pre').length, 'el JSON no queda visible fuera del detalle');
  const audit = parse(resultView(simulateLab('audit', { scenario: 'protected' }), 'audit'));
  assert.ok(audit.querySelector('.audit-verdict'));
  assert.equal(audit.querySelector('.result-summary'), null);
  const failed = parse(resultView({ labId: 'audit', status: 'failed', mode: 'real', error: { message: 'Falló.' }, result: { task: 'audit', success: false, code: 'TOOL_UNAVAILABLE', findings: [], attackTests: { success: true } } }));
  assert.ok(failed.querySelector('[role=alert] .audit-verdict'), 'el identificador del registro selecciona la vista de auditoría');
  assert.match([...failed.querySelectorAll('details > summary')].at(-1).textContent, /detalles de la ejecución/);
});

test('el estado vacío distingue laboratorios con y sin datos para ajustar', () => {
  assert.match(resultView(null, 'pharma'), /Ajusta los datos/);
  assert.doesNotMatch(resultView(null, 'architecture'), /Ajusta los datos/);
  assert.match(resultView(null), /Ajusta los datos/);
});

test('cada laboratorio muestra solo su propio aviso y la auditoría sus conceptos clave', () => {
  const audit = parse(labView(lab('audit'), 'simulation'));
  assert.doesNotMatch(audit.body.textContent, /Una firma válida/);
  assert.match(audit.querySelector('.lab-notice').textContent, /no garantiza/);
  const terms = [...audit.querySelectorAll('.lab-concepts dt')].map(node => node.textContent);
  for (const term of ['Slither', 'Hallazgo', 'Impacto', 'Contrato de producción', 'Archivo adversario']) assert.ok(terms.includes(term), term);
  assert.ok(audit.querySelector('select[name=scenario]'));
  const signatures = parse(labView(lab('signatures'), 'simulation'));
  assert.match(signatures.querySelector('.lab-notice').textContent, /Una firma válida/);
  assert.equal(signatures.querySelector('.lab-concepts'), null);
  const database = parse(labView(lab('database'), 'simulation'));
  assert.equal(database.querySelector('.lab-notice'), null);
});
