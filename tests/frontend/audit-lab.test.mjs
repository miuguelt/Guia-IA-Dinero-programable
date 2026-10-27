import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { AUDIT_CHECKS, AUDIT_SCENARIOS, describeDetector, impactLabel, confidenceLabel, simulateAudit } from '../../frontend/web/labs/audit-model.mjs';
import { auditResultView } from '../../frontend/web/labs/results.mjs';
import { simulateLab } from '../../frontend/web/labs/simulation.mjs';
import { labs } from '../../frontend/web/labs/catalog.mjs';

const statusOf = result => Object.fromEntries(result.checks.map(check => [check.id, check.status]));
const render = (result, mode = 'simulation') => new JSDOM(`<main>${auditResultView(result, mode)}</main>`).window.document;

test('cada comprobación explica qué protege, dónde está en el código y qué prueba la demuestra', () => {
  assert.deepEqual(AUDIT_CHECKS.map(check => check.id), ['oracle', 'cei', 'batch', 'empty']);
  for (const check of AUDIT_CHECKS) {
    for (const key of ['title', 'protects', 'code', 'test']) assert.ok(check[key].length > 10, `${check.id}.${key}`);
  }
  assert.match(AUDIT_CHECKS.find(check => check.id === 'oracle').code, /soloOraculoIA/);
  assert.match(AUDIT_CHECKS.find(check => check.id === 'cei').test, /WithdrawalSecurity/);
  assert.match(AUDIT_CHECKS.find(check => check.id === 'empty').code, /SinSaldoPendiente/);
});

test('el catálogo ofrece las mismas versiones del contrato que el modelo simula', () => {
  const lab = labs.find(item => item.id === 'audit');
  const field = lab.fields.find(item => item.key === 'scenario');
  assert.deepEqual(field.options.map(([id]) => id), Object.keys(AUDIT_SCENARIOS));
  assert.equal(lab.defaults.scenario, 'protected');
  assert.ok(lab.concepts.length >= 6);
  assert.match(lab.notice, /no garantiza/);
});

test('la versión protegida aprueba aunque el analizador informe hallazgos informativos y del adversario', () => {
  const result = simulateAudit({ scenario: 'protected' });
  assert.deepEqual(statusOf(result), { oracle: 'ok', cei: 'ok', batch: 'ok', empty: 'ok' });
  assert.equal(result.staticPassed, true);
  assert.equal(result.attackTest.passed, true);
  assert.equal(result.passed, true);
  assert.ok(result.findings.some(finding => finding.scope === 'fixture'));
  assert.ok(result.findings.filter(finding => finding.scope === 'production').every(finding => !['High', 'Medium'].includes(finding.impact)));
});

test('la reentrada la detectan el analizador y la prueba de ataque', () => {
  const result = simulateAudit({ scenario: 'reentrancy' });
  assert.equal(statusOf(result).cei, 'failed');
  assert.ok(result.findings.some(finding => finding.scope === 'production' && finding.impact === 'High' && finding.detector === 'reentrancy-eth'));
  assert.equal(result.staticPassed, false);
  assert.equal(result.attackTest.passed, false);
  assert.equal(result.passed, false);
});

for (const [scenario, check] of [['no-access', 'oracle'], ['replay', 'batch']]) {
  test(`el escenario ${scenario} pasa el análisis estático pero falla la prueba`, () => {
    const result = simulateAudit({ scenario });
    assert.equal(statusOf(result)[check], 'failed');
    assert.equal(result.staticPassed, true, 'Slither no detecta errores de permisos ni de lógica de negocio');
    assert.equal(result.attackTest.passed, false);
    assert.equal(result.passed, false);
    assert.match(result.explanation, /Slither no/);
  });
}

