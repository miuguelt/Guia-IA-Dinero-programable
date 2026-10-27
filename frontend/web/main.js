import { modules } from './learning/catalog.mjs';
import { createProgress, createMemoryStorage } from './learning/progress.mjs';
import { homeView, lessonView } from './learning/view.mjs';
import { shellView, updateShell, searchResultsView } from './navigation/shell.mjs';
import { resolveRoute, searchGuide } from './navigation/model.mjs';
import { labs } from './labs/catalog.mjs';
import { labsView } from './labs/view.mjs';
import { tallerView } from './taller/view.mjs';
import { prepararView } from './taller/preparar.mjs';
import { publicarView } from './taller/publicar.mjs';
import { createApi } from './labs/api.mjs';
import { practiceWebAuthn } from './labs/auth.mjs';
import { createLabController } from './labs/controller.mjs';
import { artifacts, evidenceSummaryHtml, portfolioView, registry, downloadPortfolio } from './evidence/view.mjs';
import { decorateCode } from './learning/code-view.mjs';
import { createLiveReload } from './navigation/live.mjs';
import { watchScrollableRegions } from './navigation/scroll-regions.mjs';
import { mountGuideSdk, mountGuideEvidence, seedLearnerProgress } from './navigation/sdk-adapter.mjs';

function createPages(state) {
  return `<section class="module-page" id="home" data-reader-page data-reader-kind="orientation">${homeView(state)}</section>${modules.map(module => lessonView(module, 0, state)).join('')}${prepararView()}${tallerView()}${labsView(state)}${portfolioView(state)}${publicarView()}`;
}

