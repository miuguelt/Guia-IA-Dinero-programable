import registry from '../../../deliverables.registry.json' with { type: 'json' };
import { escapeHtml } from '../dom.mjs';

export const artifacts = registry.artifacts;
export { registry };
// La estación guarda un valor por bloque; el progreso y el Portafolio necesitan un solo texto legible.
export function composeEvidence(artifact, values = {}) {
  const lines = [];
  for (const field of artifact.fields) {
    const value = values?.[field.key];
    const text = field.type === 'tabla'
      ? (Array.isArray(value) ? value : []).map(row => field.columns.map(column => String(row[column.key] || '').trim() || '—').join(' · ')).join('; ')
      : String(value || '').trim();
    if (text) lines.push(`${field.label}: ${text}`);
  }
  return lines.join('\n');
}
export function evidenceSummaryHtml(text) {
  const lines = String(text).split('\n').filter(line => line.trim());
  return (lines.length ? lines : ['Pendiente de registro.']).map(line => `<p>${escapeHtml(line)}</p>`).join('');
}
export function evidenceForm(id) {
  return `<section class="evidence-station" data-db-evidence="${id}" aria-label="Estación de evidencia ${id}"></section>`;
}
export function portfolioView(state) {
  const filled = artifacts.filter(artifact => state.evidence[artifact.id].trim()).length;
  return `<section class="module-page" id="portfolio" data-reader-page data-reader-kind="resources"><header class="page-heading"><p class="eyebrow">Consolidación · ADSO</p><h1 tabindex="-1">Portafolio de Evidencias</h1><p>Reúne tus decisiones y resultados. Cada evidencia se produce en su módulo y aquí puedes revisar el conjunto.</p></header>
    <div class="portfolio-stats"><div class="surface"><span class="small-meta">Evidencias con registro</span><strong data-evidence-count>${filled} de 5</strong></div><div class="surface"><span class="small-meta">Prácticas reales verificadas</span><strong data-verified-count>${state.verified.length} de 12</strong></div><div class="surface"><span class="small-meta">Juicio del instructor</span><strong>Pendiente</strong></div></div>
    <section class="surface portfolio-intro"><h2>Una entrega que se puede reproducir</h2><p>Revisa entradas, procedimientos, resultados y límites. Un registro guardado no equivale a aprobación. El instructor emite el juicio Aprobado o No Aprobado según los criterios de la actividad.</p><div class="actions"><button class="button primary" data-export="json">Exportar JSON</button><button class="button secondary" data-export="markdown">Exportar Markdown</button></div><p class="field-hint">La exportación incluye tus textos. Revísalos antes de compartirlos y utiliza el medio de entrega definido por el instructor.</p></section>
    <section class="surface portfolio-dossier"><div data-db-evidence-dossier></div></section>
    <section class="section-block evidence-records" aria-labelledby="evidence-records-title"><div class="section-heading"><div><p class="eyebrow">Trabajo registrado</p><h2 id="evidence-records-title">Tus cinco evidencias</h2></div></div><div class="evidence-record-grid">${artifacts.map(artifact => `<article class="surface evidence-summary"><p class="eyebrow">${artifact.id}</p><h3>${artifact.name}</h3><div data-evidence-content="${artifact.id}">${evidenceSummaryHtml(state.evidence[artifact.id])}</div></article>`).join('')}</div></section></section>`;
}
export function exportPortfolio(state, format, date = new Date()) {
  const payload = { guideId: registry.guideId, exportedAt: date.toISOString(), instructorJudgment: 'Pendiente', completed: state.completed, verified: state.verified, evidence: state.evidence };
  if (format === 'json') return JSON.stringify(payload, null, 2);
  return '# Portafolio de Evidencias\n\nMaterial de aprendizaje. Los casos y archivos de práctica no contienen registros reales.\n\nExportado: ' + payload.exportedAt + '\n\nJuicio del instructor: Pendiente\n\n' + artifacts.map(artifact => '## ' + artifact.id + ' · ' + artifact.name + '\n\n' + (state.evidence[artifact.id].trim() || 'Pendiente de registro.') + '\n\nCriterio: ' + artifact.criterion).join('\n\n');
}
export function downloadPortfolio(state, format, document, urlApi = URL) {
  const text = exportPortfolio(state, format);
  const url = urlApi.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json' : 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Portafolio-ADSO-Dinero-Programable.' + (format === 'json' ? 'json' : 'md');
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => urlApi.revokeObjectURL(url), 1000);
}