test('un escenario desconocido se rechaza con un mensaje claro y la entrada vacía usa la versión protegida', () => {
  assert.throws(() => simulateAudit({ scenario: 'otro' }), /Elige una de las versiones/);
  assert.equal(simulateAudit({}).scenario, 'protected');
  assert.equal(simulateAudit().scenario, 'protected');
  const record = simulateLab('audit', { scenario: 'reentrancy' });
  assert.equal(record.status, 'completed');
  assert.equal(record.result.scenario, 'reentrancy');
  assert.equal(simulateLab('audit', { scenario: 'x' }).status, 'failed');
});

test('traduce impacto, confianza y detectores, con respaldo para valores desconocidos', () => {
  assert.equal(impactLabel('High'), 'Alto');
  assert.equal(impactLabel('Optimization'), 'Optimización');
  assert.equal(impactLabel('Raro'), 'Raro');
  assert.equal(impactLabel(undefined), 'Sin clasificar');
  assert.equal(confidenceLabel('Medium'), 'Media');
  assert.equal(confidenceLabel(null), 'Sin clasificar');
  assert.match(describeDetector('reentrancy-eth'), /vuelva a llamar/);
  assert.match(describeDetector('detector-nuevo'), /documentación de Slither/);
  assert.match(describeDetector(undefined), /documentación de Slither/);
});

test('la vista simulada muestra veredicto, tabla de comprobaciones y hallazgos separados por alcance', () => {
  const document = render(simulateAudit({ scenario: 'reentrancy' }));
  assert.match(document.querySelector('.audit-verdict').textContent, /Requiere corrección/);
  const rows = document.querySelectorAll('.audit-checks > li');
  assert.equal(rows.length, 4);
  assert.match(rows[1].querySelector('.audit-check-head').textContent, /Estado antes de llamadas externasFalla/);
  assert.match(rows[0].querySelector('.audit-check-head').textContent, /Cumple/);
  assert.deepEqual([...rows[0].querySelectorAll('dt')].map(node => node.textContent), ['Qué protege', 'Dónde está en el código', 'Prueba que lo demuestra']);
  assert.match(document.querySelector('.audit-checks').previousElementSibling.textContent, /Comprobaciones/);
  const groups = [...document.querySelectorAll('.audit-findings h4')].map(node => node.textContent);
  assert.ok(groups.some(text => /Contrato de producción/.test(text)));
  assert.ok(groups.some(text => /Archivo adversario/.test(text)));
  assert.match(document.body.textContent, /Alto/);
  assert.doesNotMatch(document.body.textContent, /\bHigh\b/);
  assert.match(document.querySelector('.audit-attack').textContent, /falló/);
});

test('la vista simulada aprobada explica que el aprobado no garantiza seguridad', () => {
  const document = render(simulateAudit({ scenario: 'no-access' }));
  assert.match(document.querySelector('.audit-verdict').textContent, /Requiere corrección/);
  assert.match(document.querySelector('.audit-verdict').textContent, /análisis estático no encontró/);
  const approved = render(simulateAudit({ scenario: 'protected' }));
  assert.match(approved.querySelector('.audit-verdict').textContent, /Revisión aprobada/);
  assert.match(approved.querySelector('.audit-attack').textContent, /pasó/);
});

test('la vista real agrupa hallazgos de Slither, traduce valores y escapa el texto del analizador', () => {
  const result = {
    task: 'audit', success: true, passed: false, staticPassed: false, analysisCompleted: true, contractsAnalyzed: 9,
    attackTests: { success: true, durationMs: 1830 },
    findings: [
      { detector: 'reentrancy-eth', impact: 'High', confidence: 'Medium', description: '<img src=x onerror=alert(1)> call', scope: 'production', locations: [{ file: 'contracts/<b>Base</b>.sol', lines: [129, 130, 138] }] },
      { detector: 'desconocido', impact: 'Low', confidence: 'High', description: 'texto', scope: 'fixture', locations: [{ file: 'contracts/fixtures/AdversarioRetiro.sol' }] }
    ]
  };
  const document = render(result, 'real');
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('.audit-findings b'), null);
  assert.match(document.body.textContent, /Slither analizó 9 contratos/);
  assert.match(document.body.textContent, /contracts\/<b>Base<\/b>\.sol:129-138/);
  assert.match(document.body.textContent, /contracts\/fixtures\/AdversarioRetiro\.sol/);
  assert.match(document.querySelector('.audit-attack').textContent, /pasó.*1,8 s/s);
  assert.match(document.querySelector('.audit-findings details summary').textContent, /Texto original del analizador/);
  assert.match(document.body.textContent, /<img src=x onerror=alert\(1\)> call/);
  assert.equal(document.querySelector('.audit-checks'), null, 'en real no se inventa el estado de las comprobaciones');
  assert.ok(document.querySelector('.audit-reference'), 'en real se conserva la guía de comprobaciones como referencia');
});

