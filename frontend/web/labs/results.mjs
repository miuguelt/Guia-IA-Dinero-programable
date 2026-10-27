import { escapeHtml } from '../dom.mjs';
import { AUDIT_CHECKS, blocksReview, confidenceLabel, describeDetector, impactLabel } from './audit-model.mjs';

// Vistas legibles del resultado de cada laboratorio. El JSON completo se conserva aparte, en «Ver datos técnicos».
const TOOL_MESSAGES = {
  TOOL_UNAVAILABLE: 'Slither no está instalado o no puede iniciarse. Instálalo con winget install --id astral-sh.uv -e y después uv tool install slither-analyzer==0.11.6.',
  AUDIT_OUTPUT_INVALID: 'Slither terminó, pero no devolvió un informe legible. Compila el proyecto y ejecuta de nuevo la revisión.',
  ATTACK_TESTS_FAILED: 'La prueba de ataque falló: el contrato no resistió al adversario o la prueba no pudo ejecutarse. Revisa su salida en los detalles de la ejecución.'
};
const SCOPES = [['production', 'Contrato de producción', 'Lo que se desplegaría para usuarios reales. Los hallazgos altos o medios bloquean la revisión.'], ['fixture', 'Archivo adversario de prueba', 'Contratos que atacan a propósito durante las pruebas. Sus hallazgos se esperan y no bloquean la revisión.']];

function seconds(ms) { return (ms / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 }); }
function plural(count, singular, pluralForm) { return `${count} ${count === 1 ? singular : pluralForm}`; }

function locationText(location) {
  const file = location.file ? escapeHtml(location.file) : 'Ubicación no informada';
  const lines = Array.isArray(location.lines) ? location.lines.filter(Number.isFinite) : [];
  if (!lines.length) return file;
  const first = Math.min(...lines), last = Math.max(...lines);
  return `${file}:${first === last ? first : `${first}-${last}`}`;
}

function auditVerdict(result, mode) {
  const findings = Array.isArray(result.findings) ? result.findings : null;
  if (mode !== 'simulation' && !findings && result.success === false) {
    return verdictCard(false, 'La compilación falló', 'Slither y la prueba de ataque no se ejecutaron porque el proyecto no compiló. Corrige el error que aparece en los detalles y vuelve a ejecutar.');
  }
  const attackPassed = mode === 'simulation' ? result.attackTest?.passed === true : result.attackTests?.success === true;
  if (result.passed === true) return verdictCard(true, 'Revisión aprobada', 'La prueba de ataque pasó y no hay hallazgos altos ni medios en el contrato de producción. Esto no garantiza que el contrato sea seguro: solo que superó estas dos revisiones.');
  const blocking = (findings || []).filter(blocksReview).length;
  const reasons = [];
  if (result.staticPassed !== false && !blocking) reasons.push('El análisis estático no encontró hallazgos que bloqueen la revisión.');
  else reasons.push(`Slither encontró ${plural(blocking, 'hallazgo alto o medio', 'hallazgos altos o medios')} en el contrato de producción.`);
  if (!attackPassed) reasons.push('La prueba de ataque falló.');
  if (mode !== 'simulation' && result.analysisCompleted === false) reasons.push('El análisis de Slither no terminó.');
  return verdictCard(false, 'Requiere corrección', reasons.join(' '));
}

function verdictCard(approved, title, reason) {
  return `<div class="audit-verdict ${approved ? 'is-approved' : 'needs-fix'}"><strong>${title}</strong><p>${reason}</p></div>`;
}

function checksList(statuses) {
  const status = Object.fromEntries((statuses || []).map(item => [item.id, item.status]));
  const pill = id => statuses ? `<span class="pill ${status[id] === 'failed' ? 'negative' : 'positive'}">${status[id] === 'failed' ? 'Falla' : 'Cumple'}</span>` : '';
  return `<h3>Comprobaciones de seguridad del contrato</h3><ol class="${statuses ? 'audit-checks' : 'audit-reference-list'}" role="list">${AUDIT_CHECKS.map(check => `<li class="audit-check"><div class="audit-check-head"><strong>${check.title}</strong>${pill(check.id)}</div><dl><div><dt>Qué protege</dt><dd>${check.protects}</dd></div><div><dt>Dónde está en el código</dt><dd>${check.code}</dd></div><div><dt>Prueba que lo demuestra</dt><dd>${check.test}</dd></div></dl></li>`).join('')}</ol>`;
}