export function createAula({ window: win, document, storage, api = createApi(), auth = practiceWebAuthn, liveReload = {} }) {
  const progress = createProgress(storage || createMemoryStorage());
  const root = document.getElementById('aula');
  const state = { route: resolveRoute(win.location.hash || '#' + progress.read().lastRoute), modes: {}, simulations: {}, results: {}, inputs: {}, menu: false, controllers: {} };
  root.classList.add('guide-reader');
  root.innerHTML = shellView();
  const main = document.getElementById('main-content');
  main.innerHTML = createPages(progress.read());
  decorateCode(document, main);
  const initialHash = win.location.hash || '#' + state.route.route;
  const watcher = liveReload === false ? null : createLiveReload({ window: win, document, ...liveReload });
  const scrollRegions = watchScrollableRegions({ window: win, root });
  win.addEventListener('hashchange', onHashChange, true);
  const sdkPage = ({ lab: 'labs', etapa: 'taller' })[state.route.page] || state.route.page;
  const sdk = mountGuideSdk({ window: win, root, main, modules, initialHash, initialPageId: sdkPage });
  seedLearnerProgress(sdk.app, progress, modules);
  const evidenceMount = { destroy() {} };
  const ready = mountGuideEvidence({ sdk: sdk.sdk, root, registry, progress, onChange: updateProgressUi }).then(mounted => {
    Object.assign(evidenceMount, mounted);
    updateProgressUi();
    return mounted;
  }).catch(error => {
    notify('No se pudieron montar las estaciones de evidencia. ' + error.message);
    throw error;
  });

  function readState() {
    return { ...progress.read(), xp: sdk.app.gamification.getXP() };
  }
  function notify(message) {
    document.getElementById('announcer').textContent = message;
  }
  function toggleMenu(open) {
    state.menu = open;
    root.toggleAttribute('data-menu-open', open);
    document.querySelector('[data-toggle-menu]').setAttribute('aria-expanded', String(open));
    if (open) document.querySelector('#sidebar a').focus();
  }
  function updateProgressUi() {
    const saved = readState();
    updateShell(document, state.route, saved);
    const continueLink = document.querySelector('[data-home-continue]');
    if (continueLink) {
      const next = saved.lastRoute === 'home' ? 'm1/0' : saved.lastRoute;
      continueLink.href = '#' + next;
      document.querySelector('[data-home-continue-label]').textContent = saved.completed.length || saved.verified.length || next !== 'm1/0' ? 'Continuar mi recorrido' : 'Comenzar la guía';
    }
    for (const module of modules) {
      const status = document.querySelector(`[data-module-status="${module.id}"]`);
      if (status) status.textContent = saved.completed.includes(module.id) ? 'Completado' : 'Explorar módulo';
    }
    const filled = artifacts.filter(artifact => saved.evidence[artifact.id].trim()).length;
    const evidenceCount = document.querySelector('[data-evidence-count]');
    const verifiedCount = document.querySelector('[data-verified-count]');
    if (evidenceCount) evidenceCount.textContent = `${filled} de ${artifacts.length}`;
    if (verifiedCount) verifiedCount.textContent = `${saved.verified.length} de ${labs.length}`;
    for (const artifact of artifacts) {
      const content = document.querySelector(`[data-evidence-content="${artifact.id}"]`);
      if (content) content.innerHTML = evidenceSummaryHtml(saved.evidence[artifact.id]);
    }
  }
  const labController = createLabController({ window: win, document, state, progress, api, auth, sdk, notify, updateProgressUi });
  function syncRoute(hash, clearSearch = false) {
    const resolved = resolveRoute(hash || '#home');
    state.route = resolved.page === 'lab'
      ? { ...resolved, labTitle: labs.find(lab => lab.id === resolved.labId)?.title || 'Laboratorio' }
      : resolved;
    const catalog = document.getElementById('labs-catalog');
    if (catalog) catalog.hidden = state.route.page === 'lab';
    const workshop = document.getElementById('taller-catalog');
    if (workshop) workshop.hidden = state.route.page === 'etapa';
    for (const detail of document.querySelectorAll('[data-etapa-page]')) {
      detail.hidden = state.route.page !== 'etapa' || Number(detail.dataset.etapaPage) !== state.route.etapa;
    }
    for (const detail of document.querySelectorAll('[data-lab-page]')) {
      detail.hidden = state.route.page !== 'lab' || detail.dataset.labPage !== state.route.labId;
    }
    for (const link of document.querySelectorAll('.step-nav a')) {
      const active = state.route.page.startsWith('m') && link.hash === `#${state.route.page}/${state.route.step}`;
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    for (const page of document.querySelectorAll('.module-page[data-reader-kind="lesson"]')) {
      for (const step of page.querySelectorAll('.lesson-step')) step.hidden = page.id !== state.route.page || step.id !== `${state.route.page}/${state.route.step}`;
    }
    win.setTimeout(ensurePageVisible, 0);
    scrollRegions.schedule();
    if (state.route.page !== 'home') progress.visit(state.route.route);
    updateProgressUi();
    if (clearSearch) {
      document.getElementById('search-results').hidden = true;
      document.getElementById('guide-search').value = '';
    }
    toggleMenu(false);
  }
  // SpaRouter del SDK intenta mostrar rutas internas (lab/…, taller/N) como páginas y las oculta todas
  // cuando el hash cambia desde la barra de direcciones o el historial. Tras ese ciclo se restaura la
  // página que contiene la ruta, igual que hace SpaRouter.showPage pero sin reescribir el hash.
  function ensurePageVisible() {
    const pageId = ({ lab: 'labs', etapa: 'taller' })[state.route.page] || state.route.page;
    const target = document.getElementById(pageId);
    if (!target || target.style.display !== 'none') return;
    for (const page of main.querySelectorAll('.module-page')) page.style.display = page === target ? 'block' : 'none';
  }
  function onHashChange() {
    syncRoute(win.location.hash, true);
  }
  function onInput(event) {
    if (event.target.id !== 'guide-search') return;
    toggleMenu(false);
    const query = event.target.value.trim();
    const panel = document.getElementById('search-results');
    panel.hidden = !query;
    if (query) panel.innerHTML = searchResultsView(searchGuide(query), query);
  }
  async function onClick(event) {
    const link = event.target.closest('a[href^="#"]');
    if (link) {
      const targetId = decodeURIComponent(link.hash.slice(1));
      if (document.getElementById(targetId) && root.contains(link)) syncRoute(link.hash, true);
    }
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-toggle-menu')) toggleMenu(!state.menu);
    if (button.hasAttribute('data-close-menu')) { toggleMenu(false); document.querySelector('[data-toggle-menu]').focus(); }
    if (button.dataset.complete) completeModule(button.dataset.complete, button.dataset.next);
    if (button.dataset.export) { downloadPortfolio(readState(), button.dataset.export, document, win.URL); notify('Se preparó la exportación del Portafolio.'); }
    if (button.hasAttribute('data-reset-lab')) labController.resetLab(state.route.labId);
    if (button.hasAttribute('data-retry')) document.getElementById('lab-form-' + state.route.labId).requestSubmit();
    if (button.dataset.auth) void labController.authenticate(button.dataset.auth);
    if (button.dataset.copyCode) await labController.copyCode(button);
  }
  function completeModule(moduleId, next) {
    const alreadyComplete = progress.read().completed.includes(moduleId);
    progress.complete(moduleId);
    sdk.app.navigation.markComplete(moduleId);
    if (!alreadyComplete) sdk.app.gamification.addXP(150, 'Módulo completado: ' + modules.find(module => module.id === moduleId).title);
    updateProgressUi();
    win.location.hash = next;
    notify('Módulo completado. El juicio del instructor continúa pendiente.');
  }
  function onKeydown(event) {
    if (event.key === 'Escape') { toggleMenu(false); document.getElementById('search-results').hidden = true; document.querySelector('[data-toggle-menu]').focus(); }
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) { event.preventDefault(); document.getElementById('guide-search').focus(); }
    if (state.menu && event.key === 'Tab') {
      const focusable = [...document.querySelectorAll('#sidebar a, #sidebar button')];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  async function refreshEnvironment() {
    const chip = document.getElementById('environment-chip');
    try {
      const runtime = await api.runtime();
      chip.textContent = runtime.chain?.connected && runtime.database?.connected ? '● Entorno local disponible' : '● Entorno local: revisa dependencias';
      chip.title = 'Red: ' + (runtime.chain?.connected ? 'conectada' : 'sin conexión') + '. PostgreSQL: ' + (runtime.database?.connected ? 'conectado' : 'sin conexión') + '.';
    } catch { chip.textContent = '● Lectura y simulación'; }
  }
  function destroy() {
    watcher?.destroy();
    scrollRegions.destroy();
    Object.values(state.controllers).forEach(controller => controller.abort());
    evidenceMount.destroy();
    sdk.reader.destroy();
    root.removeEventListener('input', onInput); root.removeEventListener('click', onClick);
    root.removeEventListener('submit', labController.onSubmit); root.removeEventListener('change', labController.onChange);
    win.removeEventListener('hashchange', onHashChange, true); document.removeEventListener('keydown', onKeydown);
    root.classList.remove('guide-reader');
  }
  root.addEventListener('input', onInput); root.addEventListener('click', onClick);
  root.addEventListener('submit', labController.onSubmit); root.addEventListener('change', labController.onChange);
  document.addEventListener('keydown', onKeydown);
  syncRoute(win.location.hash || initialHash, true);
  void refreshEnvironment();
  return { render: () => syncRoute(win.location.hash || initialHash), destroy, progress, ready, refreshEnvironment };
}

if (typeof document !== 'undefined' && document.getElementById('aula')) {
  let storage;
  try { storage = window.localStorage; } catch { storage = createMemoryStorage(); }
  createAula({ window, document, storage });
}