test('la vista real agrupa detectores repetidos, ordena por gravedad y resume ubicaciones largas', () => {
  const at = (file, line) => ({ file, lines: [line] });
  const findings = [
    ...[1, 2, 3, 4, 5].map(line => ({ detector: 'naming-convention', impact: 'Informational', confidence: 'High', description: `Nombre ${line}`, scope: 'production', locations: [at('contracts/A.sol', line)] })),
    { detector: 'reentrancy-events', impact: 'Low', confidence: 'Medium', description: 'Evento', scope: 'production', locations: [at('contracts/B.sol', 9)] },
    { detector: 'locked-ether', impact: 'Medium', confidence: 'High', description: 'ETH bloqueado', scope: 'fixture', locations: [at('contracts/fixtures/X.sol', 3)] }
  ];
  const document = render({ task: 'audit', success: true, passed: true, staticPassed: true, analysisCompleted: true, findings, attackTests: { success: true } }, 'real');
  const production = document.querySelectorAll('.audit-finding-group')[0];
  const cards = production.querySelectorAll('.audit-finding');
  assert.equal(cards.length, 2, 'un detector repetido se presenta una sola vez');
  assert.equal(cards[0].querySelector('code').textContent, 'reentrancy-events', 'primero el impacto más alto');
  assert.match(cards[1].textContent, /5 apariciones/);
  assert.match(cards[1].querySelector('.audit-location summary').textContent, /Ver las 5 ubicaciones/);
  assert.equal(cards[1].querySelectorAll('.audit-original li').length, 5);
  assert.match(production.querySelector('h4').textContent, /6 hallazgos/);
  assert.match(describeDetector('locked-ether'), /recibir ETH/);
  assert.match(describeDetector('erc20-interface'), /ERC-20/);
  assert.match(describeDetector('missing-inheritance'), /interfaz/);
});

test('la vista real sin hallazgos ni pruebas indica lo que falta sin certificar seguridad', () => {
  const clean = render({ task: 'audit', success: true, passed: true, staticPassed: true, analysisCompleted: true, findings: [], attackTests: { success: true } }, 'real');
  assert.match(clean.querySelector('.audit-verdict').textContent, /Revisión aprobada/);
  assert.match(clean.body.textContent, /No hay hallazgos/);
  const compileFailed = render({ task: 'audit', success: false, exitCode: 1, stderr: 'ParserError' }, 'real');
  assert.match(compileFailed.querySelector('.audit-verdict').textContent, /compilación/);
  const missingTool = render({ task: 'audit', success: false, code: 'TOOL_UNAVAILABLE', findings: [], attackTests: { success: true } }, 'real');
  assert.match(missingTool.body.textContent, /uv tool install slither-analyzer/);
  const attackFailed = render({ task: 'audit', success: false, code: 'ATTACK_TESTS_FAILED', analysisCompleted: true, findings: [], attackTests: { success: false }, toolError: 'La comprobación de ataque falló.' }, 'real');
  assert.match(attackFailed.querySelector('.audit-attack').textContent, /falló/);
  assert.match(attackFailed.body.textContent, /La comprobación de ataque falló/);
  const invalid = render({ task: 'audit', success: false, code: 'AUDIT_OUTPUT_INVALID', findings: [], attackTests: { success: true } }, 'real');
  assert.match(invalid.body.textContent, /no devolvió un informe legible/);
});