function attackSection(result, mode) {
  if (mode === 'simulation') {
    return `<div class="audit-attack"><h3>Prueba de ataque</h3><p><strong>${result.attackTest?.passed ? 'La prueba de ataque pasó.' : 'La prueba de ataque falló.'}</strong> ${escapeHtml(result.attackTest?.detail || '')}</p></div>`;
  }
  const tests = result.attackTests;
  const text = !tests ? 'La prueba de ataque no se ejecutó.' : tests.success ? 'La prueba de ataque pasó' : 'La prueba de ataque falló';
  const duration = tests && Number.isFinite(tests.durationMs) ? ` (${seconds(tests.durationMs)} s)` : '';
  return `<div class="audit-attack"><h3>Prueba de ataque</h3><p><strong>${text}${tests ? duration + '.' : ''}</strong> WithdrawalSecurity.test.js despliega AdversarioRetiro, que intenta reentrar durante el retiro.</p></div>`;
}

const IMPACT_ORDER = ['High', 'Medium', 'Low', 'Informational', 'Optimization'];
const impactRank = impact => IMPACT_ORDER.includes(impact) ? IMPACT_ORDER.indexOf(impact) : IMPACT_ORDER.length;

// Slither repite un detector por cada aparición; se agrupan para que una convención de nombres no tape un riesgo real.
function groupByDetector(findings) {
  const groups = new Map();
  for (const item of findings) {
    const key = [item.detector, item.impact, item.confidence].join('|');
    if (!groups.has(key)) groups.set(key, { detector: item.detector, impact: item.impact, confidence: item.confidence, items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()].sort((a, b) => impactRank(a.impact) - impactRank(b.impact) || b.items.length - a.items.length);
}

function findingItem(group) {
  const locations = group.items.flatMap(item => item.locations || []).map(locationText);
  const list = locations.join('<br>') || 'Ubicación no informada';
  const descriptions = group.items.map(item => item.description).filter(Boolean);
  return `<li class="audit-finding"><div class="audit-finding-head"><code>${escapeHtml(group.detector || 'detector sin nombre')}</code><span class="pill">Impacto: ${escapeHtml(impactLabel(group.impact))}</span><span class="pill">Confianza: ${escapeHtml(confidenceLabel(group.confidence))}</span>${group.items.length > 1 ? `<span class="pill">${group.items.length} apariciones</span>` : ''}</div><p>${describeDetector(group.detector)}</p><div class="audit-location">${locations.length > 3 ? `<details><summary>Ver las ${locations.length} ubicaciones</summary><p>${list}</p></details>` : `<p>${list}</p>`}</div>${descriptions.length ? `<details class="audit-original"><summary>Texto original del analizador (en inglés)</summary>${descriptions.length > 1 ? `<ul>${descriptions.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : `<p>${escapeHtml(descriptions[0])}</p>`}</details>` : ''}</li>`;
}

function findingsSection(findings, mode) {
  const title = mode === 'simulation' ? 'Hallazgos del analizador (modelo del ejercicio)' : 'Hallazgos de Slither';
  if (!findings.length) return `<section class="audit-findings"><h3>${title}</h3><p>No hay hallazgos.</p></section>`;
  return `<section class="audit-findings"><h3>${title}</h3>${SCOPES.map(([scope, label, help]) => {
    const group = findings.filter(item => (item.scope === 'fixture' ? 'fixture' : 'production') === scope);
    return `<div class="audit-finding-group"><h4>${label} (${plural(group.length, 'hallazgo', 'hallazgos')})</h4><p class="field-hint">${help}</p>${group.length ? `<ul class="audit-finding-list">${groupByDetector(group).map(findingItem).join('')}</ul>` : '<p>No hay hallazgos en este grupo.</p>'}</div>`;
  }).join('')}</section>`;
}

export function auditResultView(result, mode) {
  const findings = Array.isArray(result.findings) ? result.findings : [];
  const toolMessage = mode === 'simulation' ? '' : [TOOL_MESSAGES[result.code], result.toolError].filter(Boolean).map(text => `<p class="audit-tool-message">${escapeHtml(text)}</p>`).join('');
  const analysis = mode !== 'simulation' && result.analysisCompleted ? `<p>Slither analizó ${Number.isFinite(result.contractsAnalyzed) ? plural(result.contractsAnalyzed, 'contrato', 'contratos') : 'los contratos compilados'}.</p>` : '';
  const scenario = mode === 'simulation' && result.scenarioLabel ? `<p class="audit-scenario">Versión revisada: <strong>${escapeHtml(result.scenarioLabel)}</strong></p>` : '';
  const checks = mode === 'simulation' ? `<section>${checksList(result.checks)}</section>` : `<details class="audit-reference"><summary>Guía: qué comprobar en el contrato</summary>${checksList(null)}</details>`;
  const explanation = result.explanation ? `<p class="result-explanation">${escapeHtml(result.explanation)}</p>` : '';
  const ran = mode === 'simulation' || Array.isArray(result.findings);
  return `<div class="audit-result">${scenario}${auditVerdict(result, mode)}${toolMessage}${explanation}${checks}${ran ? attackSection(result, mode) + analysis + findingsSection(findings, mode) : ''}</div>`;
}

const KEY_LABELS = {
  accepted: '¿Se acepta?', reasons: 'Razones', count: 'Votos contados', votes: 'Votos por opción', reading: 'Lectura', temperature: 'Temperatura (°C)', acidity: 'Acidez', score: 'Puntaje',
  batchId: 'Lote', quarantined: '¿En cuarentena?', humidity: 'Humedad (%)', hmf: 'HMF (mg/kg)', deltaC13: 'Delta de carbono (‰)', steps: 'Etapas', scenarios: 'Escenarios', name: 'Nombre',
  effect: 'Efecto', gasUsed: 'Gas usado', commands: 'Comandos', task: 'Tarea', layers: 'Capas', rows: 'Registros', duplicates: 'Duplicados', action: 'Operación', balanceEth: 'Garantía disponible (ETH)',
  pendingEth: 'Saldo pendiente (ETH)', predictionCorrect: '¿Acertó tu predicción?', exitCode: 'Código de salida', success: '¿Terminó sin errores?', stdout: 'Salida', stderr: 'Diagnóstico',
  blocks: 'Bloques', data: 'Contenido', previousHash: 'Hash anterior', parentHash: 'Hash anterior (parentHash)', intact: '¿Cadena íntegra?', linked: '¿Enlaza con el anterior?',
  chainId: 'Identificador de red (chainId)', client: 'Cliente del nodo', nodeType: 'Tipo de nodo', latestBlock: 'Último bloque', timestamp: 'Marca de tiempo', transactions: 'Transacciones',
  durationMs: 'Duración (ms)', timedOut: '¿Se agotó el tiempo?', truncated: '¿Salida recortada?', hash: 'Hash', blockNumber: 'Bloque', receipt: 'Recibo', status: 'Estado', certificate: 'Certificado', candidate: 'Opción'
};

function keyLabel(key) {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function optionLabel(key, value, lab) {
  const options = lab?.fields?.find(field => field.key === key && field.options)?.options || [];
  const option = options.find(([id]) => id === String(value));
  return option ? option[1] : value;
}

function valueView(key, value, lab) {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) {
    if (!value.length) return 'Ninguna';
    if (value.every(item => item && typeof item === 'object')) {
      const columns = [...new Set(value.flatMap(Object.keys))];
      return `<div class="table-scroll"><table><caption class="visually-hidden">${escapeHtml(keyLabel(key))}</caption><thead><tr>${columns.map(column => `<th scope="col">${escapeHtml(keyLabel(column))}</th>`).join('')}</tr></thead><tbody>${value.map(row => `<tr>${columns.map(column => `<td>${row[column] === undefined || row[column] === null ? '—' : valueView(column, row[column], lab)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    return `<ul>${value.map(item => `<li>${valueView(key, item, lab)}</li>`).join('')}</ul>`;
  }
  if (value && typeof value === 'object') return `<dl>${pairs(value, lab)}</dl>`;
  const text = String(optionLabel(key, value, lab));
  return /\n/.test(text) || text.length > 160 ? `<pre class="result-json"><code>${escapeHtml(text)}</code></pre>` : escapeHtml(text);
}

function pairs(object, lab) {
  return Object.entries(object).filter(([key, value]) => value !== null && value !== undefined && !['explanation', 'stages'].includes(key))
    .map(([key, value]) => {
      const html = valueView(key, value, lab);
      // Tablas y salidas de varias líneas ocupan toda la fila para no quedar encerradas en una tarjeta angosta.
      const wide = html.startsWith('<div class="table-scroll">') || html.startsWith('<pre');
      return `<div${wide ? ' class="result-wide"' : ''}><dt>${escapeHtml(keyLabel(key))}</dt><dd>${html}</dd></div>`;
    }).join('');
}

export function genericResultView(result, lab) {
  if (!result || typeof result !== 'object') return '';
  const explanation = result.explanation ? `<p class="result-explanation">${escapeHtml(result.explanation)}</p>` : '';
  return `${explanation}<dl class="result-summary">${pairs(result, lab)}</dl>`;
}
