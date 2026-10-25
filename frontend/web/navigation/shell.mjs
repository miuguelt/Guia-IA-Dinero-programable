import { modules, learningStages } from '../learning/catalog.mjs';
import { XP_TOTAL } from '../learning/progress.mjs';
import { escapeHtml, icon } from '../dom.mjs';

export function shellView() {
  return `<a class="skip-link" href="#main-content">Saltar al contenido</a><div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Navegación de la guía"><div class="brand-row"><a class="brand" href="#home"><span class="brand-mark">${icon('leaf')}</span><span>Dinero<br><strong>programable</strong></span></a><button class="icon-button close-menu" data-close-menu aria-label="Cerrar menú">×</button></div>
    <p class="brand-subtitle">SENA · Análisis y Desarrollo de Software</p><div class="sidebar-rule"></div>
    <nav class="primary-nav" aria-label="Ruta de aprendizaje"><a href="#home" data-nav="home">${icon('book')} Inicio</a>${learningStages.map((stage, index) => `<p class="nav-label">Etapa ${index + 1} · ${stage.title}</p>${stage.modules.map(module => `<a href="#${module.id}/0" data-nav="${module.id}"><span class="nav-number">${module.id.slice(1).padStart(2, '0')}</span><span>${module.title}</span><span class="nav-check" data-check="${module.id}"></span></a>`).join('')}`).join('')}<p class="nav-label">Taller e inspección</p><a href="#preparar" data-nav="preparar">${icon('check')} Prepara tu equipo</a><a href="#taller" data-nav="taller">${icon('leaf')} Taller AgroPay <span class="count-badge">7</span></a><a href="#publicar" data-nav="publicar">${icon('layers')} Anexo: publica en tu VPS</a><p class="nav-label">Ponlo en práctica</p><a href="#labs" data-nav="labs">${icon('flask')} Laboratorios <span class="count-badge">12</span></a><a href="#portfolio" data-nav="portfolio">${icon('layers')} Portafolio de Evidencias</a></nav>
    <div class="sidebar-progress"><div class="progress-label"><strong>Tu recorrido</strong><span id="progress-label">0 de 6</span></div><progress id="course-progress" max="6" value="0">0 de 6 módulos</progress><div class="progress-caption"><span>Avanza, comprueba, explica.</span><strong id="xp-label">0 / ${XP_TOTAL} XP</strong></div></div><p class="sidebar-footer">Aprender a construir.<br>Construir para comprender.</p></aside>
    <button class="drawer-scrim" data-close-menu tabindex="-1" aria-label="Cerrar navegación"></button>
    <div class="main-column"><header class="topbar"><button class="icon-button menu-toggle" data-toggle-menu aria-controls="sidebar" aria-expanded="false" aria-label="Abrir menú">${icon('menu')}</button><div class="breadcrumb"><span>Tu aula</span><span aria-hidden="true">/</span><strong id="breadcrumb-current">Inicio</strong></div><form class="search-form" role="search"><label class="visually-hidden" for="guide-search">Buscar en la guía</label>${icon('search')}<input id="guide-search" type="search" placeholder="Buscar un tema o comando" autocomplete="off" aria-controls="search-results"><kbd aria-hidden="true">/</kbd></form><span id="environment-chip" class="environment-chip"><span class="dot"></span> Lectura y simulación</span></header>
    <section id="search-results" class="search-results" aria-label="Resultados de búsqueda" hidden></section><main id="main-content" tabindex="-1"></main><footer class="main-footer"><span>Una guía para comprender, practicar y verificar.</span><a href="#portfolio">Tu Portafolio de Evidencias →</a></footer></div></div>
    <div class="toast" id="announcer" role="status" aria-live="polite"></div>`;
}
export function updateShell(document, route, state) {
  const active = route.page === 'lab' ? 'labs' : route.page === 'etapa' ? 'taller' : route.page;
  for (const item of document.querySelectorAll('[data-nav]')) {
    if (item.dataset.nav === active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  for (const item of document.querySelectorAll('[data-check]')) item.textContent = state.completed.includes(item.dataset.check) ? '✓' : '';
  document.getElementById('progress-label').textContent = state.completed.length + ' de 6';
  document.getElementById('course-progress').value = state.completed.length;
  document.getElementById('course-progress').textContent = state.completed.length + ' de 6 módulos';
  document.getElementById('xp-label').textContent = state.xp.toLocaleString('es-CO') + ' / ' + XP_TOTAL.toLocaleString('es-CO') + ' XP';
  const title = modules.find(module => module.id === route.page)?.title || (route.page === 'lab' ? 'Laboratorios · ' + route.labTitle : route.page === 'etapa' ? 'Taller · Etapa ' + route.etapa : ({ home: 'Inicio', labs: 'Laboratorios', portfolio: 'Portafolio', preparar: 'Prepara tu equipo', taller: 'Taller AgroPay', publicar: 'Publica en tu VPS' })[route.page]);
  document.getElementById('breadcrumb-current').textContent = title;
  document.title = title + ' · Dinero programable | SENA ADSO';
}
export function searchResultsView(results, query) {
  if (!results.length) return `<div class="search-empty"><h2>No encontramos “${escapeHtml(query)}”</h2><p>Prueba con un concepto, como «oráculo», «reentrada» o «garantía».</p></div>`;
  return `<div class="search-heading"><strong>${results.length} resultados</strong><span>Busca en lecciones, laboratorios y taller</span></div><ol>${results.map(item => `<li><a href="#${item.route}"><span class="eyebrow">${item.kind}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.snippet)}</p></a></li>`).join('')}</ol>`;
}
