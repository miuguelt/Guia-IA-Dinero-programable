// ============================================================
// GUÍA IA & DINERO PROGRAMABLE — MOTOR DE GAMIFICACIÓN
// ============================================================

window.GAMIFICATION = (function() {
  const STORAGE_PREFIX = 'guia_crypto_';
  const LEVELS = [
    { level: 1, name: 'Novato Cripto', minXp: 0, maxXp: 200 },
    { level: 2, name: 'Aprendiz Web3', minXp: 200, maxXp: 500 },
    { level: 3, name: 'Smart Contract Dev', minXp: 500, maxXp: 900 },
    { level: 4, name: 'Arquitecto Descentralizado & IA', minXp: 900, maxXp: 1500 }
  ];

  function getXP() {
    return parseInt(localStorage.getItem(STORAGE_PREFIX + 'xp') || '0', 10);
  }

  function getCompleted() {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'completed') || '[]');
  }

  function getCurrentLevel(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXp) return LEVELS[i];
    }
    return LEVELS[0];
  }

  function addXP(amount, reason) {
    let currentXp = getXP();
    let oldLevel = getCurrentLevel(currentXp);
    let newXp = currentXp + amount;
    localStorage.setItem(STORAGE_PREFIX + 'xp', newXp.toString());
    
    let newLevel = getCurrentLevel(newXp);
    updateUI();
    showToast(`+${amount} XP: ${reason}`, 'xp');

    if (newLevel.level > oldLevel.level) {
      showToast(`🎉 ¡SUBISTE DE NIVEL! Ahora eres: ${newLevel.name}`, 'level');
    }
  }

  function updateUI() {
    const xp = getXP();
    const levelInfo = getCurrentLevel(xp);
    
    // Elementos de la interfaz
    const userLevelEl = document.getElementById('user-level');
    const userLevelNameEl = document.getElementById('user-level-name');
    const userXpEl = document.getElementById('user-xp');
    const xpFillEl = document.getElementById('xp-progress-fill');
    
    if (userLevelEl) userLevelEl.textContent = `Nivel ${levelInfo.level}`;
    if (userLevelNameEl) userLevelNameEl.textContent = levelInfo.name;
    if (userXpEl) userXpEl.textContent = `${xp} XP`;
    
    if (xpFillEl) {
      const levelSpan = levelInfo.maxXp - levelInfo.minXp;
      const progressInLevel = xp - levelInfo.minXp;
      const pct = Math.min(100, Math.max(0, Math.round((progressInLevel / levelSpan) * 100)));
      xpFillEl.style.width = `${pct}%`;
    }

    // Progreso general del curso
    const completed = getCompleted();
    const totalModules = 6;
    const coursePct = Math.round((completed.length / totalModules) * 100);
    const progressPctEl = document.getElementById('progress-pct');
    const progressBarEl = document.getElementById('progress-bar');
    if (progressPctEl) progressPctEl.textContent = `${coursePct}%`;
    if (progressBarEl) progressBarEl.style.width = `${coursePct}%`;
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(10, 14, 23, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid ${type === 'xp' ? '#00f0ff' : type === 'level' ? '#00d4aa' : '#8b5cf6'};
      color: #fff;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 13.5px;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
      animation: toastIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    `;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  return {
    init: updateUI,
    addXP: addXP,
    getXP: getXP,
    getCompleted: getCompleted,
    updateUI: updateUI,
    showToast: showToast
  };
})();
