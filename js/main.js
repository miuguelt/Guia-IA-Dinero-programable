// ============================================================
// GUÍA IA & DINERO PROGRAMABLE — ORQUESTADOR PRINCIPAL (main.js)
// ============================================================

const PAGE_ORDER = ['welcome', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'multi-sim', 'simuladores', 'portafolio'];
let currentPage = 'welcome';

// ── Navegación entre Páginas (SPA) ──────────────────────────
function showPage(pageId) {
  // Ocultar todas las páginas
  document.querySelectorAll('.module-page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  // Activar la página seleccionada
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Activar ítem de navegación
  const navItem = document.getElementById(`nav-${pageId}`);
  if (navItem) {
    navItem.classList.add('active');
  }

  // Actualizar Breadcrumb
  currentPage = pageId;
  const crumb = document.getElementById('breadcrumb-current');
  if (crumb) {
    const titles = {
      welcome: 'Bienvenida & Caso Conductor',
      m1: 'M1 · Fundamentos & Ecosistemas Cripto',
      m2: 'M2 · Casos de Uso Empresariales ADSO',
      m3: 'M3 · Arquitectura & Seguridad de Smart Contracts',
      m4: 'M4 · Oráculos & Integración de Agentes IA',
      m5: 'M5 · Taller Práctico TDD con Hardhat',
      m6: 'M6 · Proyecto Integrador & Transferencia',
      'multi-sim': 'Ecosistema Multi-Industria (12 Labs)',
      simuladores: 'Laboratorio de Simuladores Web3',
      portafolio: 'Portafolio de Evidencias'
    };
    crumb.textContent = titles[pageId] || pageId;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Iniciar simuladores si se entra al laboratorio
  if (pageId === 'simuladores' && window.SIMULATORS) {
    window.SIMULATORS.init();
  }
  if (pageId === 'multi-sim' && window.SIMULATORS) {
    window.SIMULATORS.initMultiSim();
  }

  // Montar evidencias DevBrain si corresponde
  if (window.DevBrainEvidence) {
    window.DevBrainEvidence.montar({
      registro: 'deliverables.registry.json',
      prefijo: 'guia_ia_dinero_programable'
    });
  }
}

// ── Navegación por las 4 Pestañas Metodológicas (PBL) ───────
function switchTab(moduleKey, tabIndex) {
  const container = document.getElementById(`page-${moduleKey}`);
  if (!container) return;

  const tabs = container.querySelectorAll('.tab-btn');
  const panes = container.querySelectorAll('.tab-pane');

  tabs.forEach((tab, idx) => {
    if (idx === tabIndex) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  panes.forEach((pane, idx) => {
    if (idx === tabIndex) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

// ── Copiar Bloques de Código al Portapapeles ─────────────────
function copyCode(button) {
  const codeBlock = button.closest('.code-block-wrapper').querySelector('pre.code-content');
  if (!codeBlock) return;

  navigator.clipboard.writeText(codeBlock.innerText).then(() => {
    const originalText = button.textContent;
    button.textContent = '✓ ¡Copiado!';
    button.style.background = '#00d4aa';
    button.style.color = '#000';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      button.style.color = '';
    }, 2000);
  });
}

// ── Marcar Módulo como Completado ───────────────────────────
function markModuleComplete(moduleKey) {
  let completed = JSON.parse(localStorage.getItem('guia_crypto_completed') || '[]');
  if (!completed.includes(moduleKey)) {
    completed.push(moduleKey);
    localStorage.setItem('guia_crypto_completed', JSON.stringify(completed));
    if (window.GAMIFICATION) {
      window.GAMIFICATION.addXP(150, `Módulo ${moduleKey.toUpperCase()} finalizado con rigor.`);
    }
  }

  const badge = document.getElementById(`badge-${moduleKey}`);
  if (badge) {
    badge.textContent = '✓';
    badge.style.background = 'rgba(0, 212, 170, 0.2)';
    badge.style.color = '#00d4aa';
  }

  if (window.GAMIFICATION) {
    window.GAMIFICATION.updateUI();
  }

  // Avanzar a la siguiente página
  const currentIdx = PAGE_ORDER.indexOf(moduleKey);
  if (currentIdx !== -1 && currentIdx < PAGE_ORDER.length - 1) {
    showPage(PAGE_ORDER[currentIdx + 1]);
  }
}

// ── Filtro en Tiempo Real en el Sidebar ─────────────────────
function filterModules() {
  const query = document.getElementById('moduleSearch').value.toLowerCase();
  const navItems = document.querySelectorAll('.module-nav .nav-item');

  navItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// ── Inicialización General ──────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  if (window.GAMIFICATION) {
    window.GAMIFICATION.init();
  }
  if (window.SIMULATORS) {
    window.SIMULATORS.init();
  }
  showPage('welcome');
});
