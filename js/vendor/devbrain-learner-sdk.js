/* DevBrain · SDK para guías. Generado por bundle.cjs. */
(function(global) {
  /* --- core/storage-adapter.js --- */
  /**
   * Adaptador de almacenamiento para localStorage con soporte de namespace.
   * Permite aislar los datos de diferentes guías educativas.
   */
  class StorageAdapter {
    /**
     * @param {string} prefix - Prefijo para las claves en localStorage (ej. 'devbrain_guide_3')
     */
    constructor(prefix) {
      this.prefix = prefix;
    }
  
    /**
     * Obtiene y parsea un valor del storage.
     * @param {string} key - Clave del valor a obtener
     * @returns {any} El valor parseado o null si no existe
     */
    get(key) {
      try {
        const item = localStorage.getItem(`${this.prefix}_${key}`);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.error(`Error leyendo clave ${key} del storage`, e);
        return null;
      }
    }
  
    /**
     * Guarda un valor en el storage.
     * @param {string} key - Clave del valor
     * @param {any} value - Valor a serializar y guardar
     */
    set(key, value) {
      try {
        localStorage.setItem(`${this.prefix}_${key}`, JSON.stringify(value));
      } catch (e) {
        console.error(`Error guardando clave ${key} en storage`, e);
      }
    }
  
    /**
     * Elimina un valor del storage.
     * @param {string} key - Clave a eliminar
     */
    remove(key) {
      localStorage.removeItem(`${this.prefix}_${key}`);
    }
  
    /**
     * Devuelve todas las claves asociadas a este prefijo como un objeto.
     * @returns {Object} Diccionario con todas las claves y valores
     */
    getAll() {
      const result = {};
      const prefixStr = `${this.prefix}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixStr)) {
          const shortKey = key.slice(prefixStr.length);
          result[shortKey] = this.get(shortKey);
        }
      }
      return result;
    }
  
    /**
     * Exporta todo el contenido del storage asociado a este prefijo como string JSON.
     * Útil para transferir progreso entre guías.
     * @returns {string} Datos en formato JSON
     */
    export() {
      return JSON.stringify(this.getAll());
    }
  
    /**
     * Importa datos desde un string JSON exportado previamente.
     * @param {string} jsonString - Datos en formato JSON
     * @returns {boolean} true si fue exitoso, false si hubo error
     */
    import(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (typeof data === 'object' && data !== null) {
          for (const [key, value] of Object.entries(data)) {
            this.set(key, value);
          }
          return true;
        }
        return false;
      } catch (e) {
        console.error('Error importando datos', e);
        return false;
      }
    }
  
    /**
     * Elimina todas las claves asociadas a este prefijo en el storage.
     */
    clear() {
      const prefixStr = `${this.prefix}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixStr)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    }
  }
  

  /* --- core/event-bus.js --- */
  /**
   * Sistema de eventos pub/sub utilizando EventTarget nativo del navegador.
   */
  class EventBus {
    constructor() {
      this.target = new EventTarget();
      this.listeners = new WeakMap();
    }
  
    /**
     * Registra un listener para un evento.
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar
     */
    on(eventName, callback) {
      const wrapper = (e) => callback(e.detail);
      this.listeners.set(callback, wrapper);
      this.target.addEventListener(eventName, wrapper);
    }
  
    /**
     * Elimina un listener para un evento.
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a eliminar
     */
    off(eventName, callback) {
      const wrapper = this.listeners.get(callback);
      if (wrapper) {
        this.target.removeEventListener(eventName, wrapper);
        this.listeners.delete(callback);
      }
    }
  
    /**
     * Emite un evento a todos los listeners registrados.
     * @param {string} eventName - Nombre del evento
     * @param {any} detail - Datos adjuntos al evento
     */
    emit(eventName, detail = null) {
      const event = new CustomEvent(eventName, { detail });
      this.target.dispatchEvent(event);
    }
  
    /**
     * Registra un listener que se ejecuta solo una vez.
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar
     */
    once(eventName, callback) {
      const wrapper = (e) => callback(e.detail);
      this.target.addEventListener(eventName, wrapper, { once: true });
    }
  }
  

  /* --- core/utils.js --- */
  /**
   * Funciones de utilidad para manipulación del DOM, exportación y textos.
   */
  
  /**
   * Copia texto al portapapeles y provee retroalimentación visual.
   * @param {string} text - Texto a copiar
   * @param {HTMLElement} buttonEl - Botón para mostrar feedback
   * @param {string} successText - Texto a mostrar al copiar
   * @param {number} duration - Duración del mensaje de éxito en ms
   */
  async function copyText(text, buttonEl, successText = '¡Copiado!', duration = 1600) {
    try {
      await navigator.clipboard.writeText(text);
      if (buttonEl) {
        const originalText = buttonEl.textContent;
        buttonEl.textContent = successText;
        setTimeout(() => {
          buttonEl.textContent = originalText;
        }, duration);
      }
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  }
  
  /**
   * Descarga texto como un archivo usando Blob.
   * @param {string} text - Contenido del archivo
   * @param {string} filename - Nombre del archivo a descargar
   * @param {string} mime - Tipo MIME del archivo
   */
  function downloadText(text, filename, mime = 'text/plain') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Escapa el texto para ser incluido de forma segura en un archivo CSV.
   * @param {string|number} text - Valor a escapar
   * @returns {string} Valor escapado
   */
  function csvCell(text) {
    const str = String(text ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  /**
   * Escapa el texto para ser incluido de forma segura en una tabla Markdown.
   * @param {string|number} text - Valor a escapar
   * @returns {string} Valor escapado
   */
  function mdCell(text) {
    return String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }
  
  /**
   * Genera una cadena de texto en formato tabla Markdown.
   * @param {Array<Object>} rows - Filas de datos
   * @param {Array<{key: string, label: string}>} schema - Esquema de columnas
   * @returns {string} Tabla en formato Markdown
   */
  function toMarkdownTable(rows, schema) {
    if (!rows || rows.length === 0) return '';
    
    const headers = schema.map(col => mdCell(col.label)).join(' | ');
    const separator = schema.map(() => '---').join(' | ');
    
    const body = rows.map(row => {
      return schema.map(col => mdCell(row[col.key])).join(' | ');
    }).join('\n| ');
    
    return `| ${headers} |\n| ${separator} |\n| ${body} |`;
  }
  
  /**
   * Genera una cadena de texto en formato CSV.
   * @param {Array<Object>} rows - Filas de datos
   * @param {Array<{key: string, label: string}>} schema - Esquema de columnas
   * @returns {string} Datos en formato CSV
   */
  function toCSV(rows, schema) {
    if (!rows || rows.length === 0) return '';
    
    const headers = schema.map(col => csvCell(col.label)).join(',');
    
    const body = rows.map(row => {
      return schema.map(col => csvCell(row[col.key])).join(',');
    }).join('\n');
    
    return `${headers}\n${body}`;
  }
  
  /**
   * Asigna texto a un elemento de forma segura contra XSS.
   * @param {HTMLElement} element - Elemento DOM
   * @param {string} text - Texto a insertar
   */
  function safeTextContent(element, text) {
    if (element) {
      element.textContent = text;
    }
  }
  
  /**
   * Helper para crear elementos DOM con atributos e hijos de forma segura.
   * @param {string} tag - Etiqueta HTML (ej. 'div')
   * @param {Object} attrs - Diccionario de atributos
   * @param {Array<HTMLElement|string>} children - Elementos hijos o texto
   * @returns {HTMLElement} El elemento creado
   */
  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className' || key === 'class') {
        el.className = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
    
    for (const child of children) {
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }
    
    return el;
  }
  

  /* --- core/config-loader.js --- */
  /**
   * Gestor de configuración de las guías educativas.
   */
  class ConfigLoader {
    /**
     * @param {Object} options - Opciones iniciales
     * @param {string} options.guideId - Identificador de la guía
     * @param {string} options.storagePrefix - Prefijo de storage
     * @param {Array} options.levels - Niveles disponibles
     * @param {Array} options.modules - Módulos disponibles
     */
    constructor({ guideId = 'default_guide', storagePrefix = 'db_sdk', levels = [], modules = [] } = {}) {
      this.config = {
        guideId,
        storagePrefix,
        levels,
        modules
      };
    }
  
    /**
     * Carga y parsea un archivo de manifiesto (guide.manifest.json).
     * @param {string} url - URL del manifiesto
     * @returns {Promise<Object>} Datos del manifiesto
     */
    async loadManifest(url) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error cargando manifiesto: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.guideId) this.config.guideId = data.guideId;
        if (data.storagePrefix) this.config.storagePrefix = data.storagePrefix;
        if (data.levels) this.config.levels = data.levels;
        if (data.modules) this.config.modules = data.modules;
        
        return data;
      } catch (err) {
        console.error('Error en loadManifest:', err);
        throw err;
      }
    }
  
    /**
     * Retorna la lista de módulos de la configuración.
     * @returns {Array} Lista de módulos
     */
    getModules() {
      return this.config.modules;
    }
  
    /**
     * Retorna la definición de niveles de la configuración.
     * @returns {Array} Definición de niveles
     */
    getLevels() {
      return this.config.levels;
    }
  
    /**
     * Retorna el identificador de la guía.
     * @returns {string} Identificador
     */
    getGuideId() {
      return this.config.guideId;
    }
  }
  

  /* --- gamification/xp-engine.js --- */
  /**
   * XP and leveling engine.
   * @module gamification/xp-engine
   */
  
  class XpEngine {
    /**
     * @param {import('../core/storage-adapter.js').StorageAdapter} storage
     * @param {import('../core/event-bus.js').EventBus} events
     * @param {Array<{name: string, min: number, icon: string}>} levels
     */
    constructor(storage, events, levels) {
      this.storage = storage;
      this.events = events;
      this.levels = levels || [
        { name: 'Novato', min: 0, icon: '🌱' },
        { name: 'Aprendiz', min: 100, icon: '📘' },
        { name: 'Experimentado', min: 300, icon: '🔥' },
        { name: 'Maestro', min: 600, icon: '👑' }
      ];
      this.currentXp = 0;
      this.currentLevel = this.levels[0];
    }
  
    /**
     * Carga la experiencia y calcula el nivel actual.
     * @returns {XpEngine}
     */
    init() {
      this.currentXp = Number(this.storage.get('xp')) || 0;
      this._calculateLevel();
      return this;
    }
  
    /**
     * Añade experiencia y emite eventos si hay subida de nivel.
     * @param {number} amount - Cantidad de XP a añadir
     * @param {string} reason - Razón de la recompensa
     */
    addXP(amount, reason) {
      if (amount <= 0) return;
      
      this.currentXp += amount;
      this.storage.set('xp', this.currentXp);
      
      const oldLevel = this.currentLevel;
      this._calculateLevel();
      
      this.events.emit('xp:added', {
        amount,
        reason,
        total: this.currentXp,
        level: this.currentLevel
      });
      
      if (oldLevel.name !== this.currentLevel.name) {
        this.events.emit('level:up', {
          oldLevel,
          newLevel: this.currentLevel
        });
      }
    }
  
    /**
     * Obtiene la experiencia actual.
     * @returns {number}
     */
    getXP() {
      return this.currentXp;
    }
  
    /**
     * Obtiene el nivel actual.
     * @returns {{name: string, min: number, icon: string}}
     */
    getLevel() {
      return this.currentLevel;
    }
  
    /**
     * Calcula el progreso hacia el siguiente nivel (0-100%).
     * @returns {number}
     */
    getLevelProgress() {
      const currentIndex = this.levels.findIndex(l => l.name === this.currentLevel.name);
      const nextLevel = this.levels[currentIndex + 1];
      
      if (!nextLevel) return 100; // Nivel máximo
      
      const xpInCurrentLevel = this.currentXp - this.currentLevel.min;
      const xpNeededForNext = nextLevel.min - this.currentLevel.min;
      
      return Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));
    }
  
    /**
     * Reinicia la experiencia a cero.
     */
    reset() {
      this.currentXp = 0;
      this.storage.remove('xp');
      this.storage.remove('badges');
      this._calculateLevel();
      this.events.emit('xp:reset');
    }
  
    /**
     * Calcula y actualiza el nivel actual basado en la experiencia.
     * @private
     */
    _calculateLevel() {
      // Buscar el nivel más alto donde min <= currentXp
      const sortedLevels = [...this.levels].sort((a, b) => b.min - a.min);
      const level = sortedLevels.find(l => this.currentXp >= l.min) || this.levels[0];
      this.currentLevel = level;
    }
  }
  

  /* --- gamification/toast-component.js --- */
  /**
   * Animated XP toast notification component.
   * @module gamification/toast-component
   */
  
  class ToastComponent {
    /**
     * @param {import('../core/event-bus.js').EventBus} events
     */
    constructor(events) {
      this.events = events;
      this.container = null;
    }
  
    /**
     * Inicializa el componente de notificaciones.
     * @returns {ToastComponent}
     */
    init() {
      this._createContainer();
      
      this.events.on('xp:added', (data) => {
        this.show(data.amount, data.reason);
      });
      
      this.events.on('level:up', (data) => {
        this.showLevelUp(data.newLevel);
      });
      
      return this;
    }
  
    /**
     * Muestra un toast de experiencia obtenida.
     * @param {number} amount - Cantidad de XP
     * @param {string} reason - Razón
     */
    show(amount, reason) {
      const toast = document.createElement('div');
      toast.className = 'sdk-xp-toast';
      
      const xpSpan = document.createElement('span');
      xpSpan.className = 'xp-amount';
      xpSpan.textContent = `+${amount} XP`;
      
      const reasonSpan = document.createElement('span');
      reasonSpan.className = 'xp-reason';
      reasonSpan.textContent = reason;
      
      toast.appendChild(xpSpan);
      toast.appendChild(reasonSpan);
      
      this._showToast(toast);
    }
  
    /**
     * Muestra una notificación especial de subida de nivel.
     * @param {{name: string, icon: string}} level - Objeto nivel
     */
    showLevelUp(level) {
      const toast = document.createElement('div');
      toast.className = 'sdk-xp-toast level-up-toast';
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'level-icon';
      iconSpan.textContent = level.icon;
      
      const textSpan = document.createElement('span');
      textSpan.className = 'level-text';
      textSpan.textContent = `¡Subiste a nivel ${level.name}!`;
      
      toast.appendChild(iconSpan);
      toast.appendChild(textSpan);
      
      this._showToast(toast, 5000);
      this._triggerConfetti();
    }
  
    /**
     * Añade el toast al DOM y gestiona su ciclo de vida.
     * @param {HTMLElement} toast - Elemento DOM del toast
     * @param {number} duration - Duración en ms
     * @private
     */
    _showToast(toast, duration = 3500) {
      this.container.appendChild(toast);
      
      // Animar entrada
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
      
      // Auto-eliminar
      setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        });
      }, duration);
    }
  
    /**
     * Crea el contenedor principal de toasts si no existe.
     * @private
     */
    _createContainer() {
      let container = document.getElementById('sdk-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'sdk-toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
      }
      this.container = container;
    }
  
    /**
     * Ejecuta efecto de confeti si la librería está disponible.
     * @private
     */
    _triggerConfetti() {
      if (window.confetti && typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }
  

  /* --- gamification/index.js --- */
  /**
   * Gamification module entry.
   * @module gamification
   */
  
  
  
  /**
   * Creates and initializes the gamification module.
   * @param {import('../core/storage-adapter.js').StorageAdapter} storage
   * @param {import('../core/event-bus.js').EventBus} events
   * @param {Array<{name: string, min: number, icon: string}>} levels
   * @returns {Object} Gamification API
   */
  function createGamification(storage, events, levels) {
    const engine = new XpEngine(storage, events, levels).init();
    const toast = new ToastComponent(events).init();
  
    return {
      addXP: (amount, reason) => engine.addXP(amount, reason),
      getXP: () => engine.getXP(),
      getLevel: () => engine.getLevel(),
      getLevelProgress: () => engine.getLevelProgress(),
      reset: () => engine.reset(),
      onLevelUp: (callback) => events.on('level:up', callback),
      onXPAdded: (callback) => events.on('xp:added', callback)
    };
  }
  

  /* --- navigation/spa-router.js --- */
  /**
   * Hash-based SPA router.
   * @module navigation/spa-router
   */
  
  class SpaRouter {
    /**
     * @param {Object} config
     * @param {HTMLElement} config.container
     * @param {Array<Object>} config.modules
     * @param {import('../core/event-bus.js').EventBus} config.events
     * @param {Function} [config.onNavigate]
     */
    constructor(config) {
      this.container = config.container;
      this.modules = config.modules || [];
      this.events = config.events;
      this.onNavigate = config.onNavigate || (() => {});
      this.currentPageId = null;
    }
  
    /**
     * Initializes the router and handles initial hash.
     */
    init() {
      window.addEventListener('hashchange', () => this._handleHashChange());
      
      // Check initial hash or go to first module
      const initialHash = window.location.hash.slice(1);
      const isValid = this.modules.some(m => m.id === initialHash);
      
      if (initialHash && isValid) {
        this.showPage(initialHash);
      } else if (this.modules.length > 0) {
        this.showPage(this.modules[0].id);
      }
      
      return this;
    }
  
    /**
     * Shows a specific page by ID.
     * @param {string} pageId 
     */
    showPage(pageId) {
      const pages = this.container.querySelectorAll('.module-page');
      let pageFound = false;
      
      pages.forEach(page => {
        if (page.id === `page-${pageId}` || page.id === pageId) {
          page.style.display = 'block';
          pageFound = true;
        } else {
          page.style.display = 'none';
        }
      });
      
      if (!pageFound) {
        console.warn(`[SpaRouter] Page not found for id: ${pageId}`);
        return;
      }
  
      this.currentPageId = pageId;
      
      // Update hash silently if needed
      if (window.location.hash !== `#${pageId}`) {
        // Temporarily remove listener to avoid double triggers
        const currentHash = window.location.hash;
        window.location.hash = pageId;
      }
  
      // Update active class on nav items
      document.querySelectorAll('[data-module-link]').forEach(link => {
        if (link.dataset.moduleLink === pageId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
  
      this.events.emit('navigation:changed', { pageId });
      this.onNavigate(pageId);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  
    /**
     * Navigates to the next module in order.
     */
    goNext() {
      const currentIndex = this.modules.findIndex(m => m.id === this.currentPageId);
      if (currentIndex >= 0 && currentIndex < this.modules.length - 1) {
        this.showPage(this.modules[currentIndex + 1].id);
      }
    }
  
    /**
     * Navigates to the previous module in order.
     */
    goPrev() {
      const currentIndex = this.modules.findIndex(m => m.id === this.currentPageId);
      if (currentIndex > 0) {
        this.showPage(this.modules[currentIndex - 1].id);
      }
    }
  
    /**
     * Returns current page ID.
     * @returns {string|null}
     */
    getCurrentPage() {
      return this.currentPageId;
    }
  
    /**
     * @private
     */
    _handleHashChange() {
      const hash = window.location.hash.slice(1);
      if (hash && hash !== this.currentPageId) {
        this.showPage(hash);
      }
    }
  }
  

  /* --- navigation/sidebar.js --- */
  /**
   * Sidebar manager.
   * @module navigation/sidebar
   */
  
  class Sidebar {
    /**
     * @param {Object} config
     * @param {HTMLElement} config.container
     * @param {Array<Object>} config.modules
     * @param {import('../core/event-bus.js').EventBus} config.events
     * @param {Function} [config.onModuleClick]
     */
    constructor(config) {
      this.container = config.container;
      this.modules = config.modules || [];
      this.events = config.events;
      this.onModuleClick = config.onModuleClick || (() => {});
      this.items = new Map(); // Store item elements by moduleId
    }
  
    /**
     * Generates sidebar HTML.
     */
    render() {
      this.container.innerHTML = '';
      
      // Search input
      const searchContainer = document.createElement('div');
      searchContainer.className = 'sidebar-search';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Buscar módulo...';
      searchInput.addEventListener('input', (e) => this.filterModules(e.target.value));
      
      searchContainer.appendChild(searchInput);
      this.container.appendChild(searchContainer);
      
      // Modules list
      const nav = document.createElement('nav');
      nav.className = 'sidebar-nav';
      
      const ul = document.createElement('ul');
      
      this.modules.forEach(module => {
        const li = document.createElement('li');
        
        const a = document.createElement('a');
        a.href = `#${module.id}`;
        a.dataset.moduleLink = module.id;
        a.className = 'module-link';
        a.addEventListener('click', (e) => {
          // Only prevent default if we want to handle entirely via JS,
          // but hash navigation works nicely natively.
          this.onModuleClick(module.id);
        });
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = module.title;
        titleSpan.className = 'module-title';
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'module-badge';
        badgeSpan.style.display = 'none';
        badgeSpan.textContent = '✓';
        
        a.appendChild(titleSpan);
        a.appendChild(badgeSpan);
        li.appendChild(a);
        ul.appendChild(li);
        
        this.items.set(module.id, { li, badgeSpan, title: module.title });
      });
      
      nav.appendChild(ul);
      this.container.appendChild(nav);
    }
  
    /**
     * Updates completion badge visibility.
     * @param {string} moduleId 
     * @param {boolean} completed 
     */
    updateBadge(moduleId, completed) {
      const item = this.items.get(moduleId);
      if (item && item.badgeSpan) {
        item.badgeSpan.style.display = completed ? 'inline-block' : 'none';
      }
    }
  
    /**
     * Filters visible modules by search text.
     * @param {string} query 
     */
    filterModules(query) {
      const lowerQuery = query.toLowerCase();
      
      this.items.forEach((item, moduleId) => {
        if (item.title.toLowerCase().includes(lowerQuery)) {
          item.li.style.display = 'block';
        } else {
          item.li.style.display = 'none';
        }
      });
    }
  
    /**
     * Toggles mobile sidebar visibility.
     */
    toggleMobile() {
      this.container.classList.toggle('sidebar-mobile-open');
    }
  }
  

  /* --- navigation/progress-tracker.js --- */
  /**
   * Course progress manager.
   * @module navigation/progress-tracker
   */
  
  class ProgressTracker {
    /**
     * @param {import('../core/storage-adapter.js').StorageAdapter} storage
     * @param {import('../core/event-bus.js').EventBus} events
     * @param {Array<Object>} modules
     */
    constructor(storage, events, modules) {
      this.storage = storage;
      this.events = events;
      this.modules = modules || [];
      this.completed = new Set();
    }
  
    /**
     * Loads completed modules from storage.
     * @returns {ProgressTracker}
     */
    init() {
      try {
        // StorageAdapter expone get/set (ya serializan), no getItem/setItem.
        const stored = this.storage.get('completed');
        if (Array.isArray(stored)) {
          this.completed = new Set(stored);
        }
      } catch (e) {
        console.error('[ProgressTracker] Error loading progress', e);
        this.completed = new Set();
      }
      return this;
    }
  
    /**
     * Marks a module as completed.
     * @param {string} moduleId 
     */
    markComplete(moduleId) {
      if (this.completed.has(moduleId)) return;
      
      this.completed.add(moduleId);
      
      try {
        this.storage.set('completed', Array.from(this.completed));
      } catch (e) {
        console.error('[ProgressTracker] Error saving progress', e);
      }
      
      this.events.emit('module:completed', {
        moduleId,
        progress: this.getProgress()
      });
    }
  
    /**
     * Checks if a module is complete.
     * @param {string} moduleId 
     * @returns {boolean}
     */
    isComplete(moduleId) {
      return this.completed.has(moduleId);
    }
  
    /**
     * Returns array of completed module IDs.
     * @returns {Array<string>}
     */
    getCompleted() {
      return Array.from(this.completed);
    }
  
    /**
     * Returns current progress object.
     * @returns {{completed: number, total: number, percentage: number}}
     */
    getProgress() {
      const total = this.modules.length;
      const completed = this.completed.size;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      return { completed, total, percentage };
    }
  
    /**
     * Returns true if all modules are complete.
     * @returns {boolean}
     */
    isAllComplete() {
      return this.modules.length > 0 && this.completed.size >= this.modules.length;
    }
  
    /**
     * Updates a progress bar DOM element.
     * @param {HTMLElement} container 
     */
    renderProgressBar(container) {
      if (!container) return;
      
      const { percentage } = this.getProgress();
      
      let bar = container.querySelector('.sdk-progress-bar-fill');
      let text = container.querySelector('.sdk-progress-text');
      
      if (!bar) {
        container.innerHTML = '';
        container.className = 'sdk-progress-container';
        
        const track = document.createElement('div');
        track.className = 'sdk-progress-track';
        
        bar = document.createElement('div');
        bar.className = 'sdk-progress-bar-fill';
        
        text = document.createElement('span');
        text.className = 'sdk-progress-text';
        
        track.appendChild(bar);
        container.appendChild(track);
        container.appendChild(text);
      }
      
      bar.style.width = `${percentage}%`;
      if (text) {
        text.textContent = `${percentage}% Completado`;
      }
    }
  }
  

  /* --- navigation/index.js --- */
  /**
   * Navigation module entry.
   * @module navigation
   */
  
  
  
  
  /**
   * Creates and initializes the navigation module.
   * @param {import('../core/storage-adapter.js').StorageAdapter} storage
   * @param {import('../core/event-bus.js').EventBus} events
   * @param {Object} config
   * @param {HTMLElement} config.container Router pages container
   * @param {HTMLElement} config.sidebarContainer Sidebar element container
   * @param {Array<Object>} config.modules List of modules [{id, title}]
   * @returns {Object} Navigation API
   */
  function createNavigation(storage, events, config) {
    const router = new SpaRouter({
      container: config.container,
      modules: config.modules,
      events: events
    });
    
    const sidebar = new Sidebar({
      container: config.sidebarContainer,
      modules: config.modules,
      events: events,
      onModuleClick: (id) => router.showPage(id)
    });
    
    const progress = new ProgressTracker(storage, events, config.modules);
  
    // Initialize
    progress.init();
    sidebar.render();
    router.init();
  
    // Sync state initially
    const completedIds = progress.getCompleted();
    completedIds.forEach(id => sidebar.updateBadge(id, true));
  
    // Sync state on events
    events.on('module:completed', (data) => {
      sidebar.updateBadge(data.moduleId, true);
    });
  
    return {
      showPage: (pageId) => router.showPage(pageId),
      goNext: () => router.goNext(),
      goPrev: () => router.goPrev(),
      getCurrentPage: () => router.getCurrentPage(),
      markComplete: (moduleId) => progress.markComplete(moduleId),
      getProgress: () => progress.getProgress(),
      filterModules: (query) => sidebar.filterModules(query),
      toggleSidebar: () => sidebar.toggleMobile(),
      renderProgressBar: (container) => progress.renderProgressBar(container),
      onNavigate: (callback) => events.on('navigation:changed', callback),
      onModuleComplete: (callback) => events.on('module:completed', callback)
    };
  }
  

  /* --- reader/pages.js --- */
  /** Resuelve la estructura existente sin reconstruir formularios ni evidencias. */
  function obtenerPaginasLector(raiz) {
    return Array.from(raiz.querySelectorAll('section[data-reader-page]')).map(nodo => ({
      id: nodo.id,
      nodo,
      titulo: nodo.dataset.readerTitle || nodo.querySelector('h2, h1').textContent.trim(),
      tipo: nodo.dataset.readerKind || (nodo.id === 'inicio' ? 'orientation' : 'lesson')
    }));
  }
  
  /** Los destinos se buscan por id para admitir tildes y caracteres especiales. */
  function resolverDestinoLector(hash, paginas, documento) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return null; }
    const destino = documento.getElementById(id);
    const pagina = paginas.find(item => item.nodo === destino || item.nodo.contains(destino));
    return pagina ? {pagina, destino, hash: `#${id}`} : null;
  }
  
  function obtenerPosicionLector(storage, paginas) {
    const valor = storage.get('reader_position');
    if (!valor || !paginas.some(pagina => pagina.id === valor.pageId)) return null;
    return {pageId: valor.pageId, scrollY: Number.isFinite(valor.scrollY) && valor.scrollY > 0 ? valor.scrollY : 0};
  }
  
  function normalizarBusquedaLector(valor) {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').trim();
  }
  

  /* --- reader/controls.js --- */
  
  /** Actualiza el índice y los controles sin asociar lectura con aprobación. */
  function montarControlesLector({raiz, paginas, ir, posicion}) {
    const documento = raiz.ownerDocument;
    const cuerpo = documento.body;
    const menu = raiz.querySelector('[data-reader-menu]');
    const buscador = raiz.querySelector('[data-reader-search]');
    const vacio = raiz.querySelector('[data-reader-empty]');
    const anterior = raiz.querySelector('[data-reader-prev]');
    const siguiente = raiz.querySelector('[data-reader-next]');
    const continuar = raiz.querySelector('[data-reader-resume]');
    const enlaces = Array.from(raiz.querySelectorAll('#guide-nav a[href^="#"]'));
    const bajas = [];
    let indice = 0;
    let ultima = posicion && paginas.find(pagina => pagina.id === posicion.pageId);
  
    function escuchar(nodo, tipo, callback) {
      if (!nodo) return;
      nodo.addEventListener(tipo, callback);
      bajas.push(() => nodo.removeEventListener(tipo, callback));
    }
    function cerrarMenu(enfocar = false) {
      cuerpo.dataset.readerMenuState = 'closed';
      if (menu) menu.setAttribute('aria-expanded', 'false');
      if (enfocar && menu) menu.focus();
    }
    function alternarMenu() {
      const abierto = cuerpo.dataset.readerMenuState !== 'open';
      cuerpo.dataset.readerMenuState = abierto ? 'open' : 'closed';
      menu.setAttribute('aria-expanded', String(abierto));
    }
    function filtrar() {
      const consulta = normalizarBusquedaLector(buscador.value);
      let visibles = 0;
      enlaces.forEach(enlace => {
        const pagina = resolverDestinoLector(enlace.hash, paginas, documento)?.pagina;
        const texto = `${enlace.textContent} ${pagina?.nodo.textContent || ''}`;
        const coincide = normalizarBusquedaLector(texto).includes(consulta);
        (enlace.closest('li') || enlace).hidden = !coincide;
        if (coincide) visibles += 1;
      });
      if (vacio) vacio.hidden = visibles !== 0;
    }
    function escapar(evento) {
      if (evento.key !== 'Escape') return;
      if (evento.target === buscador && buscador.value) {
        buscador.value = '';
        filtrar();
        evento.preventDefault();
      } else if (cuerpo.dataset.readerMenuState === 'open') {
        cerrarMenu(true);
        evento.preventDefault();
      }
    }
    function retroceder() { if (indice > 0) ir(`#${paginas[indice - 1].id}`); }
    function avanzar() { if (indice < paginas.length - 1) ir(`#${paginas[indice + 1].id}`); }
    function actualizar(pagina) {
      indice = paginas.indexOf(pagina);
      const lecciones = paginas.filter(item => item.tipo === 'lesson');
      const progreso = pagina.tipo === 'lesson' ? `Lección ${lecciones.indexOf(pagina) + 1} de ${lecciones.length}` : pagina.tipo === 'orientation' ? 'Orientación' : 'Recursos';
      raiz.querySelectorAll('[data-reader-current]').forEach(nodo => { nodo.textContent = pagina.titulo; });
      raiz.querySelectorAll('[data-reader-progress]').forEach(nodo => { nodo.textContent = progreso; });
      raiz.querySelectorAll('[data-reader-skip]').forEach(enlace => { enlace.href = `#${pagina.id}`; });
      enlaces.forEach(enlace => {
        const activo = resolverDestinoLector(enlace.hash, paginas, documento)?.pagina === pagina;
        enlace.classList.toggle('is-current', activo);
        if (activo) enlace.setAttribute('aria-current', 'step'); else enlace.removeAttribute('aria-current');
      });
      if (anterior) { anterior.disabled = indice === 0; anterior.textContent = indice > 0 ? `Anterior: ${paginas[indice - 1].titulo}` : 'Inicio del recorrido'; }
      if (siguiente) { siguiente.disabled = indice === paginas.length - 1; siguiente.textContent = indice < paginas.length - 1 ? `Siguiente: ${paginas[indice + 1].titulo}` : 'Fin del recorrido'; }
      if (indice > 0) ultima = pagina;
      if (continuar) {
        const destino = ultima || paginas.find(item => item.tipo === 'lesson') || paginas[0];
        continuar.href = `#${destino.id}`;
        continuar.textContent = ultima ? `Continuar: ${ultima.titulo}` : 'Comenzar recorrido';
      }
      cerrarMenu();
    }
    escuchar(menu, 'click', alternarMenu);
    escuchar(buscador, 'input', filtrar);
    escuchar(documento, 'keydown', escapar);
    escuchar(anterior, 'click', retroceder);
    escuchar(siguiente, 'click', avanzar);
    cerrarMenu();
    return {actualizar, destroy() { bajas.forEach(baja => baja()); cerrarMenu(); }};
  }
  

  /* --- reader/navigation.js --- */
  
  /** Adapta enlaces anidados al router público; la visibilidad depende de SpaRouter. */
  function conectarNavegacionLector({raiz, app, paginas, posicion, actualizar}) {
    const documento = raiz.ownerDocument;
    const ventana = documento.defaultView;
    const desplazamientos = new Map();
    if (posicion) desplazamientos.set(posicion.pageId, posicion.scrollY);
    let actual = null;
    let hashAtendido = null;
    let cuadro = null;
    let vigente = true;
    let navegando = false;
  
    function guardar() {
      if (!actual) return;
      const scrollY = Math.max(0, ventana.scrollY);
      desplazamientos.set(actual.id, scrollY);
      app.storage.set('reader_position', {pageId: actual.id, scrollY});
    }
    function guardarDesplazamiento() {
      if (cuadro !== null) return;
      cuadro = ventana.requestAnimationFrame(() => { cuadro = null; guardar(); });
    }
    function ir(hash, {enfocar = true, desdeRouter = false, reemplazar = false} = {}) {
      const destino = resolverDestinoLector(hash, paginas, documento) || {pagina: paginas[0], destino: paginas[0].nodo, hash: `#${paginas[0].id}`};
      if (actual?.id !== destino.pagina.id) guardar();
      actual = destino.pagina;
      navegando = true;
      if (!desdeRouter) {
        const metodo = reemplazar || ventana.location.hash === destino.hash ? 'replaceState' : 'pushState';
        // El router recibe un hash de página válido sin agregar otro paso al historial.
        ventana.history[metodo](null, '', new URL(`#${actual.id}`, ventana.location.href).href);
      }
      if (!desdeRouter && app.navigation.getCurrentPage() !== actual.id) app.navigation.showPage(actual.id);
      navegando = false;
      ventana.history.replaceState(null, '', new URL(destino.hash, ventana.location.href).href);
      hashAtendido = destino.hash;
      actualizar(actual);
      const paginaEsperada = actual;
      ventana.queueMicrotask(() => {
        if (!vigente || actual !== paginaEsperada) return;
        let plegado = destino.destino.closest('details');
        while (plegado && actual.nodo.contains(plegado)) {
          plegado.open = true;
          plegado = plegado.parentElement.closest('details');
        }
        if (enfocar) {
          const titulo = actual.nodo.querySelector('h2, h1');
          titulo.setAttribute('tabindex', '-1');
          titulo.focus({preventScroll: true});
        }
        ventana.scrollTo({top: desplazamientos.get(actual.id) || 0, behavior: 'instant'});
        if (destino.destino !== actual.nodo) destino.destino.scrollIntoView({block: 'start', behavior: 'instant'});
        guardar();
      });
    }
    function cambiarHash(evento) {
      // SpaRouter reconoce ids de página; los hashes interiores se resuelven aquí primero.
      evento.stopImmediatePropagation();
      if (ventana.location.hash !== hashAtendido) ir(ventana.location.hash, {reemplazar: true});
    }
    function pulsarEnlace(evento) {
      const enlace = evento.target.closest('a[href]');
      if (!enlace || evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || enlace.hasAttribute('download') || enlace.target === '_blank') return;
      const referencia = enlace.getAttribute('href');
      const url = new URL(referencia.startsWith('#') ? referencia : enlace.href, ventana.location.href);
      if (url.origin !== ventana.location.origin || url.pathname !== ventana.location.pathname || url.search !== ventana.location.search || !url.hash) return;
      if (!resolverDestinoLector(url.hash, paginas, documento)) return;
      evento.preventDefault();
      ir(url.hash);
    }
    function navegarDesdeRouter({pageId}) { if (!navegando) ir(`#${pageId}`, {desdeRouter: true}); }
    ventana.addEventListener('hashchange', cambiarHash, true);
    ventana.addEventListener('scroll', guardarDesplazamiento, {passive: true});
    ventana.addEventListener('pagehide', guardar);
    raiz.addEventListener('click', pulsarEnlace);
    app.navigation.onNavigate(navegarDesdeRouter);
  
    function destroy() {
      guardar();
      vigente = false;
      if (cuadro !== null) ventana.cancelAnimationFrame(cuadro);
      ventana.removeEventListener('hashchange', cambiarHash, true);
      ventana.removeEventListener('scroll', guardarDesplazamiento);
      ventana.removeEventListener('pagehide', guardar);
      raiz.removeEventListener('click', pulsarEnlace);
      app.events.off('navigation:changed', navegarDesdeRouter);
    }
    return {ir, destroy};
  }
  

  /* --- reader/index.js --- */
  
  
  
  /** Monta lectura por secciones con el almacenamiento y el router de la guía. */
  function montarLector({raiz, app, initialHash} = {}) {
    if (!raiz || !app?.navigation) throw new TypeError('El lector necesita una raíz y la navegación de la guía.');
    const paginas = obtenerPaginasLector(raiz);
    if (!paginas.length) throw new TypeError('El lector necesita páginas identificadas.');
    const posicion = obtenerPosicionLector(app.storage, paginas);
    let navegacion;
    const controles = montarControlesLector({raiz, paginas, posicion, ir: hash => navegacion.ir(hash)});
    navegacion = conectarNavegacionLector({raiz, app, paginas, posicion, actualizar: controles.actualizar});
    raiz.ownerDocument.body.classList.add('reader-ready');
    const hash = initialHash ?? raiz.ownerDocument.defaultView.location.hash;
    const explicito = hash && hash !== '#';
    navegacion.ir(explicito ? hash : `#${posicion?.pageId || paginas[0].id}`, {enfocar: Boolean(explicito), reemplazar: true});
    return {
      ir: navegacion.ir,
      destroy() {
        navegacion.destroy();
        controles.destroy();
        raiz.ownerDocument.body.classList.remove('reader-ready');
        paginas.forEach(pagina => { pagina.nodo.style.display = ''; });
      }
    };
  }
  
  const reader = {montarLector};
  

  /* --- builders/table-renderer.js --- */
  /**
   * Utilidades seguras para renderizar tablas
   */
  
  /**
   * Renderiza thead de una tabla
   * @param {Array} schema 
   * @returns {HTMLTableSectionElement}
   */
  function renderTableHead(schema) {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    
    schema.forEach(field => {
      const th = document.createElement('th');
      th.textContent = field.label;
      tr.appendChild(th);
    });
    
    thead.appendChild(tr);
    return thead;
  }
  
  /**
   * Renderiza tbody de una tabla
   * @param {Array} rows 
   * @param {Array} schema 
   * @returns {HTMLTableSectionElement}
   */
  function renderTableBody(rows, schema) {
    const tbody = document.createElement('tbody');
    
    rows.forEach(row => {
      tbody.appendChild(renderTableRow(row, schema));
    });
    
    if (rows.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = schema.length;
      td.textContent = 'No hay datos.';
      td.className = 'sdk-text-center sdk-text-muted';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    
    return tbody;
  }
  
  /**
   * Renderiza tr de una tabla
   * @param {Object} row 
   * @param {Array} schema 
   * @returns {HTMLTableRowElement}
   */
  function renderTableRow(row, schema) {
    const tr = document.createElement('tr');
    
    schema.forEach(field => {
      const td = document.createElement('td');
      // Uso de textContent para prevenir XSS
      td.textContent = row[field.key] || '';
      tr.appendChild(td);
    });
    
    return tr;
  }
  

  /* --- builders/exporters.js --- */
  /**
   * Utilidades para exportación de datos
   */
  
  /**
   * Convierte datos a tabla Markdown
   * @param {Array} rows 
   * @param {Array} schema 
   * @returns {string}
   */
  function toMarkdownTable(rows, schema) {
    if (!rows || rows.length === 0) return '';
    
    const headers = schema.map(f => f.label);
    const keys = schema.map(f => f.key);
    
    let md = '| ' + headers.join(' | ') + ' |\n';
    md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    rows.forEach(row => {
      const rowValues = keys.map(k => {
        let val = row[k] || '';
        // Escapar pipes en markdown
        return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      });
      md += '| ' + rowValues.join(' | ') + ' |\n';
    });
    
    return md;
  }
  
  /**
   * Convierte datos a CSV
   * @param {Array} rows 
   * @param {Array} schema 
   * @returns {string}
   */
  function toCSV(rows, schema) {
    if (!rows || rows.length === 0) return '';
    
    const headers = schema.map(f => f.label);
    const keys = schema.map(f => f.key);
    
    const escapeCSV = (val) => {
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    
    let csv = headers.map(escapeCSV).join(',') + '\n';
    
    rows.forEach(row => {
      csv += keys.map(k => escapeCSV(row[k])).join(',') + '\n';
    });
    
    return csv;
  }
  
  /**
   * Convierte a JSON string
   * @param {Array} rows 
   * @returns {string}
   */
  function toJSON(rows) {
    return JSON.stringify(rows, null, 2);
  }
  
  /**
   * Copia texto al portapapeles
   * @param {string} text 
   * @param {HTMLElement} buttonEl 
   * @param {string} successText 
   * @param {number} duration 
   */
  async function copyToClipboard(text, buttonEl, successText = '¡Copiado!', duration = 2000) {
    try {
      await navigator.clipboard.writeText(text);
      if (buttonEl) {
        const originalText = buttonEl.textContent;
        buttonEl.textContent = successText;
        setTimeout(() => {
          buttonEl.textContent = originalText;
        }, duration);
      }
    } catch (err) {
      console.error('Error al copiar: ', err);
    }
  }
  
  /**
   * Descarga contenido como archivo
   * @param {string} text 
   * @param {string} filename 
   * @param {string} mime 
   */
  function downloadFile(text, filename, mime = 'text/plain') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
  

  /* --- builders/validation-rules.js --- */
  /**
   * Reglas de validación para formularios
   */
  
  /**
   * Verifica campos requeridos
   * @param {Array} rows 
   * @param {Array} schema 
   * @returns {Array} Advertencias
   */
  function requiredFieldCheck(rows, schema) {
    const warnings = [];
    const requiredKeys = schema.filter(f => f.required).map(f => f.key);
    
    rows.forEach((row, index) => {
      requiredKeys.forEach(key => {
        if (!row[key] || String(row[key]).trim() === '') {
          warnings.push(`Fila ${index + 1}: el campo ${key} está vacío.`);
        }
      });
    });
    
    return warnings;
  }
  
  /**
   * Verifica trazabilidad de fuente
   * @param {Array} rows 
   * @param {string} sourceKey 
   * @returns {Array} Advertencias
   */
  function sourceTraceabilityCheck(rows, sourceKey = 'source') {
    const warnings = [];
    
    rows.forEach((row, index) => {
      if (!row[sourceKey] || String(row[sourceKey]).trim() === '') {
        warnings.push(`Fila ${index + 1} no tiene trazabilidad (falta fuente/origen).`);
      }
    });
    
    return warnings;
  }
  
  /**
   * Verifica duplicados en una columna
   * @param {Array} rows 
   * @param {string} key 
   * @returns {Array} Advertencias
   */
  function duplicateCheck(rows, key) {
    const warnings = [];
    const seen = new Set();
    
    rows.forEach((row, index) => {
      const val = String(row[key] || '').trim();
      if (val) {
        if (seen.has(val)) {
          warnings.push(`Fila ${index + 1}: Valor duplicado en ${key} -> "${val}".`);
        }
        seen.add(val);
      }
    });
    
    return warnings;
  }
  
  /**
   * Crea un validador compuesto
   * @param {Array} rules - Arreglo de objetos { check: Function, warn: string }
   * @returns {Function} Función validadora
   */
  function createValidator(rules) {
    return function(rows, schema) {
      let allWarnings = [];
      
      rules.forEach(rule => {
        if (rule.check) {
          const warnings = rule.check(rows, schema) || [];
          if (warnings.length > 0) {
            allWarnings = allWarnings.concat(warnings.map(w => `${rule.warn} | ${w}`));
          }
        }
      });
      
      return allWarnings;
    };
  }
  

  /* --- builders/form-engine.js --- */
  
  
  /**
   * FormEngine
   * Generador de formularios basado en esquemas para constructores de artefactos
   */
  class FormEngine {
    /**
     * @param {Object} config - Configuración del formulario
     * @param {string} config.id - Identificador único
     * @param {HTMLElement} config.container - Contenedor DOM
     * @param {Array} config.schema - Esquema de campos
     * @param {Object} [config.example] - Datos de ejemplo
     * @param {Object} config.events - Event bus
     * @param {Object} config.storage - Gestor de almacenamiento
     * @param {Array} [config.exports] - Tipos de exportación ('markdown', 'csv', 'clipboard')
     * @param {Function} [config.onRowAdded] - Callback al añadir fila
     * @param {Array} [config.validationRules] - Reglas de validación
     */
    constructor(config) {
      this.id = config.id;
      this.container = config.container;
      this.schema = config.schema || [];
      this.example = config.example || null;
      this.events = config.events;
      this.storage = config.storage;
      this.exports = config.exports || ['clipboard', 'csv'];
      this.onRowAdded = config.onRowAdded || null;
      this.validationRules = config.validationRules || [];
      
      this.rows = [];
      this.formElement = null;
      this.tableElement = null;
      this.statusElement = null;
    }
  
    /**
     * Inicializa el formulario, carga estado previo y renderiza
     */
    init() {
      // Cargar estado previo
      if (this.storage) {
        const saved = this.storage.get(`${this.id}_rows`);
        if (saved && Array.isArray(saved)) {
          this.rows = saved;
        }
      }
      
      this.renderForm();
      this.renderTable();
    }
  
    /**
     * Renderiza el formulario utilizando métodos DOM seguros
     */
    renderForm() {
      this.container.innerHTML = '';
      
      // Contenedor principal
      const wrapper = document.createElement('div');
      wrapper.className = 'sdk-form-engine';
      
      // Formulario
      this.formElement = document.createElement('form');
      this.formElement.className = 'sdk-form-grid';
      this.formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addRow();
      });
      
      // Campos del formulario
      this.schema.forEach(field => {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = `sdk-form-group ${field.fullWidth ? 'sdk-full-width' : ''}`;
        
        const label = document.createElement('label');
        label.textContent = field.label;
        label.setAttribute('for', `${this.id}_${field.key}`);
        
        if (field.tooltip) {
          const tooltip = document.createElement('span');
          tooltip.textContent = ' ⓘ';
          tooltip.className = 'sdk-tooltip';
          tooltip.setAttribute('title', field.tooltip);
          label.appendChild(tooltip);
        }
        
        let input;
        if (field.type === 'textarea') {
          input = document.createElement('textarea');
        } else {
          input = document.createElement('input');
          input.type = field.type || 'text';
        }
        
        input.id = `${this.id}_${field.key}`;
        input.name = field.key;
        if (field.required) {
          input.required = true;
        }
        
        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        this.formElement.appendChild(fieldGroup);
      });
      
      // Acciones del formulario
      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'sdk-form-actions sdk-full-width';
      
      const submitBtn = document.createElement('button');
      submitBtn.type = 'submit';
      submitBtn.textContent = 'Añadir';
      submitBtn.className = 'sdk-btn sdk-btn-primary';
      actionsGroup.appendChild(submitBtn);
      
      if (this.example) {
        const exampleBtn = document.createElement('button');
        exampleBtn.type = 'button';
        exampleBtn.textContent = 'Cargar Ejemplo';
        exampleBtn.className = 'sdk-btn sdk-btn-secondary';
        exampleBtn.addEventListener('click', () => this.loadExample());
        actionsGroup.appendChild(exampleBtn);
      }
      
      this.formElement.appendChild(actionsGroup);
      wrapper.appendChild(this.formElement);
      
      // Estado/Mensajes
      this.statusElement = document.createElement('div');
      this.statusElement.className = 'sdk-form-status';
      wrapper.appendChild(this.statusElement);
      
      // Toolbar de tabla
      const tableToolbar = document.createElement('div');
      tableToolbar.className = 'sdk-table-toolbar';
      
      if (this.exports.includes('csv')) {
        const csvBtn = document.createElement('button');
        csvBtn.textContent = 'Descargar CSV';
        csvBtn.className = 'sdk-btn sdk-btn-sm';
        csvBtn.addEventListener('click', () => {
          const csv = toCSV(this.rows, this.schema);
          downloadFile(csv, `${this.id}_export.csv`, 'text/csv');
        });
        tableToolbar.appendChild(csvBtn);
      }
      
      if (this.exports.includes('clipboard') || this.exports.includes('markdown')) {
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copiar MD';
        copyBtn.className = 'sdk-btn sdk-btn-sm';
        copyBtn.addEventListener('click', () => {
          const md = toMarkdownTable(this.rows, this.schema);
          copyToClipboard(md, copyBtn, '¡Copiado!', 2000);
        });
        tableToolbar.appendChild(copyBtn);
      }
      
      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Limpiar';
      clearBtn.className = 'sdk-btn sdk-btn-sm sdk-btn-danger';
      clearBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de limpiar todos los datos?')) {
          this.clear();
        }
      });
      tableToolbar.appendChild(clearBtn);
      
      wrapper.appendChild(tableToolbar);
      
      // Tabla
      this.tableElement = document.createElement('table');
      this.tableElement.className = 'sdk-table';
      this.tableElement.appendChild(renderTableHead(this.schema));
      
      wrapper.appendChild(this.tableElement);
      this.container.appendChild(wrapper);
    }
  
    /**
     * Carga los datos de ejemplo en los campos
     */
    loadExample() {
      if (!this.example) return;
      
      this.schema.forEach(field => {
        const input = this.formElement.elements[field.key];
        if (input && this.example[field.key] !== undefined) {
          input.value = this.example[field.key];
        }
      });
    }
  
    /**
     * Añade una nueva fila con los datos del formulario
     */
    addRow() {
      const newRow = {};
      let isValid = true;
      
      this.schema.forEach(field => {
        const input = this.formElement.elements[field.key];
        if (input) {
          const value = input.value.trim();
          if (field.required && !value) {
            isValid = false;
          }
          newRow[field.key] = value;
        }
      });
      
      if (!isValid) return;
      
      this.rows.push(newRow);
      this.formElement.reset();
      
      this.saveState();
      this.renderTable();
      this.validate();
      
      if (this.onRowAdded) {
        this.onRowAdded(newRow);
      }
      
      if (this.events) {
        this.events.emit('builder:row:added', { id: this.id, row: newRow });
      }
    }
  
    /**
     * Renderiza el cuerpo de la tabla
     */
    renderTable() {
      const oldBody = this.tableElement.querySelector('tbody');
      if (oldBody) {
        this.tableElement.removeChild(oldBody);
      }
      
      const tbody = renderTableBody(this.rows, this.schema);
      this.tableElement.appendChild(tbody);
    }
  
    /**
     * Limpia el estado
     */
    clear() {
      this.rows = [];
      this.saveState();
      this.renderTable();
      this.statusElement.textContent = '';
    }
  
    /**
     * Retorna copia de las filas
     */
    getRows() {
      return [...this.rows];
    }
  
    /**
     * Guarda el estado
     */
    saveState() {
      if (this.storage) {
        this.storage.set(`${this.id}_rows`, this.rows);
      }
    }
  
    /**
     * Ejecuta reglas de validación
     */
    validate() {
      if (!this.validationRules || this.validationRules.length === 0) return [];
      
      let warnings = [];
      this.validationRules.forEach(rule => {
        if (rule.check) {
          const result = rule.check(this.rows, this.schema);
          if (result && result.length > 0) {
            warnings = warnings.concat(result.map(w => rule.warn + ': ' + w));
          }
        }
      });
      
      if (warnings.length > 0) {
        this.statusElement.innerHTML = '';
        warnings.forEach(w => {
          const p = document.createElement('p');
          p.className = 'sdk-warning';
          p.textContent = `⚠️ ${w}`;
          this.statusElement.appendChild(p);
        });
      } else {
        this.statusElement.innerHTML = '';
      }
      
      return warnings;
    }
  }
  

  /* --- builders/index.js --- */
  
  
  /**
   * Inicializa módulo builders
   * @param {Object} storage - Instancia de almacenamiento
   * @param {Object} events - Instancia de EventBus
   * @returns {Object} API
   */
  function createBuilders(storage, events) {
    const instances = new Map();
    
    return {
      /**
       * Crea e inicializa un FormEngine
       * @param {Object} config 
       * @returns {FormEngine}
       */
      create(config) {
        const fullConfig = {
          ...config,
          storage,
          events
        };
        
        const engine = new FormEngine(fullConfig);
        engine.init();
        instances.set(config.id, engine);
        return engine;
      },
      
      /**
       * Obtiene todos los constructores
       * @returns {Map}
       */
      getAll() {
        return instances;
      }
    };
  }
  

  /* --- simulators/registry.js --- */
  /**
   * Registro de plugins de simuladores
   */
  class SimulatorRegistry {
    /**
     * @param {Object} events - Event bus
     * @param {Object} gamification - Sistema de gamificación
     */
    constructor(events, gamification) {
      this.events = events;
      this.gamification = gamification;
      this.plugins = new Map();
      this.activeSimulators = [];
    }
  
    /**
     * Registra un plugin.
     *
     * Acepta tanto una clase (con `render` en el prototipo, que es la forma en que
     * se declaran QuizPlugin y DebugPlugin) como un objeto con `render` propio.
     * La comprobación anterior solo miraba `plugin.render`, por lo que rechazaba
     * toda clase y ningún simulador llegaba a registrarse.
     *
     * @param {Function|Object} plugin
     */
    register(plugin) {
      if (!plugin || !plugin.type || typeof this._resolveRender(plugin) !== 'function') {
        console.warn('Plugin inválido. Debe tener type y render()');
        return;
      }
      this.plugins.set(plugin.type, plugin);
    }
  
    /**
     * Devuelve el método render del plugin, sea clase o instancia.
     * @param {Function|Object} plugin
     * @returns {Function|undefined}
     * @private
     */
    _resolveRender(plugin) {
      if (typeof plugin.render === 'function') return plugin.render;
      if (plugin.prototype && typeof plugin.prototype.render === 'function') {
        return plugin.prototype.render;
      }
      return undefined;
    }
  
    /**
     * Escanea el DOM e inicializa simuladores
     */
    init() {
      const containers = document.querySelectorAll('[data-simulator], [class*="sim-"][class*="-container"]');
      
      containers.forEach(container => {
        let type = container.getAttribute('data-simulator');
        if (!type) {
          // Extraer type de clase, ej. sim-quiz-container -> quiz
          const match = container.className.match(/sim-([a-z0-9-]+)-container/i);
          if (match) type = match[1];
        }
        
        if (type && this.plugins.has(type)) {
          const PluginClass = this.plugins.get(type);
          // Asumiendo que PluginClass es una clase que extiende BaseSimulator
          const instance = new PluginClass({
            container,
            events: this.events,
            gamification: this.gamification,
            // Pasar dataset como config adicional
            ...container.dataset
          });
          
          instance.render(container);
          this.activeSimulators.push(instance);
        }
      });
    }
  
    /**
     * Obtiene un plugin
     * @param {string} type 
     * @returns {Object}
     */
    get(type) {
      return this.plugins.get(type);
    }
  
    /**
     * Retorna todos los plugins
     * @returns {Map}
     */
    getAll() {
      return this.plugins;
    }
  
    /**
     * Limpieza
     */
    destroy() {
      this.activeSimulators.forEach(sim => {
        if (typeof sim.destroy === 'function') {
          sim.destroy();
        }
      });
      this.activeSimulators = [];
    }
  }
  

  /* --- simulators/base-simulator.js --- */
  /**
   * Clase base para simuladores
   */
  class BaseSimulator {
    /**
     * @param {Object} config 
     * @param {string} config.type
     * @param {string} config.label
     * @param {number} config.xpReward
     * @param {HTMLElement} config.container
     * @param {Object} config.events
     * @param {Object} config.gamification
     */
    constructor(config) {
      this.type = config.type;
      this.label = config.label || 'Simulador';
      this.xpReward = config.xpReward || 10;
      this.container = config.container;
      this.events = config.events;
      this.gamification = config.gamification;
    }
  
    /**
     * Método abstracto para renderizar
     * @param {HTMLElement} container 
     */
    render(container) {
      throw new Error('El método render() debe ser implementado');
    }
  
    /**
     * Validación opcional
     * @param {Object} state 
     * @returns {boolean}
     */
    validate(state) {
      return true;
    }
  
    /**
     * Otorga puntos de experiencia
     */
    awardXP() {
      if (this.gamification) {
        this.gamification.addXP(this.xpReward, this.label);
      }
    }
  
    /**
     * Emite evento
     * @param {string} name 
     * @param {Object} detail 
     */
    emitEvent(name, detail = {}) {
      if (this.events) {
        this.events.emit(`simulator:${this.type}:${name}`, {
          simulator: this,
          ...detail
        });
      }
    }
  
    /**
     * Limpieza
     */
    destroy() {
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }
  

  /* --- simulators/dnd-engine.js --- */
  /**
   * Motor reutilizable para Drag and Drop
   */
  class DnDEngine {
    /**
     * @param {Object} config 
     * @param {HTMLElement} config.canvas - Área de soltado
     * @param {HTMLElement} config.palette - Área de elementos arrastrables
     * @param {Function} config.onDrop - Callback al soltar
     * @param {Function} config.onReorder - Callback al reordenar
     * @param {Function} config.onDelete - Callback al eliminar
     */
    constructor(config) {
      this.canvas = config.canvas;
      this.palette = config.palette;
      this.onDrop = config.onDrop || (() => {});
      this.onReorder = config.onReorder || (() => {});
      this.onDelete = config.onDelete || (() => {});
      
      this.draggedItemType = null;
      this.draggedItemLabel = null;
    }
  
    /**
     * Inicializa listeners
     */
    init() {
      if (!this.canvas || !this.palette) return;
  
      this.canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.canvas.classList.add('sdk-drag-over');
      });
  
      this.canvas.addEventListener('dragleave', () => {
        this.canvas.classList.remove('sdk-drag-over');
      });
  
      this.canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        this.canvas.classList.remove('sdk-drag-over');
        this.handleDrop(e);
      });
    }
  
    /**
     * Registra un elemento arrastrable
     * @param {string} type 
     * @param {string} label 
     * @param {string} icon 
     */
    addPaletteItem(type, label, icon = '') {
      const item = document.createElement('div');
      item.className = 'sdk-dnd-palette-item';
      item.draggable = true;
      item.dataset.type = type;
      item.dataset.label = label;
      item.innerHTML = `<span>${icon}</span> <span>${label}</span>`;
      
      item.addEventListener('dragstart', (e) => {
        this.draggedItemType = type;
        this.draggedItemLabel = label;
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
      });
      
      this.palette.appendChild(item);
    }
  
    /**
     * Procesa el evento de soltar
     * @param {DragEvent} event 
     */
    handleDrop(event) {
      if (!this.draggedItemType) return;
      
      const wrapper = document.createElement('div');
      wrapper.className = 'sdk-dnd-canvas-item';
      wrapper.dataset.type = this.draggedItemType;
      
      const content = document.createElement('div');
      content.className = 'sdk-dnd-content';
      content.textContent = this.draggedItemLabel;
      
      const toolbar = document.createElement('div');
      toolbar.className = 'sdk-dnd-toolbar';
      
      const btnUp = document.createElement('button');
      btnUp.textContent = '↑';
      btnUp.onclick = () => this.handleReorder(wrapper, 'up');
      
      const btnDown = document.createElement('button');
      btnDown.textContent = '↓';
      btnDown.onclick = () => this.handleReorder(wrapper, 'down');
      
      const btnDel = document.createElement('button');
      btnDel.textContent = '×';
      btnDel.className = 'sdk-text-danger';
      btnDel.onclick = () => this.handleDelete(wrapper);
      
      toolbar.appendChild(btnUp);
      toolbar.appendChild(btnDown);
      toolbar.appendChild(btnDel);
      
      wrapper.appendChild(content);
      wrapper.appendChild(toolbar);
      
      this.canvas.appendChild(wrapper);
      this.onDrop({ type: this.draggedItemType, label: this.draggedItemLabel, element: wrapper });
      
      this.draggedItemType = null;
      this.draggedItemLabel = null;
    }
  
    /**
     * Reordena un elemento
     * @param {HTMLElement} wrapper 
     * @param {string} direction 'up' o 'down'
     */
    handleReorder(wrapper, direction) {
      if (direction === 'up' && wrapper.previousElementSibling) {
        this.canvas.insertBefore(wrapper, wrapper.previousElementSibling);
      } else if (direction === 'down' && wrapper.nextElementSibling) {
        this.canvas.insertBefore(wrapper.nextElementSibling, wrapper);
      }
      this.onReorder({ element: wrapper, direction });
    }
  
    /**
     * Elimina un elemento
     * @param {HTMLElement} wrapper 
     */
    handleDelete(wrapper) {
      this.canvas.removeChild(wrapper);
      this.onDelete({ element: wrapper });
    }
  
    /**
     * Retorna los elementos actuales en el canvas
     * @returns {Array}
     */
    getCanvasElements() {
      return Array.from(this.canvas.children).map(el => ({
        type: el.dataset.type,
        element: el
      }));
    }
  
    /**
     * Limpia el canvas
     */
    clear() {
      this.canvas.innerHTML = '';
    }
  
    /**
     * Limpia eventos
     */
    destroy() {
      // Los eventos en canvas se pierden si se elimina del DOM
    }
  }
  

  /* --- simulators/index.js --- */
  
  /**
   * Inicializa módulo simulators
   * @param {Object} events - Instancia de EventBus
   * @param {Object} gamification - Instancia de GamificationEngine
   * @returns {Object} API
   */
  function createSimulators(events, gamification) {
    const registry = new SimulatorRegistry(events, gamification);
    
    return {
      /**
       * Registra un plugin
       * @param {Object} plugin 
       */
      register(plugin) {
        registry.register(plugin);
      },
      
      /**
       * Inicializa todos los simuladores en el DOM
       */
      init() {
        registry.init();
      },
      
      /**
       * Obtiene un plugin
       * @param {string} type 
       * @returns {Object}
       */
      get(type) {
        return registry.get(type);
      },
      
      /**
       * Limpieza
       */
      destroy() {
        registry.destroy();
      }
    };
  }
  

  /* --- simulators/plugins/quiz-plugin.js --- */
  
  /**
   * Plugin de simulador de cuestionario (Quiz)
   */
  class QuizPlugin extends BaseSimulator {
    constructor(config) {
      super({
        type: 'quiz',
        label: 'Quiz',
        xpReward: 15,
        ...config
      });
      
      // Parse questions from config or set defaults
      try {
        this.questions = config.questions ? JSON.parse(config.questions) : [];
      } catch(e) {
        this.questions = [];
      }
      
      this.currentQuestion = null;
    }
  
    /**
     * @param {HTMLElement} container 
     */
    render(container) {
      this.container = container;
      this.container.innerHTML = '';
      
      if (!this.questions || this.questions.length === 0) {
        this.container.textContent = 'No hay preguntas configuradas.';
        return;
      }
      
      // Pick random question
      const idx = Math.floor(Math.random() * this.questions.length);
      this.currentQuestion = this.questions[idx];
      
      const card = document.createElement('div');
      card.className = 'sdk-quiz-card';
      
      const qText = document.createElement('h3');
      qText.textContent = this.currentQuestion.question;
      card.appendChild(qText);
      
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'sdk-quiz-options';
      
      this.currentQuestion.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'sdk-btn sdk-btn-outline';
        btn.textContent = opt;
        btn.onclick = () => this.evaluateAnswer(i, btn, optionsContainer);
        optionsContainer.appendChild(btn);
      });
      
      card.appendChild(optionsContainer);
      
      const feedback = document.createElement('div');
      feedback.className = 'sdk-quiz-feedback';
      feedback.style.display = 'none';
      card.appendChild(feedback);
      
      this.container.appendChild(card);
    }
  
    /**
     * Evalúa la respuesta
     * @param {number} selectedIdx 
     * @param {HTMLElement} btn 
     * @param {HTMLElement} container 
     */
    evaluateAnswer(selectedIdx, btn, container) {
      // Disable buttons
      Array.from(container.children).forEach(b => {
        b.disabled = true;
      });
      
      const isCorrect = selectedIdx === this.currentQuestion.correct;
      const feedback = this.container.querySelector('.sdk-quiz-feedback');
      feedback.style.display = 'block';
      
      if (isCorrect) {
        btn.classList.add('sdk-correct');
        feedback.textContent = '¡Correcto!';
        feedback.className = 'sdk-quiz-feedback sdk-text-success';
        this.awardXP();
        this.emitEvent('completed', { success: true });
      } else {
        btn.classList.add('sdk-incorrect');
        feedback.textContent = 'Incorrecto. Intenta de nuevo.';
        feedback.className = 'sdk-quiz-feedback sdk-text-danger';
        this.emitEvent('completed', { success: false });
      }
      
      setTimeout(() => {
        this.render(this.container);
      }, 2000);
    }
  }
  
  // Configuración requerida para el registro
  QuizPlugin.type = 'quiz';
  

  /* --- simulators/plugins/debug-plugin.js --- */
  
  /**
   * Plugin de simulador de depuración (Fix-the-Bug)
   */
  class DebugPlugin extends BaseSimulator {
    constructor(config) {
      super({
        type: 'debug',
        label: 'Debug',
        xpReward: 20,
        ...config
      });
      
      try {
        this.challenges = config.challenges ? JSON.parse(config.challenges) : [];
      } catch(e) {
        this.challenges = [];
      }
      
      this.currentChallenge = null;
    }
  
    /**
     * @param {HTMLElement} container 
     */
    render(container) {
      this.container = container;
      this.container.innerHTML = '';
      
      if (!this.challenges || this.challenges.length === 0) {
        this.container.textContent = 'No hay retos configurados.';
        return;
      }
      
      const idx = Math.floor(Math.random() * this.challenges.length);
      this.currentChallenge = this.challenges[idx];
      
      const wrapper = document.createElement('div');
      wrapper.className = 'sdk-debug-challenge';
      
      const title = document.createElement('h3');
      title.textContent = this.currentChallenge.title || 'Encuentra el error';
      wrapper.appendChild(title);
      
      const codeBlock = document.createElement('pre');
      codeBlock.className = 'sdk-code-block sdk-bg-dark sdk-text-light';
      codeBlock.textContent = this.currentChallenge.buggyCode;
      wrapper.appendChild(codeBlock);
      
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'sdk-debug-options';
      
      this.currentChallenge.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'sdk-btn sdk-btn-secondary';
        btn.textContent = opt;
        btn.onclick = () => this.evaluate(i, btn, optionsContainer, wrapper);
        optionsContainer.appendChild(btn);
      });
      
      wrapper.appendChild(optionsContainer);
      this.container.appendChild(wrapper);
    }
  
    /**
     * Evalúa la solución
     * @param {number} selectedIdx 
     * @param {HTMLElement} btn 
     * @param {HTMLElement} container 
     * @param {HTMLElement} wrapper 
     */
    evaluate(selectedIdx, btn, container, wrapper) {
      Array.from(container.children).forEach(b => {
        b.disabled = true;
      });
      
      const isCorrect = selectedIdx === this.currentChallenge.correct;
      
      let explanationDiv = wrapper.querySelector('.sdk-debug-explanation');
      if (!explanationDiv) {
        explanationDiv = document.createElement('div');
        explanationDiv.className = 'sdk-debug-explanation';
        wrapper.appendChild(explanationDiv);
      }
      
      if (isCorrect) {
        btn.classList.add('sdk-btn-success');
        explanationDiv.innerHTML = ''; const p1 = document.createElement('p'); p1.className = 'sdk-text-success'; p1.textContent = '¡Solucionado!'; const p2 = document.createElement('p'); p2.textContent = this.currentChallenge.explanation; explanationDiv.appendChild(p1); explanationDiv.appendChild(p2);
        this.awardXP();
        this.emitEvent('solved', { challenge: this.currentChallenge });
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'sdk-btn sdk-btn-primary sdk-mt-2';
        nextBtn.textContent = 'Siguiente reto';
        nextBtn.onclick = () => this.render(this.container);
        explanationDiv.appendChild(nextBtn);
        
      } else {
        btn.classList.add('sdk-btn-danger');
        explanationDiv.innerHTML = ''; const p1 = document.createElement('p'); p1.className = 'sdk-text-danger'; p1.textContent = 'Esa no es la solución. Revisa el código de nuevo.'; explanationDiv.appendChild(p1);
        
        setTimeout(() => {
          Array.from(container.children).forEach(b => {
            b.disabled = false;
          });
          btn.classList.remove('sdk-btn-danger');
          explanationDiv.innerHTML = '';
        }, 2000);
      }
    }
  }
  
  DebugPlugin.type = 'debug';
  

  /* --- code/tokenizer.js --- */
  /**
   * Motor de tokenización genérico para bloques de código de las guías.
   *
   * No usa dependencias externas: las guías deben resaltar código sin conexión y
   * sin CDN. Un CDN caído deja al aprendiz con un muro de texto gris, y el
   * estándar educativo exige que el aprendizaje central funcione sin proveedor.
   *
   * Una gramática es una lista ordenada de reglas `{ t, re }` con expresiones
   * regulares ancladas (`y`). Gana la primera que casa en la posición actual, así
   * que el orden de la lista ES la precedencia: comentarios y cadenas primero,
   * porque dentro de ellos ninguna otra regla debe aplicarse.
   */
  
  /**
   * Recorre el texto y devuelve la lista plana de tokens.
   * Lo que ninguna regla reconoce se acumula como `plain` en lugar de perderse.
   */
  function tokenize(codigo, gramatica) {
    const reglas = (gramatica && gramatica.rules) || [];
    const tokens = [];
    const n = codigo.length;
    let i = 0;
    let sueltoDesde = -1;
  
    function cerrarSuelto(hasta) {
      if (sueltoDesde < 0) return;
      tokens.push({ type: 'plain', text: codigo.slice(sueltoDesde, hasta) });
      sueltoDesde = -1;
    }
  
    while (i < n) {
      let encontrado = null;
  
      for (let r = 0; r < reglas.length; r++) {
        const regla = reglas[r];
        regla.re.lastIndex = i;
        const m = regla.re.exec(codigo);
        if (m && m.index === i && m[0].length > 0) {
          encontrado = { type: regla.t, text: m[0] };
          break;
        }
      }
  
      if (encontrado) {
        cerrarSuelto(i);
        tokens.push(encontrado);
        i += encontrado.text.length;
      } else {
        if (sueltoDesde < 0) sueltoDesde = i;
        i++;
      }
    }
  
    cerrarSuelto(n);
    return tokens;
  }
  
  /**
   * Reparte los tokens por línea física.
   *
   * Un token puede abarcar varias líneas (comentario de bloque, cadena triple de
   * Python, plantilla de JavaScript). Se parte conservando su tipo, porque el
   * renderizador pinta línea a línea y necesita que cada trozo siga sabiendo que
   * es una cadena.
   */
  function repartirPorLineas(tokens) {
    const lineas = [[]];
  
    tokens.forEach(function (tk) {
      const partes = String(tk.text).split('\n');
      partes.forEach(function (parte, idx) {
        if (idx > 0) lineas.push([]);
        if (parte) lineas[lineas.length - 1].push({ type: tk.type, text: parte });
      });
    });
  
    return lineas;
  }
  

  /* --- code/languages/comunes.js --- */
  /**
   * Piezas de gramática que repiten casi todos los lenguajes.
   *
   * Se factorizan aquí para que añadir un lenguaje nuevo sea declarar su lista de
   * palabras clave, no volver a escribir el reconocimiento de cadenas ni números.
   */
  
  /** Une palabras en una alternancia anclada con frontera de palabra. */
  function palabras(lista) {
    const orden = lista.slice().sort(function (a, b) { return b.length - a.length; });
    return new RegExp(String.raw`\b(?:` + orden.join('|') + String.raw`)\b`, 'y');
  }
  
  /** Cadenas de comillas simples y dobles que no cruzan línea. */
  const CADENA_SIMPLE = [
    { t: 'string', re: new RegExp('"(?:\\\\.|[^"\\\\\\n])*"', 'y') },
    { t: 'string', re: new RegExp("'(?:\\\\.|[^'\\\\\\n])*'", 'y') }
  ];
  
  /** Enteros, decimales, notación científica, hexadecimal y binario. */
  const NUMERO = {
    t: 'number',
    re: /\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?)\b/y
  };
  
  /** Identificador seguido de paréntesis: llamada o declaración de función. */
  const LLAMADA = { t: 'function', re: /\b[A-Za-z_$][\w$]*(?=\s*\()/y };
  
  /** Identificador en mayúscula inicial: por convención, un tipo o una clase. */
  const TIPO = { t: 'type', re: /\b[A-Z][A-Za-z0-9_]*\b/y };
  
  /** Operadores y signos de puntuación, en ese orden para no partir `=>` ni `==`. */
  const SIGNOS = [
    { t: 'operator', re: /(?:=>|===|!==|<=>|\?\?=|\*\*=|\/\/=|<<=|>>=|&&=|\|\|=|\?\?|\.\.\.|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|\|=|&=|\^=|->|::|\?\.|\*\*|\/\/)/y },
    { t: 'operator', re: /[=+\-*/%<>!&|^~?:]/y },
    { t: 'punct', re: /[{}()[\];,.@#]/y }
  ];
  
  /** Ensambla una gramática con el orden de precedencia correcto ya resuelto. */
  function gramatica(config) {
    return {
      name: config.name,
      label: config.label,
      family: config.family || 'curly',
      indentUnit: config.indentUnit || 4,
      rules: []
        .concat(config.comentarios || [])
        .concat(config.cadenas || CADENA_SIMPLE)
        .concat(config.previas || [])
        .concat(config.control ? [{ t: 'control', re: palabras(config.control) }] : [])
        .concat(config.claves ? [{ t: 'keyword', re: palabras(config.claves) }] : [])
        .concat(config.literales ? [{ t: 'literal', re: palabras(config.literales) }] : [])
        .concat(config.nativos ? [{ t: 'builtin', re: palabras(config.nativos) }] : [])
        .concat([NUMERO])
        .concat(config.sinLlamada ? [] : [LLAMADA])
        .concat(config.sinTipo ? [] : [TIPO])
        .concat(config.posteriores || [])
        .concat(SIGNOS)
    };
  }
  

  /* --- code/languages/llaves.js --- */
  /**
   * Lenguajes de llaves: JavaScript, TypeScript, JSX, Dart y Java.
   *
   * Comparten estructura de bloque `{ … }`, así que el detector de estructura los
   * trata igual; lo único que cambia es el vocabulario.
   */
  
  const COMENTARIOS_C = [
    { t: 'comment', re: /\/\*[\s\S]*?\*\//y },
    { t: 'comment', re: /\/\/[^\n]*/y }
  ];
  
  const CONTROL_C = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
    'continue', 'return', 'throw', 'try', 'catch', 'finally', 'yield', 'await'
  ];
  
  /* Plantilla de JavaScript. Se construye desde una cadena cruda porque la
     expresión mezcla acento grave, barra invertida y `${…}`: escrita como literal
     de expresión regular es ilegible y fácil de romper al editar. */
  const PLANTILLA_JS = {
    t: 'string',
    re: new RegExp(String.raw`\x60(?:\\.|\$\{[^}]*\}|[^\x60\\])*\x60`, 'y')
  };
  
  const javascript = gramatica({
    name: 'javascript',
    label: 'JavaScript',
    indentUnit: 2,
    comentarios: COMENTARIOS_C,
    cadenas: [PLANTILLA_JS].concat(CADENA_SIMPLE),
    control: CONTROL_C,
    claves: [
      'const', 'let', 'var', 'function', 'class', 'extends', 'new', 'delete',
      'typeof', 'instanceof', 'in', 'of', 'async', 'import', 'export', 'from',
      'as', 'static', 'get', 'set', 'this', 'super', 'void'
    ],
    literales: ['true', 'false', 'null', 'undefined', 'NaN'],
    nativos: [
      'console', 'document', 'window', 'Math', 'JSON', 'Object', 'Array',
      'Promise', 'Map', 'Set', 'Number', 'String', 'Boolean', 'Error'
    ]
  });
  
  const typescript = gramatica({
    name: 'typescript',
    label: 'TypeScript',
    indentUnit: 2,
    comentarios: COMENTARIOS_C,
    cadenas: [PLANTILLA_JS].concat(CADENA_SIMPLE),
    control: CONTROL_C,
    claves: [
      'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
      'implements', 'extends', 'new', 'typeof', 'keyof', 'instanceof', 'in',
      'of', 'async', 'import', 'export', 'from', 'as', 'static', 'readonly',
      'public', 'private', 'protected', 'abstract', 'declare', 'this', 'super'
    ],
    literales: ['true', 'false', 'null', 'undefined'],
    nativos: ['string', 'number', 'boolean', 'any', 'unknown', 'never', 'void', 'console', 'Promise']
  });
  
  const dart = gramatica({
    name: 'dart',
    label: 'Dart',
    indentUnit: 2,
    comentarios: COMENTARIOS_C,
    cadenas: [
      { t: 'string', re: /r?'''[\s\S]*?'''/y },
      { t: 'string', re: /r?"""[\s\S]*?"""/y }
    ].concat(CADENA_SIMPLE),
    previas: [{ t: 'decorator', re: /@[A-Za-z_]\w*/y }],
    control: CONTROL_C.concat(['rethrow']),
    claves: [
      'class', 'extends', 'implements', 'with', 'mixin', 'abstract', 'enum',
      'final', 'const', 'var', 'late', 'static', 'factory', 'new', 'this',
      'super', 'get', 'set', 'async', 'sync', 'import', 'export', 'library',
      'part', 'show', 'hide', 'required', 'covariant', 'operator', 'typedef', 'is', 'as'
    ],
    literales: ['true', 'false', 'null'],
    nativos: ['int', 'double', 'num', 'bool', 'String', 'List', 'Map', 'Set', 'Future', 'Stream', 'void', 'dynamic', 'print']
  });
  
  const java = gramatica({
    name: 'java',
    label: 'Java',
    indentUnit: 4,
    comentarios: COMENTARIOS_C,
    previas: [{ t: 'decorator', re: /@[A-Za-z_]\w*/y }],
    control: CONTROL_C,
    claves: [
      'class', 'interface', 'enum', 'record', 'extends', 'implements', 'package',
      'import', 'public', 'private', 'protected', 'static', 'final', 'abstract',
      'synchronized', 'transient', 'volatile', 'native', 'new', 'this', 'super',
      'instanceof', 'throws', 'var'
    ],
    literales: ['true', 'false', 'null'],
    nativos: ['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'void', 'String', 'List', 'Map', 'Optional', 'System']
  });
  
  const csharpLike = { javascript: javascript, typescript: typescript, dart: dart, java: java };
  

  /* --- code/languages/indentados.js --- */
  /**
   * Lenguajes cuya estructura la marca la indentación: Python y YAML.
   *
   * Para estos el detector de estructura no cuenta llaves: compara sangrías. Por
   * eso `family: 'indent'` no es una etiqueta cosmética, decide el algoritmo.
   */
  
  const CADENAS_PY = [
    { t: 'string', re: /[rbfuRBFU]{0,2}"""[\s\S]*?"""/y },
    { t: 'string', re: /[rbfuRBFU]{0,2}'''[\s\S]*?'''/y },
    { t: 'string', re: new RegExp('[rbfuRBFU]{0,2}"(?:\\\\.|[^"\\\\\\n])*"', 'y') },
    { t: 'string', re: new RegExp("[rbfuRBFU]{0,2}'(?:\\\\.|[^'\\\\\\n])*'", 'y') }
  ];
  
  const python = gramatica({
    name: 'python',
    label: 'Python',
    family: 'indent',
    indentUnit: 4,
    comentarios: [{ t: 'comment', re: /#[^\n]*/y }],
    cadenas: CADENAS_PY,
    previas: [{ t: 'decorator', re: /@[A-Za-z_][\w.]*/y }],
    control: [
      'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'return',
      'try', 'except', 'finally', 'raise', 'with', 'yield', 'await', 'match', 'case', 'pass'
    ],
    claves: [
      'def', 'class', 'lambda', 'async', 'import', 'from', 'as', 'global',
      'nonlocal', 'assert', 'del', 'in', 'is', 'not', 'and', 'or', 'self', 'cls'
    ],
    literales: ['True', 'False', 'None'],
    nativos: [
      'print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict',
      'set', 'tuple', 'super', 'isinstance', 'enumerate', 'zip', 'open',
      'sorted', 'sum', 'min', 'max', 'any', 'all', 'type'
    ]
  });
  
  const yaml = {
    name: 'yaml',
    label: 'YAML',
    family: 'indent',
    indentUnit: 2,
    rules: [
      { t: 'comment', re: /#[^\n]*/y },
      { t: 'property', re: /^[ \t]*-?[ \t]*[A-Za-z_][\w.-]*(?=\s*:)/my },
      CADENA_SIMPLE[0],
      CADENA_SIMPLE[1],
      { t: 'literal', re: /\b(?:true|false|null|yes|no|on|off)\b/iy },
      { t: 'number', re: /\b\d[\d_]*(?:\.\d+)?\b/y },
      { t: 'operator', re: /[-|>&*]/y },
      { t: 'punct', re: /[:{}[\],]/y }
    ]
  };
  

  /* --- code/languages/datos.js --- */
  /**
   * Formatos de datos y de consola: JSON, SQL, Bash, PowerShell, HTTP,
   * properties/env y texto plano.
   *
   * Ninguno de ellos declara funciones, así que casi todos se marcan
   * `family: 'flat'`: el detector de estructura no intenta encontrar bloques
   * donde no los hay, y así no dibuja rieles falsos.
   */
  
  const json = {
    name: 'json',
    label: 'JSON',
    family: 'flat',
    indentUnit: 2,
    rules: [
      { t: 'property', re: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
      { t: 'string', re: /"(?:\\.|[^"\\])*"/y },
      { t: 'literal', re: /\b(?:true|false|null)\b/y },
      { t: 'number', re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y },
      { t: 'punct', re: /[{}[\]:,]/y }
    ]
  };
  
  const sql = gramatica({
    name: 'sql',
    label: 'SQL',
    family: 'flat',
    indentUnit: 2,
    comentarios: [
      { t: 'comment', re: /--[^\n]*/y },
      { t: 'comment', re: /\/\*[\s\S]*?\*\//y }
    ],
    control: [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
      'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'WITH',
      'CASE', 'WHEN', 'THEN', 'END', 'ELSE', 'RETURNING'
    ],
    claves: [
      'CREATE', 'TABLE', 'ALTER', 'DROP', 'INSERT', 'INTO', 'VALUES', 'UPDATE',
      'SET', 'DELETE', 'INDEX', 'VIEW', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
      'CONSTRAINT', 'NOT', 'DEFAULT', 'AS', 'AND', 'OR', 'IN', 'IS', 'DISTINCT',
      'CASCADE', 'UNIQUE', 'EXISTS', 'BEGIN', 'COMMIT', 'ROLLBACK'
    ],
    literales: ['NULL', 'TRUE', 'FALSE'],
    nativos: [
      'INTEGER', 'SERIAL', 'BIGINT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'TIMESTAMP',
      'DATE', 'NUMERIC', 'UUID', 'JSONB', 'COUNT', 'SUM', 'AVG', 'NOW', 'COALESCE'
    ],
    sinTipo: true
  });
  
  const bash = {
    name: 'bash',
    label: 'Bash',
    family: 'flat',
    indentUnit: 2,
    rules: [
      { t: 'comment', re: /#[^\n]*/y },
      { t: 'string', re: /"(?:\\.|[^"\\])*"/y },
      { t: 'string', re: /'[^']*'/y },
      { t: 'control', re: palabras(['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'return', 'exit']) },
      { t: 'keyword', re: palabras(['function', 'export', 'source', 'local', 'set', 'cd', 'sudo']) },
      { t: 'builtin', re: palabras(['echo', 'cat', 'grep', 'curl', 'git', 'npm', 'npx', 'pip', 'python', 'docker', 'uvicorn', 'pytest', 'flutter', 'mvn', 'java', 'psql', 'alembic']) },
      { t: 'variable', re: /\$\{?[A-Za-z_]\w*\}?/y },
      { t: 'operator', re: /(?:&&|\|\||>>|[|><=])/y },
      { t: 'number', re: /\b\d+\b/y },
      { t: 'punct', re: /[-{}()[\];,]/y }
    ]
  };
  
  const powershell = {
    name: 'powershell',
    label: 'PowerShell',
    family: 'curly',
    indentUnit: 4,
    rules: [
      { t: 'comment', re: /<#[\s\S]*?#>/y },
      { t: 'comment', re: /#[^\n]*/y },
      { t: 'string', re: /"(?:`.|[^"`])*"/y },
      { t: 'string', re: /'[^']*'/y },
      { t: 'control', re: palabras(['if', 'else', 'elseif', 'foreach', 'for', 'while', 'switch', 'try', 'catch', 'finally', 'return', 'break', 'continue', 'throw']) },
      { t: 'keyword', re: palabras(['function', 'param', 'begin', 'process', 'end', 'class', 'filter']) },
      { t: 'builtin', re: /\b[A-Z][a-z]+-[A-Z][A-Za-z]+\b/y },
      { t: 'variable', re: /\$[A-Za-z_][\w:]*/y },
      { t: 'decorator', re: /(?<=\s)-[A-Za-z]\w*/y },
      { t: 'number', re: /\b\d+\b/y },
      { t: 'operator', re: /[|=+><]/y },
      { t: 'punct', re: /[{}()[\];,.]/y }
    ]
  };
  
  const http = {
    name: 'http',
    label: 'HTTP',
    family: 'flat',
    indentUnit: 2,
    rules: [
      { t: 'keyword', re: /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/my },
      { t: 'property', re: /^[A-Za-z][\w-]*(?=:)/my },
      { t: 'control', re: /\bHTTP\/[\d.]+\b/y },
      { t: 'string', re: /"(?:\\.|[^"\\])*"/y },
      { t: 'number', re: /\b\d+\b/y },
      { t: 'punct', re: /[:{}[\],/?&=]/y }
    ]
  };
  
  const properties = {
    name: 'properties',
    label: 'Properties',
    family: 'flat',
    indentUnit: 2,
    rules: [
      { t: 'comment', re: /[#;][^\n]*/y },
      { t: 'property', re: /^[ \t]*[A-Za-z_][\w.-]*(?=\s*=)/my },
      { t: 'variable', re: /\$\{[^}]*\}/y },
      { t: 'operator', re: /=/y },
      { t: 'literal', re: /\b(?:true|false)\b/y },
      { t: 'number', re: /\b\d+\b/y }
    ]
  };
  
  const texto = {
    name: 'text',
    label: 'Texto',
    family: 'flat',
    indentUnit: 2,
    rules: []
  };
  
  

  /* --- code/languages/marcado.js --- */
  /**
   * Lenguajes de marcado y estilo: HTML, XML y CSS.
   *
   * En HTML la unidad legible no es la función sino la etiqueta, así que se
   * resaltan por separado el nombre de etiqueta, el atributo y su valor: el
   * aprendiz necesita distinguir de un vistazo qué es estructura y qué es dato.
   */
  
  const html = {
    name: 'html',
    label: 'HTML',
    family: 'markup',
    indentUnit: 2,
    rules: [
      { t: 'comment', re: /<!--[\s\S]*?-->/y },
      { t: 'meta', re: /<!DOCTYPE[^>]*>/iy },
      { t: 'tag', re: /<\/?[A-Za-z][\w-]*/y },
      { t: 'string', re: /"(?:[^"]*)"/y },
      { t: 'string', re: /'(?:[^']*)'/y },
      { t: 'property', re: /\b[A-Za-z_:][\w:.-]*(?=\s*=)/y },
      { t: 'punct', re: /\/?>/y },
      { t: 'operator', re: /=/y }
    ]
  };
  
  const xml = {
    name: 'xml',
    label: 'XML',
    family: 'markup',
    indentUnit: 2,
    rules: html.rules
  };
  
  const css = {
    name: 'css',
    label: 'CSS',
    family: 'curly',
    indentUnit: 2,
    rules: [
      { t: 'comment', re: /\/\*[\s\S]*?\*\//y },
      { t: 'decorator', re: /@[A-Za-z-]+/y },
      { t: 'string', re: /"(?:[^"]*)"/y },
      { t: 'string', re: /'(?:[^']*)'/y },
      { t: 'variable', re: /--[A-Za-z][\w-]*/y },
      { t: 'property', re: /\b[a-z-]+(?=\s*:)/y },
      { t: 'builtin', re: /\b[a-z-]+(?=\()/y },
      { t: 'number', re: /-?\b\d*\.?\d+(?:px|rem|em|%|vh|vw|ch|s|ms|deg|fr)?\b/y },
      { t: 'type', re: /#[0-9a-fA-F]{3,8}\b/y },
      { t: 'tag', re: /(?:\.|#)[A-Za-z][\w-]*/y },
      { t: 'punct', re: /[{}();:,]/y },
      { t: 'operator', re: /[>~+*]/y }
    ]
  };
  
  const mermaid = {
    name: 'mermaid',
    label: 'Mermaid',
    family: 'flat',
    indentUnit: 2,
    rules: [
      { t: 'comment', re: /%%[^\n]*/y },
      { t: 'keyword', re: /\b(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|subgraph|end|participant|actor|note|style|classDef)\b/y },
      { t: 'string', re: /"(?:[^"]*)"/y },
      { t: 'operator', re: /(?:-->|---|-\.->|==>|->>|-->>|[|>])/y },
      { t: 'punct', re: /[[\]{}()]/y }
    ]
  };
  

  /* --- code/languages/index.js --- */
  /**
   * Registro de gramáticas y resolución de alias.
   *
   * Las guías escriben el lenguaje a mano (`py`, `python`, `Python 3`), así que
   * la resolución normaliza antes de buscar. Cuando no hay coincidencia se
   * devuelve la gramática de texto plano: un lenguaje desconocido debe verse sin
   * color, nunca romper el bloque.
   */
  
  
  
  
  const REGISTRO = {
    javascript: javascript,
    typescript: typescript,
    dart: dart,
    java: java,
    python: python,
    yaml: yaml,
    json: json,
    sql: sql,
    bash: bash,
    powershell: powershell,
    http: http,
    properties: properties,
    html: html,
    xml: xml,
    css: css,
    mermaid: mermaid,
    text: texto
  };
  
  const ALIAS = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    node: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    python3: 'python',
    flutter: 'dart',
    kotlin: 'java',
    kt: 'java',
    yml: 'yaml',
    postgres: 'sql',
    postgresql: 'sql',
    psql: 'sql',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    console: 'bash',
    terminal: 'bash',
    cmd: 'powershell',
    ps1: 'powershell',
    pwsh: 'powershell',
    env: 'properties',
    dotenv: 'properties',
    ini: 'properties',
    conf: 'properties',
    htm: 'html',
    jinja: 'html',
    jsp: 'html',
    vue: 'html',
    svg: 'xml',
    pom: 'xml',
    scss: 'css',
    rest: 'http',
    curl: 'bash',
    dockerfile: 'bash',
    plaintext: 'text',
    txt: 'text',
    output: 'text',
    salida: 'text'
  };
  
  /** Normaliza `Python 3`, `PY`, `.py` → `python`. */
  function normalizarLenguaje(valor) {
    const bruto = String(valor || '').trim().toLowerCase();
    if (!bruto) return 'text';
    const limpio = bruto.replace(/^[.#]/, '').replace(/[\s\d.]+$/, '').replace(/[^a-z0-9+-]/g, '');
    if (REGISTRO[limpio]) return limpio;
    if (ALIAS[limpio]) return ALIAS[limpio];
    return 'text';
  }
  
  /**
   * Deduce el lenguaje a partir de la ruta del archivo del encabezado.
   *
   * Varias guías declaran la ruta («app/main.py») pero no el lenguaje, porque
   * cuando se escribieron el bloque no coloreaba nada y el campo daba igual.
   * Rellenar el hueco aquí evita tener que editar cientos de bloques de datos
   * solo para recuperar un dato que ya estaba escrito en la ruta.
   */
  function lenguajeDesdeRuta(ruta) {
    const m = /\.([A-Za-z0-9]+)\s*$/.exec(String(ruta || '').split(/[\s·—-]/)[0] || '');
    if (!m) return '';
    const sufijo = m[1].toLowerCase();
    if (sufijo === 'md' || sufijo === 'markdown') return 'text';
    const resuelto = normalizarLenguaje(sufijo);
    return resuelto === 'text' ? '' : resuelto;
  }
  
  /** Devuelve la gramática de un lenguaje; nunca devuelve nulo. */
  function obtenerGramatica(valor) {
    return REGISTRO[normalizarLenguaje(valor)] || texto;
  }
  
  /** Etiqueta legible para la cabecera de la tarjeta. */
  function etiquetaLenguaje(valor) {
    return obtenerGramatica(valor).label;
  }
  
  /** Lenguajes con gramática propia, para pruebas y para el validador. */
  function lenguajesSoportados() {
    return Object.keys(REGISTRO);
  }
  

  /* --- code/structure.js --- */
  /**
   * Detección de ámbitos: dónde empieza y dónde termina cada función o clase.
   *
   * Es la pieza que resuelve el problema pedagógico real. Un aprendiz que ve
   * treinta líneas de colores sigue sin saber qué pertenece a `list_equipment` y
   * qué ya es la función siguiente. Aquí se calculan esos límites para que el
   * renderizador pueda dibujarlos.
   *
   * Dos estrategias según la familia del lenguaje:
   *   indent → se comparan sangrías (Python, YAML)
   *   curly  → se cuentan llaves sobre el flujo de tokens, no sobre el texto, así
   *            una llave dentro de una cadena o de un comentario no descuadra el
   *            conteo.
   */
  
  const ENCABEZADOS_INDENT = [
    { re: /^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)/, tipo: 'funcion' },
    { re: /^(\s*)class\s+([A-Za-z_]\w*)/, tipo: 'clase' }
  ];
  
  const ENCABEZADOS_LLAVES = [
    { re: /\b(?:class|interface|enum|mixin|record|abstract\s+class)\s+([A-Za-z_]\w*)/, tipo: 'clase' },
    { re: /\bfunction\s+\*?\s*([A-Za-z_$][\w$]*)/i, tipo: 'funcion' },
    { re: /\b(?:const|let|var|final)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/, tipo: 'funcion' },
    { re: /^\s*(?:@\w+\s+)*(?:public|private|protected|static|final|async|override|external)?[\w<>,[\]?.\s]*?\b([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*(?:async\s*)?(?:\{|=>)/, tipo: 'metodo' }
  ];
  
  /** Cuenta los espacios iniciales tratando el tabulador como una unidad. */
  function sangria(linea, unidad) {
    const m = /^[ \t]*/.exec(linea)[0];
    let ancho = 0;
    for (let i = 0; i < m.length; i++) ancho += m[i] === '\t' ? unidad : 1;
    return ancho;
  }
  
  /** Ámbitos por sangría: el cuerpo es todo lo que queda más adentro. */
  function ambitosPorSangria(lineas, unidad) {
    const ambitos = [];
  
    lineas.forEach(function (linea, idx) {
      for (let e = 0; e < ENCABEZADOS_INDENT.length; e++) {
        const m = ENCABEZADOS_INDENT[e].re.exec(linea);
        if (!m) continue;
  
        const base = sangria(linea, unidad);
        let fin = idx;
        for (let j = idx + 1; j < lineas.length; j++) {
          if (!lineas[j].trim()) continue;
          if (sangria(lineas[j], unidad) <= base) break;
          fin = j;
        }
  
        // Los decoradores pegados encima pertenecen a la definición.
        let inicio = idx;
        while (inicio > 0 && /^\s*@[\w.]/.test(lineas[inicio - 1])) inicio--;
  
        if (fin > idx) {
          ambitos.push({ inicio: inicio, cabecera: idx, fin: fin, tipo: ENCABEZADOS_INDENT[e].tipo, nombre: m[2] });
        }
        break;
      }
    });
  
    return ambitos;
  }
  
  /** Profundidad de llaves al inicio y al final de cada línea, según los tokens. */
  function profundidades(lineasTokens) {
    const marcas = [];
    let nivel = 0;
  
    lineasTokens.forEach(function (tokens) {
      const antes = nivel;
      tokens.forEach(function (tk) {
        if (tk.type === 'string' || tk.type === 'comment') return;
        for (let i = 0; i < tk.text.length; i++) {
          if (tk.text[i] === '{') nivel++;
          else if (tk.text[i] === '}') nivel = Math.max(0, nivel - 1);
        }
      });
      marcas.push({ antes: antes, despues: nivel });
    });
  
    return marcas;
  }
  
  /** Ámbitos por llaves: el cuerpo termina donde la profundidad vuelve a su valor. */
  function ambitosPorLlaves(lineas, lineasTokens) {
    const marcas = profundidades(lineasTokens);
    const ambitos = [];
  
    lineas.forEach(function (linea, idx) {
      const marca = marcas[idx];
      if (!marca || marca.despues <= marca.antes) return;
      if (/^\s*(?:if|for|while|switch|catch|else|try|do)\b/.test(linea)) return;
  
      for (let e = 0; e < ENCABEZADOS_LLAVES.length; e++) {
        const m = ENCABEZADOS_LLAVES[e].re.exec(linea);
        if (!m || !m[1]) continue;
  
        let fin = idx;
        for (let j = idx + 1; j < lineas.length; j++) {
          fin = j;
          if (marcas[j].despues <= marca.antes) break;
        }
  
        let inicio = idx;
        while (inicio > 0 && /^\s*@[\w.]/.test(lineas[inicio - 1])) inicio--;
  
        if (fin > idx) {
          ambitos.push({ inicio: inicio, cabecera: idx, fin: fin, tipo: ENCABEZADOS_LLAVES[e].tipo, nombre: m[1] });
        }
        break;
      }
    });
  
    return ambitos;
  }
  
  /**
   * Devuelve los ámbitos ordenados y con su nivel de anidamiento calculado, para
   * que el renderizador sepa cuántos rieles dibujar sin volver a recorrer nada.
   */
  function detectarAmbitos(lineas, lineasTokens, gramatica) {
    const familia = (gramatica && gramatica.family) || 'flat';
    let ambitos = [];
  
    if (familia === 'indent') ambitos = ambitosPorSangria(lineas, gramatica.indentUnit || 4);
    else if (familia === 'curly') ambitos = ambitosPorLlaves(lineas, lineasTokens);
  
    ambitos.sort(function (a, b) { return a.inicio - b.inicio || b.fin - a.fin; });
  
    ambitos.forEach(function (amb, i) {
      let nivel = 0;
      for (let j = 0; j < i; j++) {
        if (ambitos[j].inicio <= amb.inicio && ambitos[j].fin >= amb.fin) nivel++;
      }
      amb.nivel = nivel;
    });
  
    return ambitos;
  }
  
  

  /* --- code/theme-probe.js --- */
  /**
   * Elección automática de la paleta clara u oscura de un bloque.
   *
   * Las guías del ecosistema no comparten interruptor de tema: unas usan
   * `data-theme="dark"`, otras `claro`, otras `sena` u `ocean`, y algunas no
   * tienen ninguno. Encadenar selectores para todas garantizaba que la siguiente
   * guía volviera a quedarse fuera.
   *
   * Aquí se mide el fondo que el bloque realmente recibió y se decide por
   * luminancia. Funciona con cualquier nombre de tema, presente o futuro, y se
   * vuelve a medir cuando el tema cambia.
   */
  
  const OBSERVADOS = new Set();
  let observadorTema = null;
  
  /** Luminancia relativa aproximada de un `rgb()/rgba()` calculado. */
  function luminancia(color) {
    const m = /rgba?\(([^)]+)\)/.exec(String(color || ''));
    if (!m) return null;
    const partes = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (partes.length < 3) return null;
    const alfa = partes.length > 3 ? partes[3] : 1;
    if (alfa < 0.2) return null;   // transparente: no dice nada del fondo real
    return (0.2126 * partes[0] + 0.7152 * partes[1] + 0.0722 * partes[2]) / 255;
  }
  
  /** Sube por los ancestros hasta encontrar un fondo opaco del que fiarse. */
  function fondoEfectivo(nodo) {
    let actual = nodo;
    while (actual && actual !== document.documentElement) {
      const lum = luminancia(getComputedStyle(actual).backgroundColor);
      if (lum !== null) return lum;
      actual = actual.parentElement;
    }
    const raiz = luminancia(getComputedStyle(document.documentElement).backgroundColor);
    return raiz === null ? 0 : raiz;
  }
  
  /**
   * ¿El fondo que recibe este nodo es claro?
   *
   * Se expone porque el módulo de evidencias necesita la misma decisión: sus
   * tarjetas se insertan en guías claras y oscuras, y una tarjeta blanca sobre
   * una guía oscura se lee como un error de la página. Medir dos veces la misma
   * cosa con dos copias del cálculo terminaría en dos respuestas distintas.
   *
   * @param {HTMLElement} nodo
   * @returns {boolean}
   */
  function fondoEsClaro(nodo) {
    return fondoEfectivo(nodo) > 0.5;
  }
  
  /** Aplica o retira la clase de paleta clara según el fondo heredado. */
  function ajustarPaleta(figura) {
    if (!figura || !figura.isConnected) return;
    figura.classList.remove('dbc--claro');
    figura.classList.toggle('dbc--claro', fondoEsClaro(figura.parentElement || figura));
  }
  
  function reajustarTodo() {
    OBSERVADOS.forEach(function (figura) {
      if (figura.isConnected) ajustarPaleta(figura);
      else OBSERVADOS.delete(figura);
    });
  }
  
  /**
   * Registra un bloque para que siga al tema de la página.
   *
   * La medición se aplaza con `setTimeout`, no con `requestAnimationFrame`: el
   * bloque se construye antes de que quien lo pidió lo inserte, y estas guías son
   * aplicaciones de una sola página que mantienen ocultos los módulos que no se
   * están viendo. Un cuadro de animación no llega nunca en una pestaña oculta ni
   * en un contenedor sin pintar, y el bloque se quedaba con la paleta que no era.
   */
  function seguirTema(figura) {
    OBSERVADOS.add(figura);
    setTimeout(function () { ajustarPaleta(figura); }, 0);
  
    // Y otra vez cuando el bloque se hace visible: al cambiar de módulo, la guía
    // puede colocarlo bajo un contenedor con otro fondo del que tenía al nacer.
    if (typeof IntersectionObserver === 'function') {
      const visible = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) ajustarPaleta(figura);
        });
      });
      visible.observe(figura);
    }
  
    if (!observadorTema && typeof MutationObserver === 'function') {
      observadorTema = new MutationObserver(reajustarTodo);
      observadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-tema', 'style'] });
      if (document.body) {
        observadorTema.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-tema'] });
      }
      if (window.matchMedia) {
        const consulta = window.matchMedia('(prefers-color-scheme: dark)');
        if (consulta.addEventListener) consulta.addEventListener('change', reajustarTodo);
      }
    }
  }
  

  /* --- code/render-line.js --- */
  /**
   * Construcción de una línea de código.
   *
   * Cada línea es un `<li>` con tres zonas fijas: número, rieles de ámbito y
   * texto. Las tres son columnas reales, no adornos: el número permite que el
   * instructor diga «mira la línea 14», los rieles muestran a qué función
   * pertenece la línea, y la sangría se dibuja aparte para que se vea el nivel de
   * anidamiento incluso cuando la línea está vacía de contenido visible.
   */
  
  /** Separa la sangría inicial del resto de tokens sin alterar el texto. */
  function partirSangria(tokens) {
    const copia = tokens.slice();
    let sangria = '';
  
    while (copia.length) {
      const tk = copia[0];
      const m = /^[ \t]+/.exec(tk.text);
      if (!m) break;
      sangria += m[0];
      if (m[0].length === tk.text.length) copia.shift();
      else { copia[0] = { type: tk.type, text: tk.text.slice(m[0].length) }; break; }
    }
  
    return { sangria: sangria, resto: copia };
  }
  
  function span(clase, texto) {
    const el = document.createElement('span');
    el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }
  
  /**
   * Rieles verticales, uno por ámbito abierto en esta línea.
   * `ini` dibuja la esquina de apertura, `fin` la de cierre y `med` el tramo
   * intermedio: el aprendiz ve el bloque completo sin contar sangrías a mano.
   */
  function rieles(indice, ambitos) {
    const frag = document.createDocumentFragment();
  
    ambitos.forEach(function (amb) {
      if (indice < amb.inicio || indice > amb.fin) return;
      let pos = 'med';
      if (indice <= amb.cabecera) pos = 'ini';
      else if (indice === amb.fin) pos = 'fin';
  
      const riel = span('dbc__riel');
      riel.dataset.pos = pos;
      riel.dataset.tipo = amb.tipo;
      riel.setAttribute('aria-hidden', 'true');
      frag.appendChild(riel);
    });
  
    return frag;
  }
  
  /**
   * Devuelve el `<li>` de una línea.
   *
   * `opciones.resaltadas` recibe el conjunto de números de línea que la guía
   * quiere destacar; se marcan con fondo y con una marca en el margen, nunca solo
   * con color, para no depender de la percepción cromática.
   */
  function construirLinea(numero, tokens, contexto) {
    const li = document.createElement('li');
    li.className = 'dbc__linea';
    li.dataset.n = String(numero);
  
    const partes = partirSangria(tokens);
    const unidad = contexto.indentUnit || 2;
  
    // El número lo pinta CSS con `content: attr(data-n)`, no un `<span>`.
    // Como nodo real acabaría dentro de cualquier `textContent` que alguien
    // leyera del bloque —empezando por los botones de copiar que ya existen en
    // varias guías—, y el aprendiz pegaría el código con los números incrustados.
    const canal = span('dbc__canal');
    canal.appendChild(rieles(numero - 1, contexto.ambitos));
    li.appendChild(canal);
  
    const cuerpo = span('dbc__txt');
  
    if (partes.sangria) {
      const ind = span('dbc__ind', partes.sangria);
      ind.style.setProperty('--dbc-unidad', String(unidad));
      cuerpo.appendChild(ind);
    }
  
    partes.resto.forEach(function (tk) {
      if (tk.type === 'plain') cuerpo.appendChild(document.createTextNode(tk.text));
      else cuerpo.appendChild(span('tk tk--' + tk.type, tk.text));
    });
  
    if (!partes.sangria && !partes.resto.length) cuerpo.appendChild(document.createTextNode('​'));
  
    li.appendChild(cuerpo);
  
    if (contexto.resaltadas && contexto.resaltadas.has(numero)) {
      li.classList.add('dbc__linea--foco');
    }
  
    const abre = contexto.ambitos.find(function (a) { return a.cabecera === numero - 1; });
    if (abre) {
      li.classList.add('dbc__linea--abre');
      li.dataset.ambito = abre.nombre;
    }
    const cierra = contexto.ambitos.find(function (a) { return a.fin === numero - 1; });
    if (cierra) li.classList.add('dbc__linea--cierra');
  
    return li;
  }
  

  /* --- code/render-block.js --- */
  /**
   * Tarjeta completa de un bloque de código.
   *
   * Orden fijo de arriba abajo: cabecera (lenguaje, archivo, tamaño, acciones),
   * cuerpo desplazable y, cuando el listado tiene varias funciones, un índice de
   * ámbitos. Ese índice es lo que convierte un listado largo en algo navegable:
   * dice qué funciones hay y en qué líneas viven, antes de leerlas.
   */
  
  
  
  
  
  /* Código fuente de cada bloque, para quien necesite recuperarlo íntegro.
     No se guarda en un atributo: un listado de 80 líneas dentro de `data-*`
     ensucia el DOM y se escapa mal. El mapa débil desaparece con el nodo. */
  const FUENTES = new WeakMap();
  
  function el(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }
  
  /** Acepta texto, arreglo de líneas o nulo; siempre devuelve texto sin saltos finales. */
  function normalizarTexto(entrada) {
    const bruto = Array.isArray(entrada) ? entrada.join('\n') : String(entrada == null ? '' : entrada);
    return bruto.replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  }
  
  /** Ancho del canal de rieles: tantos caracteres como ámbitos lleguen a solaparse. */
  function anchoCanal(totalLineas, ambitos) {
    let maximo = 0;
    for (let i = 0; i < totalLineas; i++) {
      let activos = 0;
      for (let a = 0; a < ambitos.length; a++) {
        if (i >= ambitos[a].inicio && i <= ambitos[a].fin) activos++;
      }
      if (activos > maximo) maximo = activos;
    }
    return maximo;
  }
  
  function botonCopiar(codigo) {
    const boton = el('button', 'dbc__btn dbc__btn--copiar');
    boton.type = 'button';
    const etiqueta = el('span', 'dbc__btn-txt', 'Copiar');
    boton.appendChild(el('span', 'dbc__btn-icono', '⧉'));
    boton.appendChild(etiqueta);
    boton.setAttribute('aria-label', 'Copiar el código de este bloque');
  
    boton.addEventListener('click', function () {
      const fin = function (ok) {
        boton.classList.toggle('is-ok', ok);
        boton.classList.toggle('is-fail', !ok);
        etiqueta.textContent = ok ? 'Copiado' : 'No se pudo';
        setTimeout(function () {
          boton.classList.remove('is-ok', 'is-fail');
          etiqueta.textContent = 'Copiar';
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codigo).then(function () { fin(true); }, function () { fin(false); });
      } else {
        fin(false);
      }
    });
  
    return boton;
  }
  
  /** Alterna entre desplazamiento horizontal y ajuste de línea, sin recargar nada. */
  function botonAjustar(figura) {
    const boton = el('button', 'dbc__btn dbc__btn--ajustar');
    boton.type = 'button';
    boton.setAttribute('aria-pressed', 'false');
    boton.appendChild(el('span', 'dbc__btn-icono', '↵'));
    boton.appendChild(el('span', 'dbc__btn-txt', 'Ajustar'));
    boton.title = 'Ajustar las líneas largas al ancho de la pantalla';
  
    boton.addEventListener('click', function () {
      const activo = figura.classList.toggle('dbc--ajustado');
      boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
  
    return boton;
  }
  
  /** Chips con el nombre y el rango de líneas de cada función o clase detectada. */
  function indiceAmbitos(ambitos, alSaltar) {
    const nav = el('nav', 'dbc__indice');
    nav.setAttribute('aria-label', 'Funciones y clases de este bloque');
    nav.appendChild(el('span', 'dbc__indice-rotulo', 'En este bloque:'));
  
    ambitos.forEach(function (amb) {
      const chip = el('button', 'dbc__chip');
      chip.type = 'button';
      chip.dataset.tipo = amb.tipo;
      chip.appendChild(el('span', 'dbc__chip-nombre', amb.nombre));
      chip.appendChild(el('span', 'dbc__chip-rango', 'líneas ' + (amb.cabecera + 1) + '–' + (amb.fin + 1)));
      chip.addEventListener('click', function () { alSaltar(amb); });
      nav.appendChild(chip);
    });
  
    return nav;
  }
  
  /**
   * Construye la tarjeta.
   *
   * @param {object} bloque  { texto|codigo, titulo|archivo, lenguaje|lang, resaltar }
   * @returns {HTMLElement}  la figura lista para insertar en el DOM
   */
  function construirBloqueCodigo(bloque) {
    const datos = bloque || {};
    const codigo = normalizarTexto(datos.texto != null ? datos.texto : datos.codigo != null ? datos.codigo : datos.code);
    const ruta = datos.titulo || datos.archivo || datos.file || datos.path || '';
    const declarado = normalizarLenguaje(datos.lenguaje || datos.lang || datos.language);
    const lenguaje = declarado !== 'text' ? declarado : (lenguajeDesdeRuta(ruta) || 'text');
    const gramatica = obtenerGramatica(lenguaje);
  
    const lineas = codigo.split('\n');
    const lineasTokens = repartirPorLineas(tokenize(codigo, gramatica));
    while (lineasTokens.length < lineas.length) lineasTokens.push([]);
    const ambitos = detectarAmbitos(lineas, lineasTokens, gramatica);
  
    const figura = el('figure', 'dbc');
    figura.dataset.lang = lenguaje;
  
    // Las dos columnas fijas se miden aquí, no en CSS: su ancho depende de los
    // datos (cuántos dígitos tiene el número mayor, cuántos ámbitos se solapan).
    // Si variaran por línea, el código no arrancaría en la misma columna.
    figura.style.setProperty('--dbc-num-w', String(lineas.length).length + 'ch');
    figura.style.setProperty('--dbc-canal-w', anchoCanal(lineas.length, ambitos) + 'ch');
  
    const cabeza = el('figcaption', 'dbc__cabeza');
    cabeza.appendChild(el('span', 'dbc__lenguaje', etiquetaLenguaje(lenguaje)));
    if (ruta) {
      const p = el('code', 'dbc__ruta', ruta);
      cabeza.appendChild(p);
    }
    cabeza.appendChild(el('span', 'dbc__tam', lineas.length + (lineas.length === 1 ? ' línea' : ' líneas')));
    const acciones = el('span', 'dbc__acciones');
    acciones.appendChild(botonAjustar(figura));
    acciones.appendChild(botonCopiar(codigo));
    cabeza.appendChild(acciones);
    figura.appendChild(cabeza);
  
    const resaltadas = new Set(Array.isArray(datos.resaltar) ? datos.resaltar.map(Number) : []);
    const contexto = { ambitos: ambitos, indentUnit: gramatica.indentUnit || 2, resaltadas: resaltadas };
  
    const scroll = el('div', 'dbc__scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', ruta ? 'Código de ' + ruta : 'Bloque de código en ' + etiquetaLenguaje(lenguaje));
  
    const lista = el('ol', 'dbc__codigo');
    lineas.forEach(function (_, i) {
      lista.appendChild(construirLinea(i + 1, lineasTokens[i] || [], contexto));
    });
    scroll.appendChild(lista);
    figura.appendChild(scroll);
  
    if (ambitos.length >= 2) {
      figura.appendChild(indiceAmbitos(ambitos, function (amb) {
        const destino = lista.children[amb.cabecera];
        if (!destino) return;
        destino.scrollIntoView({ block: 'center', behavior: 'smooth' });
        destino.classList.add('dbc__linea--senalada');
        setTimeout(function () { destino.classList.remove('dbc__linea--senalada'); }, 1600);
      }));
    }
  
    FUENTES.set(figura, codigo);
    seguirTema(figura);
    return figura;
  }
  
  /** Código fuente exacto de un bloque ya construido, sin números ni adornos. */
  function codigoDe(figura) {
    return FUENTES.get(figura) || '';
  }
  
  /**
   * Sustituye un bloque por otro conservando su posición y su identificador.
   *
   * Existe por los simuladores: varias guías repintan un listado cada vez que el
   * aprendiz mueve un control, y lo hacían asignando `textContent` a un `<code>`
   * que guardaban en una variable. Ese nodo ya no existe cuando el bloque pasa a
   * ser una tarjeta, así que aquí se devuelve el nodo nuevo para que el llamador
   * lo reasigne.
   *
   * @param {Node} referencia  el bloque actual, o el `<pre>`/`<code>` original
   * @param {object} bloque    los mismos datos que acepta `construirBloqueCodigo`
   * @returns {HTMLElement|null} la figura nueva, ya insertada
   */
  function actualizarBloqueCodigo(referencia, bloque) {
    if (!referencia) return null;
  
    const anterior = (referencia.closest && referencia.closest('.dbc')) ||
      (referencia.closest && referencia.closest('pre')) || referencia;
    if (!anterior.parentNode) return null;
  
    const figura = construirBloqueCodigo(bloque);
  
    // El identificador puede estar en el `<pre>`, en el `<code>` de dentro o ya en
    // la tarjeta anterior. Las guías buscan su listado por ese id en cada
    // repintado, así que se recupera de donde esté y viaja con el bloque nuevo.
    const id = anterior.id || referencia.id ||
      (anterior.querySelector && anterior.querySelector('[id]') ? anterior.querySelector('[id]').id : '');
    if (id) figura.id = id;
  
    anterior.parentNode.replaceChild(figura, anterior);
    return figura;
  }
  
  /** API auxiliar: devuelve solo el análisis, útil para pruebas y validadores. */
  function analizarCodigo(texto, lenguaje) {
    const codigo = normalizarTexto(texto);
    const gramatica = obtenerGramatica(lenguaje);
    const lineas = codigo.split('\n');
    const lineasTokens = repartirPorLineas(tokenize(codigo, gramatica));
    return { lineas: lineas, tokens: lineasTokens, ambitos: detectarAmbitos(lineas, lineasTokens, gramatica) };
  }
  

  /* --- code/index.js --- */
  /**
   * API pública del módulo de código del SDK.
   *
   * Dos formas de usarlo:
   *
   *   1. Declarativa — la guía construye el bloque desde sus datos:
   *        DevBrainSDK.code.bloque({ texto, titulo, lenguaje })
   *
   *   2. Adopción — la guía ya tiene `<pre><code>` en su HTML y se sustituyen en
   *      sitio: DevBrainSDK.code.mejorarDocumento(document)
   *
   * La segunda existe porque varias guías nacieron con HTML plano o con Prism por
   * CDN. Reescribir su contenido a mano habría multiplicado el riesgo de erratas;
   * adoptarlo en tiempo de carga deja una sola presentación sin tocar el texto.
   */
  
  
  
  
  /** Lee el lenguaje de las convenciones habituales de un `<pre>` o `<code>`. */
  function lenguajeDeNodo(pre, code) {
    const clases = ((code && code.className) || '') + ' ' + (pre.className || '');
    const m = /(?:language|lang)-([\w+#.]+)/i.exec(clases);
    if (m) return m[1];
    return pre.dataset.lang || pre.dataset.lenguaje || (code && code.dataset ? code.dataset.lang : '') || 'text';
  }
  
  /** Busca la ruta del archivo en la cabecera que ya tuviera la tarjeta anterior. */
  function rutaDeNodo(pre) {
    const contenedor = pre.closest('.code-card, .code-block-wrapper, .code-window, figure, div');
    if (!contenedor) return '';
    const marca = contenedor.querySelector('.code-card__path, .code-file-path, .code-file, [data-ruta]');
    return marca ? marca.textContent.trim() : '';
  }
  
  /**
   * Sustituye cada `<pre>` del ámbito indicado por una tarjeta del SDK.
   * Los bloques ya convertidos se ignoran, así que llamarla varias veces es seguro.
   *
   * No todo `<pre>` es un listado: varias guías usan uno como consola de un
   * simulador y le escriben la salida en cada paso. Convertir esos rompería el
   * simulador, así que se respeta `data-dbc="omitir"` como exclusión explícita.
   */
  function mejorarDocumento(raiz) {
    const ambito = raiz || document;
    const pendientes = ambito.querySelectorAll('pre:not([data-dbc-listo]):not([data-dbc="omitir"])');
    let convertidos = 0;
  
    pendientes.forEach(function (pre) {
      if (pre.closest('.dbc') || pre.closest('[data-dbc="omitir"]')) return;
      const code = pre.querySelector('code');
      const texto = (code || pre).textContent;
      if (!texto || !texto.trim()) return;
  
      const figura = construirBloqueCodigo({
        texto: texto,
        lenguaje: lenguajeDeNodo(pre, code),
        titulo: rutaDeNodo(pre)
      });
      figura.dataset.dbcListo = 'adoptado';
  
      const anterior = pre.closest('.code-card, .code-block-wrapper, .code-window');
      const destino = anterior && anterior.querySelectorAll('pre').length === 1 ? anterior : pre;
      if (destino.parentNode) {
        // El identificador viaja con el bloque. Varias guías buscan su listado
        // por `getElementById` para copiarlo o repintarlo; si el id se quedara en
        // el nodo que acabamos de retirar, esos botones dejarían de encontrar nada.
        const id = destino.id || (code && code.id) || pre.id;
        if (id) figura.id = id;
        destino.parentNode.replaceChild(figura, destino);
        convertidos++;
      }
    });
  
    return convertidos;
  }
  
  /** Conecta la adopción automática al ciclo de vida de la página. */
  function activarAdopcionAutomatica(opciones) {
    const config = opciones || {};
    const raiz = config.raiz || document;
  
    const pasar = function () { mejorarDocumento(raiz); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasar);
    else pasar();
  
    if (config.observar !== false && typeof MutationObserver === 'function') {
      const observador = new MutationObserver(function (cambios) {
        const hayNuevos = cambios.some(function (c) { return c.addedNodes && c.addedNodes.length; });
        if (hayNuevos) pasar();
      });
      observador.observe(raiz === document ? document.body : raiz, { childList: true, subtree: true });
      return observador;
    }
  
    return null;
  }
  
  const code = {
    bloque: construirBloqueCodigo,
    actualizar: actualizarBloqueCodigo,
    codigoDe: codigoDe,
    analizar: analizarCodigo,
    mejorarDocumento: mejorarDocumento,
    activarAdopcionAutomatica: activarAdopcionAutomatica,
    normalizarLenguaje: normalizarLenguaje,
    etiquetaLenguaje: etiquetaLenguaje,
    obtenerGramatica: obtenerGramatica,
    lenguajesSoportados: lenguajesSoportados,
    tokenize: tokenize,
    repartirPorLineas: repartirPorLineas,
    detectarAmbitos: detectarAmbitos
  };
  
  

  /* --- evidence/registry.js --- */
  /**
   * Normalización del registro de entregables (`deliverables.registry.json`).
   *
   * El registro nació en la versión 1 como una lista plana de artefactos que la
   * guía mostraba de una sola vez, casi siempre al final. Esa forma producía el
   * problema que este módulo existe para corregir: el aprendiz recorría toda la
   * teoría y encontraba la factura completa en la última pantalla.
   *
   * La versión 2 ancla cada artefacto a la sección donde se produce
   * (`station.sectionId`) y añade el bloque `submission`, que explica qué se
   * carga y con qué se aprueba. Un registro v1 sigue funcionando: aquí se
   * completa con valores derivados y se marca lo que falta, en vez de romperse.
   */
  
  const DBE_TIPOS_EVIDENCIA = ['conocimiento', 'desempeño', 'producto'];
  const DBE_FASES = ['reflexion', 'contextualizacion', 'apropiacion', 'transferencia'];
  
  /**
   * Convierte una clave camelCase o kebab en una etiqueta legible en español.
   * @param {string} clave
   * @returns {string}
   */
  function dbeEtiquetaDesdeClave(clave) {
    const texto = String(clave || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-záéíóúñ0-9])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
      .trim();
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  
  /**
   * Deduce el tipo de campo por el nombre y la longitud esperada.
   * @param {string} clave
   * @returns {'texto'|'area'}
   */
  function dbeTipoPorClave(clave) {
    const largo = /descripcion|descripción|instruccion|instrucción|justificacion|justificación|hallazgo|decision|decisión|observacion|observación|escenario|criterio|regla|resumen|nota|analisis|análisis|prompt/i;
    return largo.test(String(clave || '')) ? 'area' : 'texto';
  }
  
  /**
   * Normaliza la definición de campos de un artefacto.
   *
   * Acepta `fields` (v2, objetos con metadatos) y `templateFields` (v1, cadenas).
   * Un registro v1 no se descarta: sus cadenas se convierten en campos de texto
   * con etiqueta derivada, para que la estación pueda pedirse igual.
   *
   * @param {Object} artefacto
   * @returns {Array<Object>}
   */
  function dbeNormalizarCampos(artefacto) {
    const declarados = Array.isArray(artefacto.fields) ? artefacto.fields : [];
    if (declarados.length) {
      return declarados.map((campo, indice) => {
        const columnas = Array.isArray(campo.columns)
          ? campo.columns.map((columna, posicion) => ({
            key: String(columna.key || `col${posicion + 1}`),
            label: String(columna.label || dbeEtiquetaDesdeClave(columna.key) || `Columna ${posicion + 1}`),
            placeholder: columna.placeholder ? String(columna.placeholder) : '',
          }))
          : [];
  
        // Una SIPOC, un catálogo de reglas o una matriz de trazabilidad no caben
        // en un campo de texto: son tablas de varias filas. Declararlas como
        // `tabla` evita que cada guía vuelva a escribir su propio constructor,
        // que es como el ecosistema terminó con cuatro implementaciones distintas
        // del mismo entregable.
        const tipoDeclarado = String(campo.type || '');
        let tipo = 'texto';
        if (tipoDeclarado === 'area' || tipoDeclarado === 'textarea') tipo = 'area';
        else if (tipoDeclarado === 'lista') tipo = 'lista';
        else if (tipoDeclarado === 'tabla' && columnas.length) tipo = 'tabla';
  
        return {
          key: String(campo.key || `campo${indice + 1}`),
          label: String(campo.label || dbeEtiquetaDesdeClave(campo.key) || `Campo ${indice + 1}`),
          type: tipo,
          columns: columnas,
          hint: campo.hint ? String(campo.hint) : '',
          placeholder: campo.placeholder ? String(campo.placeholder) : '',
          required: campo.required !== false,
        };
      });
    }
    const plantilla = Array.isArray(artefacto.templateFields) ? artefacto.templateFields : [];
    return plantilla.map((clave, indice) => ({
      key: String(clave || `campo${indice + 1}`),
      label: dbeEtiquetaDesdeClave(clave) || `Campo ${indice + 1}`,
      type: dbeTipoPorClave(clave),
      columns: [],
      hint: '',
      placeholder: '',
      required: true,
    }));
  }
  
  /**
   * Deriva un nombre de archivo estable para el entregable.
   * @param {Object} artefacto
   * @param {number} orden
   * @returns {string}
   */
  function dbeNombreArchivo(artefacto, orden) {
    if (artefacto.upload && artefacto.upload.fileName) return String(artefacto.upload.fileName);
    const base = String(artefacto.code || artefacto.id || `evidencia-${orden}`)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${String(orden).padStart(2, '0')}-${base}.md`;
  }
  
  /**
   * Normaliza un artefacto a la forma que consumen la estación y el Portafolio de Evidencias.
   * @param {Object} bruto
   * @param {number} indice
   * @returns {Object}
   */
  function dbeNormalizarArtefacto(bruto, indice) {
    const estacion = bruto.station || {};
    const orden = Number.isFinite(Number(estacion.order)) ? Number(estacion.order) : indice + 1;
    const tipo = DBE_TIPOS_EVIDENCIA.includes(String(bruto.evidenceType)) ? String(bruto.evidenceType) : 'producto';
    const fase = DBE_FASES.includes(String(estacion.phase)) ? String(estacion.phase) : '';
  
    return {
      id: String(bruto.id || `A${indice + 1}`),
      code: String(bruto.code || bruto.id || `A${indice + 1}`),
      name: String(bruto.name || bruto.id || `Entregable ${indice + 1}`),
      purpose: String(bruto.purpose || ''),
      inputs: Array.isArray(bruto.inputs) ? bruto.inputs.map(String) : [],
      instructions: String(bruto.instructions || ''),
      example: String(bruto.example || ''),
      criterion: String(bruto.criterion || ''),
      instrument: String(bruto.instrument || ''),
      evidence: String(bruto.evidence || ''),
      nextStep: String(bruto.nextStep || ''),
      evidenceType: tipo,
      checklist: Array.isArray(bruto.checklist) ? bruto.checklist.map(String) : [],
      aiAssist: bruto.aiAssist
        ? {
          prompt: String(bruto.aiAssist.prompt || ''),
          verify: String(bruto.aiAssist.verify || ''),
          log: String(bruto.aiAssist.log || ''),
        }
        : null,
      station: {
        sectionId: String(estacion.sectionId || ''),
        order: orden,
        phase: fase,
        minutes: Number.isFinite(Number(estacion.minutes)) ? Number(estacion.minutes) : null,
      },
      fields: dbeNormalizarCampos(bruto),
      upload: {
        fileName: dbeNombreArchivo(bruto, orden),
        format: String((bruto.upload && bruto.upload.format) || 'markdown'),
      },
    };
  }
  
  /**
   * Normaliza el bloque de entrega final.
   * @param {Object} bruto
   * @returns {Object}
   */
  function dbeNormalizarEntrega(bruto) {
    const entrega = bruto || {};
    return {
      packageName: String(entrega.packageName || ''),
      format: String(entrega.format || ''),
      where: String(entrega.where || ''),
      namingRule: String(entrega.namingRule || ''),
      whatIsGraded: String(entrega.whatIsGraded || ''),
      approval: Array.isArray(entrega.approval) ? entrega.approval.map(String) : [],
      competencyMap: Array.isArray(entrega.competencyMap)
        ? entrega.competencyMap.map((fila) => ({
          evidenceType: String(fila.evidenceType || ''),
          artifacts: Array.isArray(fila.artifacts) ? fila.artifacts.map(String) : [],
          criterion: String(fila.criterion || ''),
          instrument: String(fila.instrument || ''),
          learningResult: String(fila.learningResult || ''),
        }))
        : [],
      notes: String(entrega.notes || ''),
      declared: Boolean(bruto),
    };
  }
  
  /**
   * Normaliza un registro completo y devuelve además los huecos detectados.
   *
   * Los huecos no se rellenan con texto inventado: se devuelven en `gaps` para
   * que la guía los muestre como pendientes visibles. Un dato institucional
   * fabricado es peor que un dato ausente.
   *
   * @param {Object} bruto - Contenido de deliverables.registry.json
   * @returns {{guideId: string, status: string, sourceStatus: string, artifacts: Array, submission: Object, gaps: Array<string>}}
   */
  function dbeNormalizarRegistro(bruto) {
    const registro = bruto || {};
    const artefactos = (Array.isArray(registro.artifacts) ? registro.artifacts : [])
      .map(dbeNormalizarArtefacto)
      .sort((a, b) => a.station.order - b.station.order);
  
    const gaps = [];
    artefactos.forEach((artefacto) => {
      if (!artefacto.station.sectionId) {
        gaps.push(`${artefacto.id} no declara la sección donde se produce (station.sectionId).`);
      }
      if (!artefacto.fields.length) {
        gaps.push(`${artefacto.id} no declara campos de plantilla.`);
      }
    });
  
    const submission = dbeNormalizarEntrega(registro.submission);
    if (!submission.declared) {
      gaps.push('El registro no declara el bloque submission: qué se carga y con qué se aprueba.');
    }
  
    return {
      guideId: String(registro.guideId || ''),
      status: String(registro.status || ''),
      sourceStatus: String(registro.sourceStatus || ''),
      artifacts: artefactos,
      submission,
      gaps,
    };
  }
  
  /**
   * Agrupa los artefactos por sección de la guía.
   * @param {Array} artefactos
   * @returns {Map<string, Array>}
   */
  function dbeAgruparPorSeccion(artefactos) {
    const mapa = new Map();
    artefactos.forEach((artefacto) => {
      const clave = artefacto.station.sectionId || '__sin-seccion__';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(artefacto);
    });
    return mapa;
  }
  
  

  /* --- evidence/store.js --- */
  /**
   * Estado local de las evidencias de una guía.
   *
   * Guarda lo que el aprendiz escribe en cada estación para que el recorrido no
   * dependa de terminar en una sola sesión, y para que la consolidación final no
   * vuelva a pedir lo que ya se produjo.
   *
   * Límites deliberados:
   * - Todo vive en `localStorage`, en el navegador de quien estudia. No hay envío
   *   remoto, no hay cuenta y no hay servidor: una guía debe abrirse desde un USB
   *   en un aula sin red.
   * - El estado `verificada` no existe. La web puede decir que una evidencia está
   *   completa según el criterio declarado; no puede emitir el juicio evaluativo
   *   del instructor, y fingirlo sería el peor daño posible en una guía SENA.
   */
  
  const DBE_ESTADOS = ['pendiente', 'borrador', 'lista'];
  
  /**
   * Almacén de evidencias con espacio de nombres por guía.
   */
  class DbeEvidenceStore {
    /**
     * @param {string} prefijo - Prefijo de las claves (ej. `devbrain_guia3`)
     */
    constructor(prefijo) {
      this.prefijo = prefijo || 'devbrain_evidencia';
      this.oyentes = new Set();
    }
  
    /**
     * Clave completa de un artefacto.
     * @param {string} id
     * @returns {string}
     */
    clave(id) {
      return `${this.prefijo}_evidencia_${id}`;
    }
  
    /**
     * Lee el registro guardado de un artefacto.
     * @param {string} id
     * @returns {{values: Object, checks: Object, status: string, updatedAt: string|null}}
     */
    leer(id) {
      const vacio = { values: {}, checks: {}, status: 'pendiente', updatedAt: null };
      try {
        const crudo = localStorage.getItem(this.clave(id));
        if (!crudo) return vacio;
        const dato = JSON.parse(crudo);
        return {
          values: dato && typeof dato.values === 'object' && dato.values ? dato.values : {},
          checks: dato && typeof dato.checks === 'object' && dato.checks ? dato.checks : {},
          status: DBE_ESTADOS.includes(dato && dato.status) ? dato.status : 'pendiente',
          updatedAt: dato && dato.updatedAt ? String(dato.updatedAt) : null,
        };
      } catch (error) {
        console.warn('No se pudo leer la evidencia', id, error);
        return vacio;
      }
    }
  
    /**
     * Guarda el registro de un artefacto y notifica a los oyentes.
     * @param {string} id
     * @param {Object} parcial - Campos a fusionar
     * @returns {Object} El registro resultante
     */
    guardar(id, parcial) {
      const actual = this.leer(id);
      const siguiente = {
        values: { ...actual.values, ...(parcial.values || {}) },
        checks: { ...actual.checks, ...(parcial.checks || {}) },
        status: DBE_ESTADOS.includes(parcial.status) ? parcial.status : actual.status,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(this.clave(id), JSON.stringify(siguiente));
      } catch (error) {
        console.warn('No se pudo guardar la evidencia', id, error);
      }
      this.notificar(id, siguiente);
      return siguiente;
    }
  
    /**
     * Borra el registro de un artefacto.
     * @param {string} id
     */
    borrar(id) {
      try {
        localStorage.removeItem(this.clave(id));
      } catch (error) {
        console.warn('No se pudo borrar la evidencia', id, error);
      }
      this.notificar(id, this.leer(id));
    }
  
    /**
     * Añade una entrada a la bitácora humano–IA.
     *
     * La bitácora es una evidencia en sí misma: en 2026 la pregunta evaluable no
     * es si se usó IA, sino qué se le pidió, qué se verificó y quién decidió.
     *
     * @param {{artifactId: string, prompt: string, tool: string, verified: string, decision: string}} entrada
     * @returns {Array<Object>} La bitácora completa
     */
    registrarUsoIa(entrada) {
      const bitacora = this.leerBitacora();
      bitacora.push({
        artifactId: String(entrada.artifactId || ''),
        prompt: String(entrada.prompt || ''),
        tool: String(entrada.tool || ''),
        verified: String(entrada.verified || ''),
        decision: String(entrada.decision || ''),
        at: new Date().toISOString(),
      });
      try {
        localStorage.setItem(`${this.prefijo}_bitacora_ia`, JSON.stringify(bitacora));
      } catch (error) {
        console.warn('No se pudo registrar el uso de IA', error);
      }
      this.notificar('__bitacora__', bitacora);
      return bitacora;
    }
  
    /**
     * Lee la bitácora humano–IA.
     * @returns {Array<Object>}
     */
    leerBitacora() {
      try {
        const crudo = localStorage.getItem(`${this.prefijo}_bitacora_ia`);
        const dato = crudo ? JSON.parse(crudo) : [];
        return Array.isArray(dato) ? dato : [];
      } catch (error) {
        console.warn('No se pudo leer la bitácora de IA', error);
        return [];
      }
    }
  
    /**
     * Suscribe una función a los cambios del almacén.
     * @param {Function} oyente
     * @returns {Function} Función para cancelar la suscripción
     */
    suscribir(oyente) {
      if (typeof oyente === 'function') this.oyentes.add(oyente);
      return () => this.oyentes.delete(oyente);
    }
  
    /**
     * Notifica un cambio a los oyentes.
     * @param {string} id
     * @param {Object} dato
     */
    notificar(id, dato) {
      this.oyentes.forEach((oyente) => {
        try {
          oyente(id, dato);
        } catch (error) {
          console.warn('Un oyente de evidencia falló', error);
        }
      });
    }
  
    /**
     * Exporta todo el trabajo local como objeto serializable.
     * @param {Array<string>} ids
     * @returns {Object}
     */
    exportar(ids) {
      const evidencias = {};
      (ids || []).forEach((id) => { evidencias[id] = this.leer(id); });
      return { prefijo: this.prefijo, exportadoEn: new Date().toISOString(), evidencias, bitacoraIa: this.leerBitacora() };
    }
  
    /**
     * Importa un respaldo generado por `exportar`.
     * @param {Object|string} datos
     * @returns {boolean}
     */
    importar(datos) {
      try {
        const objeto = typeof datos === 'string' ? JSON.parse(datos) : datos;
        if (!objeto || typeof objeto !== 'object' || !objeto.evidencias) return false;
        Object.entries(objeto.evidencias).forEach(([id, registro]) => {
          localStorage.setItem(this.clave(id), JSON.stringify(registro));
        });
        if (Array.isArray(objeto.bitacoraIa)) {
          localStorage.setItem(`${this.prefijo}_bitacora_ia`, JSON.stringify(objeto.bitacoraIa));
        }
        this.notificar('__importado__', objeto);
        return true;
      } catch (error) {
        console.warn('No se pudo importar el respaldo de evidencias', error);
        return false;
      }
    }
  }
  
  /**
   * Calcula el estado de un artefacto a partir de lo diligenciado.
   *
   * `lista` exige campos obligatorios y autochequeo completos. Sin autochequeo
   * declarado basta con los campos: una guía no debe inventar requisitos que su
   * propio registro no declaró.
   *
   * @param {Object} artefacto - Artefacto normalizado
   * @param {Object} registro - Registro del almacén
   * @returns {'pendiente'|'borrador'|'lista'}
   */
  function dbeCalcularEstado(artefacto, registro) {
    const valores = registro.values || {};
    const marcas = registro.checks || {};
  
    /**
     * Un campo cuenta como diligenciado según su tipo: un texto necesita
     * contenido y una tabla necesita al menos una fila.
     * @param {Object} campo
     * @returns {boolean}
     */
    const diligenciado = (campo) => {
      const valor = valores[campo.key];
      if (campo.type === 'tabla') return Array.isArray(valor) && valor.length > 0;
      return String(valor || '').trim().length > 0;
    };
  
    const obligatorios = artefacto.fields.filter((campo) => campo.required);
    if (!artefacto.fields.some(diligenciado)) return 'pendiente';
  
    const faltanCampos = obligatorios.some((campo) => !diligenciado(campo));
    const faltanMarcas = artefacto.checklist.some((_, indice) => marcas[`c${indice}`] !== true);
    if (faltanCampos || faltanMarcas) return 'borrador';
    return 'lista';
  }
  
  

  /* --- evidence/dom.js --- */
  /**
   * Ayudantes de DOM para el módulo de evidencias.
   *
   * Todo se construye con `createElement` y `textContent`. Nada de `innerHTML`
   * con texto del aprendiz: lo que se escribe en una estación se vuelve a pintar
   * en el Portafolio de Evidencias, y ese camino es exactamente donde una guía educativa se
   * convertiría en un ejercicio de XSS contra quien estudia.
   */
  
  /**
   * Crea un elemento con clase, texto y atributos.
   * @param {string} etiqueta
   * @param {Object} [opciones]
   * @param {string} [opciones.clase]
   * @param {string} [opciones.texto]
   * @param {Object} [opciones.attrs]
   * @param {Array<Node>} [opciones.hijos]
   * @returns {HTMLElement}
   */
  function dbeEl(etiqueta, opciones = {}) {
    const nodo = document.createElement(etiqueta);
    if (opciones.clase) nodo.className = opciones.clase;
    if (opciones.texto !== undefined && opciones.texto !== null) nodo.textContent = String(opciones.texto);
    if (opciones.attrs) {
      Object.entries(opciones.attrs).forEach(([nombre, valor]) => {
        if (valor === null || valor === undefined || valor === false) return;
        nodo.setAttribute(nombre, valor === true ? '' : String(valor));
      });
    }
    if (Array.isArray(opciones.hijos)) {
      opciones.hijos.filter(Boolean).forEach((hijo) => nodo.appendChild(hijo));
    }
    return nodo;
  }
  
  /**
   * Crea un bloque titulado con contenido de texto.
   * @param {string} titulo
   * @param {string} cuerpo
   * @param {string} [clase]
   * @returns {HTMLElement|null}
   */
  function dbeBloque(titulo, cuerpo, clase = '') {
    const texto = String(cuerpo || '').trim();
    if (!texto) return null;
    return dbeEl('div', {
      clase: `dbe-bloque ${clase}`.trim(),
      hijos: [
        dbeEl('h4', { clase: 'dbe-bloque__titulo', texto: titulo }),
        dbeEl('p', { clase: 'dbe-bloque__texto', texto }),
      ],
    });
  }
  
  /**
   * Crea una lista de fichas a partir de un arreglo de textos.
   * @param {string} titulo
   * @param {Array<string>} elementos
   * @returns {HTMLElement|null}
   */
  function dbeFichas(titulo, elementos) {
    const lista = (elementos || []).map(String).filter((texto) => texto.trim().length > 0);
    if (!lista.length) return null;
    return dbeEl('div', {
      clase: 'dbe-bloque',
      hijos: [
        dbeEl('h4', { clase: 'dbe-bloque__titulo', texto: titulo }),
        dbeEl('ul', {
          clase: 'dbe-fichas',
          hijos: lista.map((texto) => dbeEl('li', { clase: 'dbe-ficha', texto })),
        }),
      ],
    });
  }
  
  /**
   * Copia texto al portapapeles y da retroalimentación en el botón.
   * @param {string} texto
   * @param {HTMLElement} boton
   * @param {string} [exito]
   */
  async function dbeCopiar(texto, boton, exito = 'Copiado') {
    if (!texto) return;
    const original = boton ? boton.textContent : '';
    try {
      await navigator.clipboard.writeText(texto);
      if (boton) boton.textContent = exito;
    } catch (error) {
      if (boton) boton.textContent = 'Selecciona y copia a mano';
    }
    if (boton) {
      window.setTimeout(() => { boton.textContent = original; }, 1800);
    }
  }
  
  /**
   * Descarga un texto como archivo local.
   * @param {string} texto
   * @param {string} nombre
   * @param {string} [mime]
   */
  function dbeDescargar(texto, nombre, mime = 'text/markdown;charset=utf-8') {
    if (!texto) return;
    const blob = new Blob([texto], { type: mime });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Etiqueta legible de un estado de evidencia.
   * @param {string} estado
   * @returns {string}
   */
  function dbeEtiquetaEstado(estado) {
    if (estado === 'lista') return 'Lista para entregar';
    if (estado === 'borrador') return 'En borrador';
    return 'Pendiente';
  }
  
  /**
   * Etiqueta legible del tipo de evidencia.
   * @param {string} tipo
   * @returns {string}
   */
  function dbeEtiquetaTipo(tipo) {
    if (tipo === 'conocimiento') return 'Evidencia de conocimiento';
    if (tipo === 'desempeño') return 'Evidencia de desempeño';
    return 'Evidencia de producto';
  }
  

  /* --- evidence/markdown.js --- */
  /**
   * Serialización de evidencias a Markdown.
   *
   * El aprendiz entrega archivos, no capturas de una web. Cada estación produce
   * un `.md` que puede pegarse en el Portafolio de Evidencias, versionarse en Git o convertirse en
   * PDF, y la consolidación produce el paquete completo con el mismo formato.
   */
  
  
  /**
   * Escapa el contenido de una celda de tabla Markdown.
   * @param {string} texto
   * @returns {string}
   */
  function dbeCelda(texto) {
    return String(texto === undefined || texto === null || texto === '' ? '—' : texto)
      .replace(/\|/g, '\\|')
      .replace(/\r?\n/g, ' ');
  }
  
  /**
   * Genera el Markdown de una evidencia diligenciada.
   * @param {Object} artefacto - Artefacto normalizado
   * @param {Object} registro - Registro del almacén
   * @param {string} estado - Estado calculado
   * @returns {string}
   */
  function dbeEvidenciaAMarkdown(artefacto, registro, estado) {
    const valores = registro.values || {};
    const lineas = [];
    lineas.push(`# ${artefacto.code} · ${artefacto.name}`);
    lineas.push('');
    lineas.push(`- **Identificador:** ${artefacto.id}`);
    lineas.push(`- **Tipo:** ${dbeEtiquetaTipo(artefacto.evidenceType)}`);
    lineas.push(`- **Estado en el recorrido web:** ${dbeEtiquetaEstado(estado)}`);
    if (artefacto.criterion) lineas.push(`- **Criterio observable:** ${artefacto.criterion}`);
    if (artefacto.instrument) lineas.push(`- **Instrumento:** ${artefacto.instrument}`);
    if (artefacto.evidence) lineas.push(`- **Qué se entrega:** ${artefacto.evidence}`);
    lineas.push('');
  
    if (artefacto.purpose) {
      lineas.push('## Para qué existe');
      lineas.push('');
      lineas.push(artefacto.purpose);
      lineas.push('');
    }
  
    lineas.push('## Contenido');
    lineas.push('');
    artefacto.fields.forEach((campo) => {
      lineas.push(`### ${campo.label}`);
      lineas.push('');
      if (campo.type === 'tabla') {
        const filas = Array.isArray(valores[campo.key]) ? valores[campo.key] : [];
        if (!filas.length) {
          lineas.push('_Pendiente._');
        } else {
          lineas.push(`| ${campo.columns.map((columna) => dbeCelda(columna.label)).join(' | ')} |`);
          lineas.push(`| ${campo.columns.map(() => '---').join(' | ')} |`);
          filas.forEach((fila) => {
            lineas.push(`| ${campo.columns.map((columna) => dbeCelda(fila[columna.key])).join(' | ')} |`);
          });
        }
      } else {
        lineas.push(String(valores[campo.key] || '').trim() || '_Pendiente._');
      }
      lineas.push('');
    });
  
    if (artefacto.checklist.length) {
      lineas.push('## Autochequeo contra el criterio');
      lineas.push('');
      artefacto.checklist.forEach((item, indice) => {
        const marcado = (registro.checks || {})[`c${indice}`] === true;
        lineas.push(`- [${marcado ? 'x' : ' '}] ${item}`);
      });
      lineas.push('');
    }
  
    if (artefacto.nextStep) {
      lineas.push('## Hacia dónde sigue');
      lineas.push('');
      lineas.push(artefacto.nextStep);
      lineas.push('');
    }
  
    lineas.push('---');
    lineas.push('');
    lineas.push('El estado de esta evidencia lo calcula la guía a partir del criterio declarado. No equivale a la valoración del instructor.');
    lineas.push('');
    return lineas.join('\n');
  }
  
  /**
   * Genera la tabla de control de todas las evidencias.
   * @param {Array<Object>} filas - {artefacto, estado}
   * @returns {string}
   */
  function dbeTablaControl(filas) {
    const salida = [
      '| # | Código | Evidencia | Tipo | Estado | Archivo | Instrumento |',
      '| --- | --- | --- | --- | --- | --- | --- |',
    ];
    filas.forEach(({ artefacto, estado }) => {
      const celdas = [
        artefacto.station.order,
        artefacto.code,
        artefacto.name,
        dbeEtiquetaTipo(artefacto.evidenceType).replace('Evidencia de ', ''),
        dbeEtiquetaEstado(estado),
        artefacto.upload.fileName,
        artefacto.instrument,
      ].map(dbeCelda);
      salida.push(`| ${celdas.join(' | ')} |`);
    });
    return salida.join('\n');
  }
  
  /**
   * Genera el paquete completo de evidencias listo para entregar.
   * @param {Object} opciones
   * @param {Object} opciones.registro - Registro normalizado
   * @param {Array<Object>} opciones.filas - {artefacto, datos, estado}
   * @param {Array<Object>} opciones.bitacora - Bitácora humano–IA
   * @param {Object} [opciones.identificacion] - Datos de portada declarados por la guía
   * @returns {string}
   */
  function dbePaqueteAMarkdown({ registro, filas, bitacora, identificacion }) {
    const lineas = [];
    const entrega = registro.submission || {};
  
    lineas.push(`# Paquete de evidencias · ${registro.guideId || 'guía DevBrain'}`);
    lineas.push('');
    lineas.push(`Generado en el navegador el ${new Date().toLocaleString('es-CO')}. Ningún dato salió de este equipo.`);
    lineas.push('');
  
    if (identificacion && Object.keys(identificacion).length) {
      lineas.push('## Identificación');
      lineas.push('');
      Object.entries(identificacion).forEach(([clave, valor]) => {
        lineas.push(`- **${clave}:** ${valor || '_Por completar._'}`);
      });
      lineas.push('');
    }
  
    lineas.push('## Control de evidencias');
    lineas.push('');
    lineas.push(dbeTablaControl(filas));
    lineas.push('');
  
    if (entrega.competencyMap && entrega.competencyMap.length) {
      lineas.push('## Qué se evalúa con cada evidencia');
      lineas.push('');
      lineas.push('| Tipo de evidencia | Artefactos | Criterio de evaluación | Instrumento |');
      lineas.push('| --- | --- | --- | --- |');
      entrega.competencyMap.forEach((fila) => {
        lineas.push(`| ${dbeCelda(fila.evidenceType)} | ${dbeCelda(fila.artifacts.join(', '))} | ${dbeCelda(fila.criterion)} | ${dbeCelda(fila.instrument)} |`);
      });
      lineas.push('');
    }
  
    if (entrega.whatIsGraded || entrega.format || entrega.where || entrega.namingRule) {
      lineas.push('## Cómo se carga');
      lineas.push('');
      if (entrega.packageName) lineas.push(`- **Nombre del paquete:** ${entrega.packageName}`);
      if (entrega.namingRule) lineas.push(`- **Nomenclatura:** ${entrega.namingRule}`);
      if (entrega.format) lineas.push(`- **Formato:** ${entrega.format}`);
      if (entrega.where) lineas.push(`- **Dónde se sube:** ${entrega.where}`);
      if (entrega.whatIsGraded) lineas.push(`- **Qué se califica:** ${entrega.whatIsGraded}`);
      lineas.push('');
    }
  
    if (entrega.approval && entrega.approval.length) {
      lineas.push('## Condiciones declaradas para aprobar');
      lineas.push('');
      entrega.approval.forEach((condicion) => lineas.push(`- ${condicion}`));
      lineas.push('');
    }
  
    filas.forEach(({ artefacto, datos, estado }) => {
      lineas.push('---');
      lineas.push('');
      lineas.push(dbeEvidenciaAMarkdown(artefacto, datos, estado));
    });
  
    lineas.push('---');
    lineas.push('');
    lineas.push('## Bitácora humano–IA');
    lineas.push('');
    if (!bitacora || !bitacora.length) {
      lineas.push('No se registró uso de inteligencia artificial, o el registro se hizo fuera de esta guía.');
    } else {
      lineas.push('| Fecha | Evidencia | Herramienta | Qué se pidió | Qué se verificó | Decisión humana |');
      lineas.push('| --- | --- | --- | --- | --- | --- |');
      bitacora.forEach((entrada) => {
        lineas.push(`| ${dbeCelda(entrada.at)} | ${dbeCelda(entrada.artifactId)} | ${dbeCelda(entrada.tool)} | ${dbeCelda(entrada.prompt)} | ${dbeCelda(entrada.verified)} | ${dbeCelda(entrada.decision)} |`);
      });
    }
    lineas.push('');
    lineas.push('---');
    lineas.push('');
    lineas.push('Este paquete lo generó una guía web de práctica. No es una certificación del SENA ni sustituye la valoración del instructor.');
    lineas.push('');
    return lineas.join('\n');
  }
  

  /* --- evidence/tema.js --- */
  /**
   * Adaptación de las estaciones al tema real de la guía anfitriona.
   *
   * Las tarjetas de evidencia se insertan en trece guías con temas distintos: la
   * Guía 3 es oscura por diseño, la de Spring es clara, y ninguna comparte el
   * nombre del interruptor. Decidir la paleta solo con `prefers-color-scheme`
   * produce el peor resultado posible: una tarjeta blanca en medio de una página
   * oscura, que el aprendiz lee como una parte rota de la web.
   *
   * Aquí se mide el fondo que la tarjeta recibió de verdad, con el mismo cálculo
   * que usan los bloques de código, y se marca `data-dbe-tema`. La hoja de
   * estilos da a ese atributo la última palabra sobre la consulta del sistema.
   */
  
  
  const DBE_OBSERVADAS = new Set();
  let dbeObservadorTema = null;
  
  /**
   * Marca una tarjeta con el tema que le corresponde por su fondo.
   * @param {HTMLElement} tarjeta
   */
  function dbeAjustarTema(tarjeta) {
    if (!tarjeta || !tarjeta.isConnected) return;
    const anfitrion = tarjeta.parentElement || tarjeta;
    tarjeta.setAttribute('data-dbe-tema', fondoEsClaro(anfitrion) ? 'claro' : 'oscuro');
  }
  
  function dbeReajustarTodo() {
    DBE_OBSERVADAS.forEach((tarjeta) => {
      if (tarjeta.isConnected) dbeAjustarTema(tarjeta);
      else DBE_OBSERVADAS.delete(tarjeta);
    });
  }
  
  /**
   * Registra una tarjeta para que siga al tema de la página.
   *
   * La medición se aplaza igual que en los bloques de código: la tarjeta se
   * construye antes de insertarse, y varias guías son aplicaciones de una sola
   * página que mantienen ocultos los módulos que no se están viendo.
   *
   * @param {HTMLElement} tarjeta
   */
  function dbeSeguirTema(tarjeta) {
    DBE_OBSERVADAS.add(tarjeta);
    setTimeout(() => dbeAjustarTema(tarjeta), 0);
  
    if (typeof IntersectionObserver === 'function') {
      const visible = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) dbeAjustarTema(tarjeta);
        });
      });
      visible.observe(tarjeta);
    }
  
    if (!dbeObservadorTema && typeof MutationObserver === 'function') {
      dbeObservadorTema = new MutationObserver(dbeReajustarTodo);
      dbeObservadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-tema', 'style'] });
      if (document.body) {
        dbeObservadorTema.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-tema'] });
      }
      if (window.matchMedia) {
        const consulta = window.matchMedia('(prefers-color-scheme: dark)');
        if (consulta.addEventListener) consulta.addEventListener('change', dbeReajustarTodo);
      }
    }
  }
  

  /* --- evidence/station-table.js --- */
  /**
   * Campo de tipo tabla para estaciones de evidencia.
   *
   * Construye la interfaz para agregar filas, visualizarlas en una tabla
   * y eliminarlas de forma dinámica y accesible.
   */
  
  
  /**
   * Construye un campo de tabla: alta de filas, vista previa y borrado.
   * @param {Object} artefacto
   * @param {Object} campo
   * @param {Object} registro
   * @param {Function} alCambiar
   * @returns {HTMLElement}
   */
  function dbeCampoTabla(artefacto, campo, registro, alCambiar) {
    const idCampo = `dbe-${artefacto.id}-${campo.key}`;
    let filas = Array.isArray((registro.values || {})[campo.key]) ? [...registro.values[campo.key]] : [];
  
    const entradas = campo.columns.map((columna) => {
      const control = dbeEl('input', {
        clase: 'dbe-campo__control',
        attrs: { type: 'text', id: `${idCampo}-${columna.key}`, 'aria-label': `${campo.label}: ${columna.label}` },
      });
      if (columna.placeholder) control.setAttribute('placeholder', columna.placeholder);
      return { columna, control };
    });
  
    const cuerpo = dbeEl('tbody');
    const aviso = dbeEl('p', { clase: 'dbe-guardado', attrs: { role: 'status', 'aria-live': 'polite' } });
  
    const pintarFilas = () => {
      cuerpo.replaceChildren(...filas.map((fila, indice) => {
        const quitar = dbeEl('button', { clase: 'dbe-boton dbe-boton--riesgo dbe-boton--menudo', texto: 'Quitar', attrs: { type: 'button' } });
        quitar.addEventListener('click', () => {
          filas.splice(indice, 1);
          alCambiar(campo.key, filas);
          pintarFilas();
          aviso.textContent = 'Fila eliminada.';
        });
        return dbeEl('tr', {
          hijos: [
            ...campo.columns.map((columna) => dbeEl('td', { texto: fila[columna.key] || '—' })),
            dbeEl('td', { hijos: [quitar] }),
          ],
        });
      }));
      if (!filas.length) {
        cuerpo.appendChild(dbeEl('tr', {
          hijos: [dbeEl('td', {
            texto: 'Todavía no agregaste ninguna fila.',
            attrs: { colspan: String(campo.columns.length + 1) },
          })],
        }));
      }
    };
  
    const agregar = dbeEl('button', { clase: 'dbe-boton', texto: 'Agregar fila', attrs: { type: 'button' } });
    agregar.addEventListener('click', () => {
      const fila = {};
      let vacia = true;
      entradas.forEach(({ columna, control }) => {
        const valor = control.value.trim();
        fila[columna.key] = valor;
        if (valor) vacia = false;
      });
      if (vacia) {
        aviso.textContent = 'Completa al menos una columna antes de agregar la fila.';
        return;
      }
      filas.push(fila);
      alCambiar(campo.key, filas);
      entradas.forEach(({ control }) => { control.value = ''; });
      pintarFilas();
      aviso.textContent = `Fila agregada. La tabla tiene ${filas.length}.`;
      entradas[0].control.focus();
    });
  
    pintarFilas();
  
    const encabezado = dbeEl('thead', {
      hijos: [dbeEl('tr', {
        hijos: [
          ...campo.columns.map((columna) => dbeEl('th', { texto: columna.label, attrs: { scope: 'col' } })),
          dbeEl('th', { texto: 'Acción', attrs: { scope: 'col' } }),
        ],
      })],
    });
  
    return dbeEl('div', {
      clase: 'dbe-campo dbe-campo--tabla',
      hijos: [
        dbeEl('p', {
          clase: 'dbe-campo__etiqueta',
          hijos: [
            document.createTextNode(campo.label),
            campo.required ? dbeEl('span', { clase: 'dbe-campo__obligatorio', texto: ' · obligatorio' }) : null,
          ],
        }),
        campo.hint ? dbeEl('p', { clase: 'dbe-campo__ayuda', texto: campo.hint }) : null,
        dbeEl('div', { clase: 'dbe-tabla-alta', hijos: entradas.map(({ control }) => control) }),
        agregar,
        aviso,
        dbeEl('div', {
          clase: 'dbe-tabla-envoltura',
          hijos: [dbeEl('table', { clase: 'dbe-tabla', hijos: [encabezado, cuerpo] })],
        }),
      ],
    });
  }
  

  /* --- evidence/station.js --- */
  /**
   * Estación de evidencia: la tarjeta que pide el entregable dentro de la sección
   * donde el aprendiz acaba de estudiarlo.
   *
   * Antes de este módulo, una guía DevBrain explicaba diez temas y luego, en la
   * última pantalla, listaba los diez entregables. El aprendiz llegaba al final
   * con una factura completa y sin nada producido. Cada estación corta esa deuda
   * en el punto donde el contenido todavía está fresco: teoría, ejemplo, campos,
   * criterio y archivo, en la misma sección.
   *
   * La tarjeta no evalúa. Comprueba que lo declarado esté diligenciado y que el
   * aprendiz haya contrastado su trabajo con el criterio; el juicio evaluativo
   * sigue siendo del instructor.
   */
  
  
  
  
  
  
  /**
   * Construye el formulario de campos de la evidencia.
   * @param {Object} artefacto
   * @param {Object} registro
   * @param {Function} alCambiar
   * @returns {HTMLElement}
   */
  function dbeFormulario(artefacto, registro, alCambiar) {
    const campos = artefacto.fields.map((campo) => {
      if (campo.type === 'tabla') return dbeCampoTabla(artefacto, campo, registro, alCambiar);
      const idCampo = `dbe-${artefacto.id}-${campo.key}`;
      const etiqueta = dbeEl('label', { clase: 'dbe-campo__etiqueta', attrs: { for: idCampo } });
      etiqueta.appendChild(document.createTextNode(campo.label));
      if (campo.required) {
        etiqueta.appendChild(dbeEl('span', { clase: 'dbe-campo__obligatorio', texto: ' · obligatorio' }));
      }
  
      const control = campo.type === 'area'
        ? dbeEl('textarea', { clase: 'dbe-campo__control', attrs: { id: idCampo, rows: 4 } })
        : dbeEl('input', { clase: 'dbe-campo__control', attrs: { id: idCampo, type: 'text' } });
  
      control.value = String((registro.values || {})[campo.key] || '');
      if (campo.placeholder) control.setAttribute('placeholder', campo.placeholder);
      if (campo.hint) control.setAttribute('aria-describedby', `${idCampo}-ayuda`);
      control.addEventListener('input', () => alCambiar(campo.key, control.value));
  
      return dbeEl('div', {
        clase: 'dbe-campo',
        hijos: [
          etiqueta,
          campo.hint ? dbeEl('p', { clase: 'dbe-campo__ayuda', texto: campo.hint, attrs: { id: `${idCampo}-ayuda` } }) : null,
          control,
        ],
      });
    });
  
    return dbeEl('div', {
      clase: 'dbe-formulario',
      hijos: [
        dbeEl('h4', { clase: 'dbe-bloque__titulo', texto: 'Tu entregable' }),
        ...campos,
      ],
    });
  }
  
  /**
   * Construye el panel de trabajo con IA vigente en 2026.
   *
   * El panel no llama a ningún proveedor: entrega el encargo listo para pegar en
   * la herramienta que el aprendiz ya use, dice qué hay que verificar antes de
   * aceptarlo y deja la decisión registrada. Esa es la parte evaluable.
   *
   * @param {Object} artefacto
   * @param {Function} alRegistrar
   * @returns {HTMLElement|null}
   */
  function dbePanelIa(artefacto, alRegistrar) {
    if (!artefacto.aiAssist || !artefacto.aiAssist.prompt) return null;
  
    const areaPrompt = dbeEl('pre', { clase: 'dbe-ia__prompt', texto: artefacto.aiAssist.prompt, attrs: { 'data-dbc': 'omitir', tabindex: '0' } });
  
    const botonCopiar = dbeEl('button', { clase: 'dbe-boton dbe-boton--suave', texto: 'Copiar el encargo', attrs: { type: 'button' } });
    botonCopiar.addEventListener('click', () => dbeCopiar(artefacto.aiAssist.prompt, botonCopiar));
  
    const herramienta = dbeEl('input', { clase: 'dbe-campo__control', attrs: { type: 'text', placeholder: 'Herramienta y modelo usados', id: `dbe-${artefacto.id}-ia-tool` } });
    const verificado = dbeEl('input', { clase: 'dbe-campo__control', attrs: { type: 'text', placeholder: 'Qué verificaste contra la fuente', id: `dbe-${artefacto.id}-ia-verif` } });
    const decision = dbeEl('input', { clase: 'dbe-campo__control', attrs: { type: 'text', placeholder: 'Qué aceptaste, corregiste o descartaste', id: `dbe-${artefacto.id}-ia-dec` } });
  
    const aviso = dbeEl('p', { clase: 'dbe-ia__aviso', attrs: { role: 'status', 'aria-live': 'polite' } });
  
    const botonRegistrar = dbeEl('button', { clase: 'dbe-boton dbe-boton--suave', texto: 'Registrar en la bitácora', attrs: { type: 'button' } });
    botonRegistrar.addEventListener('click', () => {
      if (!herramienta.value.trim() && !verificado.value.trim() && !decision.value.trim()) {
        aviso.textContent = 'Completa al menos la herramienta y la verificación antes de registrar.';
        return;
      }
      alRegistrar({
        artifactId: artefacto.id,
        prompt: artefacto.aiAssist.prompt,
        tool: herramienta.value.trim(),
        verified: verificado.value.trim(),
        decision: decision.value.trim(),
      });
      aviso.textContent = 'Entrada registrada en la bitácora humano–IA de esta guía.';
      herramienta.value = '';
      verificado.value = '';
      decision.value = '';
    });
  
    return dbeEl('details', {
      clase: 'dbe-ia',
      hijos: [
        dbeEl('summary', { clase: 'dbe-ia__resumen', texto: 'Cómo se hace esto hoy con IA, y qué debes verificar' }),
        dbeEl('div', {
          clase: 'dbe-ia__cuerpo',
          hijos: [
            dbeEl('p', { clase: 'dbe-bloque__texto', texto: 'Pega este encargo en el asistente que uses. La IA propone; tú verificas y decides. Lo evaluable no es el resultado del modelo, sino tu verificación y tu decisión.' }),
            areaPrompt,
            botonCopiar,
            artefacto.aiAssist.verify ? dbeBloque('Verifica antes de aceptar', artefacto.aiAssist.verify, 'dbe-bloque--alerta') : null,
            artefacto.aiAssist.log ? dbeBloque('Registra en la bitácora', artefacto.aiAssist.log) : null,
            dbeEl('div', {
              clase: 'dbe-ia__registro',
              hijos: [herramienta, verificado, decision, botonRegistrar, aviso],
            }),
          ],
        }),
      ],
    });
  }
  
  /**
   * Construye el autochequeo contra el criterio.
   * @param {Object} artefacto
   * @param {Object} registro
   * @param {Function} alMarcar
   * @returns {HTMLElement|null}
   */
  function dbeAutochequeo(artefacto, registro, alMarcar) {
    if (!artefacto.checklist.length) return null;
    const items = artefacto.checklist.map((texto, indice) => {
      const idItem = `dbe-${artefacto.id}-c${indice}`;
      const casilla = dbeEl('input', { attrs: { type: 'checkbox', id: idItem } });
      casilla.checked = (registro.checks || {})[`c${indice}`] === true;
      casilla.addEventListener('change', () => alMarcar(`c${indice}`, casilla.checked));
      return dbeEl('li', {
        clase: 'dbe-chequeo__item',
        hijos: [casilla, dbeEl('label', { attrs: { for: idItem }, texto })],
      });
    });
  
    return dbeEl('div', {
      clase: 'dbe-chequeo',
      hijos: [
        dbeEl('h4', { clase: 'dbe-bloque__titulo', texto: 'Contrasta con el criterio antes de darla por lista' }),
        dbeEl('ul', { clase: 'dbe-chequeo__lista', hijos: items }),
      ],
    });
  }
  
  /**
   * Monta una estación de evidencia dentro de su sección.
   *
   * @param {HTMLElement} contenedor - Nodo con `data-db-evidence="<id>"`
   * @param {Object} artefacto - Artefacto normalizado
   * @param {Object} store - Instancia de DbeEvidenceStore
   * @param {Object} [opciones]
   * @param {number} [opciones.total] - Total de evidencias de la guía
   * @param {string} [opciones.dossierHref] - Ancla de la sección de consolidación
   * @returns {{refrescar: Function}}
   */
  function dbeMontarEstacion(contenedor, artefacto, store, opciones = {}) {
    const total = opciones.total || 0;
    let registro = store.leer(artefacto.id);
  
    const chipEstado = dbeEl('span', { clase: 'dbe-chip dbe-chip--estado', attrs: { 'aria-live': 'polite' } });
    const avisoGuardado = dbeEl('p', { clase: 'dbe-guardado', attrs: { role: 'status', 'aria-live': 'polite' } });
  
    const pintarEstado = () => {
      const estado = dbeCalcularEstado(artefacto, registro);
      chipEstado.textContent = dbeEtiquetaEstado(estado);
      chipEstado.setAttribute('data-estado', estado);
      contenedor.setAttribute('data-db-evidence-status', estado);
      return estado;
    };
  
    const emitir = (estado) => {
      window.dispatchEvent(new CustomEvent('devbrain:evidencia', {
        detail: { id: artefacto.id, estado, actualizadoEn: registro.updatedAt },
      }));
    };
  
    const alCambiar = (clave, valor) => {
      registro = store.guardar(artefacto.id, { values: { [clave]: valor } });
      const estado = pintarEstado();
      avisoGuardado.textContent = 'Guardado en este navegador.';
      emitir(estado);
    };
  
    const alMarcar = (clave, valor) => {
      registro = store.guardar(artefacto.id, { checks: { [clave]: valor } });
      const estado = pintarEstado();
      emitir(estado);
    };
  
    const alRegistrarIa = (entrada) => {
      store.registrarUsoIa(entrada);
      emitir(dbeCalcularEstado(artefacto, registro));
    };
  
    const textoMarkdown = () => dbeEvidenciaAMarkdown(artefacto, registro, dbeCalcularEstado(artefacto, registro));
  
    const botonCopiar = dbeEl('button', { clase: 'dbe-boton', texto: 'Copiar en Markdown', attrs: { type: 'button' } });
    botonCopiar.addEventListener('click', () => dbeCopiar(textoMarkdown(), botonCopiar));
  
    const botonDescargar = dbeEl('button', { clase: 'dbe-boton', texto: `Descargar ${artefacto.upload.fileName}`, attrs: { type: 'button' } });
    botonDescargar.addEventListener('click', () => dbeDescargar(textoMarkdown(), artefacto.upload.fileName));
  
    const botonLimpiar = dbeEl('button', { clase: 'dbe-boton dbe-boton--riesgo', texto: 'Vaciar esta evidencia', attrs: { type: 'button' } });
    botonLimpiar.addEventListener('click', () => {
      const seguro = window.confirm(`Se borrará lo escrito en ${artefacto.code} en este navegador. ¿Continuar?`);
      if (!seguro) return;
      store.borrar(artefacto.id);
      registro = store.leer(artefacto.id);
      contenedor.replaceChildren();
      dbeMontarEstacion(contenedor, artefacto, store, opciones);
    });
  
    const cabecera = dbeEl('header', {
      clase: 'dbe-estacion__cabecera',
      hijos: [
        dbeEl('div', {
          clase: 'dbe-estacion__meta',
          hijos: [
            dbeEl('span', { clase: 'dbe-chip dbe-chip--orden', texto: total ? `Evidencia ${artefacto.station.order} de ${total}` : `Evidencia ${artefacto.station.order}` }),
            dbeEl('span', { clase: 'dbe-chip', texto: dbeEtiquetaTipo(artefacto.evidenceType) }),
            artefacto.station.minutes ? dbeEl('span', { clase: 'dbe-chip', texto: `≈ ${artefacto.station.minutes} min` }) : null,
            chipEstado,
          ],
        }),
        dbeEl('h3', { clase: 'dbe-estacion__titulo', texto: `${artefacto.code} · ${artefacto.name}` }),
        artefacto.purpose ? dbeEl('p', { clase: 'dbe-estacion__proposito', texto: artefacto.purpose }) : null,
      ],
    });
  
    const pie = dbeEl('footer', {
      clase: 'dbe-estacion__pie',
      hijos: [
        dbeEl('dl', {
          clase: 'dbe-definiciones',
          hijos: [
            artefacto.criterion ? dbeEl('div', { hijos: [dbeEl('dt', { texto: 'Criterio observable' }), dbeEl('dd', { texto: artefacto.criterion })] }) : null,
            artefacto.instrument ? dbeEl('div', { hijos: [dbeEl('dt', { texto: 'Instrumento' }), dbeEl('dd', { texto: artefacto.instrument })] }) : null,
            artefacto.evidence ? dbeEl('div', { hijos: [dbeEl('dt', { texto: 'Qué se entrega' }), dbeEl('dd', { texto: artefacto.evidence })] }) : null,
            artefacto.nextStep ? dbeEl('div', { hijos: [dbeEl('dt', { texto: 'Alimenta a' }), dbeEl('dd', { texto: artefacto.nextStep })] }) : null,
          ],
        }),
        dbeEl('div', { clase: 'dbe-acciones', hijos: [botonCopiar, botonDescargar, botonLimpiar] }),
        avisoGuardado,
        opciones.dossierHref
          ? dbeEl('p', {
            clase: 'dbe-estacion__enlace',
            hijos: [
              document.createTextNode('Esta evidencia se suma sola al '),
              dbeEl('a', { texto: 'paquete final', attrs: { href: opciones.dossierHref } }),
              document.createTextNode('. No tendrás que rehacerla al cerrar la guía.'),
            ],
          })
          : null,
      ],
    });
  
    const tarjeta = dbeEl('section', {
      clase: 'dbe-estacion',
      attrs: { 'aria-labelledby': `dbe-titulo-${artefacto.id}` },
      hijos: [
        cabecera,
        dbeFichas('Necesitas tener a mano', artefacto.inputs),
        dbeBloque('Cómo se construye', artefacto.instructions),
        dbeBloque('Así se ve un resultado correcto', artefacto.example, 'dbe-bloque--ejemplo'),
        dbePanelIa(artefacto, alRegistrarIa),
        dbeFormulario(artefacto, registro, alCambiar),
        dbeAutochequeo(artefacto, registro, alMarcar),
        pie,
      ],
    });
  
    cabecera.querySelector('.dbe-estacion__titulo').id = `dbe-titulo-${artefacto.id}`;
    contenedor.replaceChildren(tarjeta);
    contenedor.setAttribute('data-db-evidence-mounted', 'true');
    dbeSeguirTema(tarjeta);
    pintarEstado();
  
    return {
      refrescar() {
        registro = store.leer(artefacto.id);
        pintarEstado();
      },
    };
  }
  

  /* --- evidence/dossier-sheet.js --- */
  /**
   * Componente imprimible de trabajo para el registro local de evidencias.
   *
   * Renderiza una ficha de trabajo con los datos declarados por el aprendiz,
   * datos generales del aprendiz, registro de evidencias con instrumentos y resultados,
   * y una auto-revisión que queda pendiente de la valoración aplicable.
   */
  
  
  /**
   * Deduce o extrae criterios de rúbrica a partir del registro de la guía.
   * @param {Object} registro
   * @param {Array<Object>} filas
   * @returns {Array<{criterio: string, observacion: string}>}
   */
  function dbeObtenerCriteriosRubrica(registro, filas) {
    const mapa = (registro.submission && registro.submission.competencyMap) || [];
    if (mapa.length) {
      return mapa.map((c) => ({
        criterio: c.criterion || 'Aplica los estándares y buenas prácticas técnicas del programa ADSO.',
        observacion: `Alineado con ${c.evidenceType ? 'evidencia de ' + c.evidenceType : 'requisitos formativos'}.`
      }));
    }
  
    const criterios = [];
    filas.forEach((f) => {
      if (f.artefacto.criterion && !criterios.some((c) => c.criterio === f.artefacto.criterion)) {
        criterios.push({
          criterio: f.artefacto.criterion,
          observacion: `Por revisar mediante ${f.artefacto.instrument || 'instrumento de evaluación'}.`
        });
      }
    });
  
    if (!criterios.length) {
      criterios.push({
        criterio: 'Construye la solución de software cumpliendo con los estándares de arquitectura y buenas prácticas técnicas.',
        observacion: 'Demuestra dominio de los conceptos y herramientas del programa formativo.'
      });
    }
  
    return criterios;
  }
  
  /**
   * Construye una hoja imprimible de trabajo para la guía.
   * @param {Object} params
   * @param {Object} params.registro
   * @param {Array<Object>} params.filas
   * @param {number} params.listas
   * @param {Object} params.apprenticeData
   * @param {HTMLElement} [params.nodoBitacora]
   * @returns {HTMLElement}
   */
  function dbeConstruirHojaSena({ registro, filas, listas, apprenticeData, nodoBitacora }) {
    let tituloDossier = (registro.submission && (registro.submission.packageName || registro.submission.title)) || registro.title || registro.guideId || 'FORMACIÓN PROFESIONAL';
    tituloDossier = String(tituloDossier).replace(/dossier(\s+oficial)?(\s+de)?/gi, '').replace(/\s+/g, ' ').trim();
    const estadoTexto = listas === filas.length ? 'EVIDENCIA CONSOLIDADA' : (listas > 0 ? 'EN PROCESO' : 'EN DESARROLLO');
  
    // Cabecera institucional
    const cabecera = dbeEl('header', {
      clase: 'dossier-header',
      hijos: [
        dbeEl('div', {
          clase: 'dossier-logo',
          hijos: [
            dbeEl('div', { clase: 'sena-shield', texto: 'SENA' }),
            dbeEl('div', {
              hijos: [
                dbeEl('h2', { texto: 'ADAPTACIÓN DIDÁCTICA · FORMACIÓN ADSO' }),
                dbeEl('p', { texto: 'Contexto de referencia SENA · Tecnólogo en Análisis y Desarrollo de Software (ADSO)' }),
                dbeEl('p', { hijos: [dbeEl('strong', { texto: `REGISTRO INTEGRAL DE EVIDENCIAS: ${tituloDossier.toUpperCase()}` })] })
              ]
            })
          ]
        }),
        dbeEl('div', {
          clase: 'dossier-meta-box',
          hijos: [
            dbeEl('p', { hijos: [dbeEl('strong', { texto: 'Ficha: ' }), dbeEl('span', { attrs: { id: 'disp-ficha' }, texto: apprenticeData.ficha })] }),
            dbeEl('p', { hijos: [dbeEl('strong', { texto: 'Fecha de Emisión: ' }), dbeEl('span', { attrs: { id: 'disp-date' }, texto: apprenticeData.date })] }),
            dbeEl('p', { hijos: [dbeEl('strong', { texto: 'Estado: ' }), dbeEl('span', { clase: 'badge badge--success', texto: estadoTexto })] })
          ]
        })
      ]
    });
  
    // Sección 1: Datos Generales
    const seccion1 = dbeEl('section', {
      clase: 'dossier-section',
      hijos: [
        dbeEl('h4', { clase: 'dossier-subtitle', texto: '1. Datos Generales del Aprendiz' }),
        dbeEl('table', {
          clase: 'dossier-table',
          hijos: [
            dbeEl('tbody', {
              hijos: [
                dbeEl('tr', {
                  hijos: [
                    dbeEl('td', { hijos: [dbeEl('strong', { texto: 'Nombre:' })] }),
                    dbeEl('td', { attrs: { id: 'disp-name' }, texto: apprenticeData.name }),
                    dbeEl('td', { hijos: [dbeEl('strong', { texto: 'Documento:' })] }),
                    dbeEl('td', { attrs: { id: 'disp-doc' }, texto: apprenticeData.docNumber })
                  ]
                }),
                dbeEl('tr', {
                  hijos: [
                    dbeEl('td', { hijos: [dbeEl('strong', { texto: 'Centro de Formación:' })] }),
                    dbeEl('td', { attrs: { id: 'disp-centro' }, texto: apprenticeData.centro }),
                    dbeEl('td', { hijos: [dbeEl('strong', { texto: 'Regional:' })] }),
                    dbeEl('td', { attrs: { id: 'disp-regional' }, texto: apprenticeData.regional })
                  ]
                }),
                dbeEl('tr', {
                  hijos: [
                    dbeEl('td', { hijos: [dbeEl('strong', { texto: 'Instructor Técnico:' })] }),
                    dbeEl('td', { attrs: { id: 'disp-instructor', colspan: '3' }, texto: apprenticeData.instructor })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
  
    // Sección 2: Registro de Evidencias Técnicas Realizadas
    const seccion2 = dbeEl('section', {
      clase: 'dossier-section',
      hijos: [
        dbeEl('h4', { clase: 'dossier-subtitle', texto: '2. Registro de Evidencias Técnicas Realizadas' }),
        dbeEl('table', {
          clase: 'dossier-table',
          hijos: [
            dbeEl('thead', {
              hijos: [
                dbeEl('tr', {
                  hijos: [
                    dbeEl('th', { texto: 'Código' }),
                    dbeEl('th', { texto: 'Denominación de la Evidencia' }),
                    dbeEl('th', { texto: 'Instrumento de Evaluación' }),
                    dbeEl('th', { texto: 'Resultado' })
                  ]
                })
              ]
            }),
            dbeEl('tbody', {
              hijos: filas.map((fila, index) => {
                const esCumplido = fila.estado === 'lista';
                const resultadoTexto = esCumplido ? 'CUMPLIDO' : (fila.estado === 'borrador' ? 'EN BORRADOR' : 'PENDIENTE');
                const resultadoBadge = esCumplido ? 'badge badge--success' : (fila.estado === 'borrador' ? 'badge badge--warning' : 'badge badge--pending');
                const codigo = fila.artefacto.code || `EV-${String(index + 1).padStart(2, '0')}`;
                return dbeEl('tr', {
                  hijos: [
                    dbeEl('td', { hijos: [dbeEl('strong', { texto: codigo })] }),
                    dbeEl('td', { texto: fila.artefacto.name }),
                    dbeEl('td', { texto: fila.artefacto.instrument || 'Rúbrica de Cumplimiento Técnico' }),
                    dbeEl('td', { hijos: [dbeEl('span', { clase: resultadoBadge, texto: resultadoTexto })] })
                  ]
                });
              })
            })
          ]
        })
      ]
    });
  
    // Sección 3: Criterios de trabajo y auto-revisión
    const criterios = dbeObtenerCriteriosRubrica(registro, filas);
    const seccion3 = dbeEl('section', {
      clase: 'dossier-section',
      hijos: [
        dbeEl('h4', { clase: 'dossier-subtitle', texto: '3. Criterios de trabajo y auto-revisión' }),
        dbeEl('table', {
          clase: 'dossier-table',
          hijos: [
            dbeEl('thead', {
              hijos: [
                dbeEl('tr', {
                  hijos: [
                    dbeEl('th', { texto: 'Criterio de trabajo' }),
                    dbeEl('th', { texto: 'Auto-revisión' }),
                    dbeEl('th', { texto: 'Observaciones' })
                  ]
                })
              ]
            }),
            dbeEl('tbody', {
              hijos: criterios.map((item) => dbeEl('tr', {
                hijos: [
                  dbeEl('td', { texto: item.criterio }),
                  dbeEl('td', { texto: 'Pendiente de auto-revisión' }),
                  dbeEl('td', { texto: item.observacion })
                ]
              }))
            })
          ]
        }),
        dbeEl('div', {
          clase: 'dossier-verdict-box',
          hijos: [
            dbeEl('p', { hijos: [dbeEl('strong', { texto: 'RESULTADO DE AUTO-REVISIÓN:' })] }),
            dbeEl('div', {
              clase: 'verdict-options',
              hijos: [
                dbeEl('label', { hijos: [dbeEl('input', { attrs: { type: 'radio', name: 'resultado_aprendizaje' } }), dbeEl('strong', { texto: ' LISTO PARA REVISIÓN' })] }),
                dbeEl('label', { hijos: [dbeEl('input', { attrs: { type: 'radio', name: 'resultado_aprendizaje' } }), dbeEl('strong', { texto: ' REQUIERE AJUSTES' })] })
              ]
            })
          ]
        }),
        dbeEl('div', {
          clase: 'dossier-signatures',
          hijos: [
            dbeEl('div', {
              clase: 'sig-line',
              hijos: [
                dbeEl('p', { clase: 'sig-rule', attrs: { 'aria-hidden': 'true' } }),
                dbeEl('p', { hijos: [dbeEl('strong', { texto: 'Firma del Aprendiz' })] }),
                dbeEl('p', { texto: `C.C. ${apprenticeData.docNumber}`, attrs: { id: 'sig-doc' } })
              ]
            }),
            dbeEl('div', {
              clase: 'sig-line',
              hijos: [
                dbeEl('p', { clase: 'sig-rule', attrs: { 'aria-hidden': 'true' } }),
                dbeEl('p', { hijos: [dbeEl('strong', { texto: 'Firma del instructor o acompañante, si aplica' })] }),
                dbeEl('p', { attrs: { id: 'sig-instructor' }, texto: apprenticeData.instructor })
              ]
            })
          ]
        })
      ]
    });
  
    const hijosHoja = [cabecera, seccion1, seccion2, seccion3];
  
    if (nodoBitacora) {
      hijosHoja.push(dbeEl('section', {
        clase: 'dossier-section no-print',
        hijos: [
          dbeEl('h4', { clase: 'dossier-subtitle', texto: '4. Bitácora Humano–IA (Protocolo V.E.R.A.)' }),
          nodoBitacora
        ]
      }));
    }
  
    return dbeEl('div', {
      clase: 'sena-dossier-sheet',
      attrs: { id: 'sena-dossier-sheet' },
      hijos: hijosHoja
    });
  }
  

  /* --- evidence/dossier.js --- */
  /**
   * Consolidación final del registro integral de evidencias (ADSO).
   *
   * Orquesta el registro local de evidencias al cierre de cada guía.
   * Coordina los datos de identificación, acciones de auto-revisión y la hoja de trabajo.
   */
  
  
  
  
  
  
  /**
   * Lee el perfil del aprendiz de localStorage sin inventar datos personales.
   * @param {string} prefijo
   * @returns {Object}
   */
  function dbeLeerPerfilAprendiz(prefijo) {
    const clave = `${prefijo || 'dbe'}_apprentice_profile`;
    const perfilInicial = {
      name: 'APRENDIZ ADSO',
      docNumber: '',
      ficha: '<NÚMERO_DE_FICHA>',
      centro: 'Por diligenciar',
      regional: 'Por diligenciar',
      instructor: 'Por diligenciar',
      date: new Date().toLocaleDateString('es-CO')
    };
    try {
      const guardado = localStorage.getItem(clave);
      if (guardado) {
        const perfil = JSON.parse(guardado);
        const camposDeEjemplo = {
          name: 'APRENDIZ SENA ADSO',
          docNumber: '1.020.345.678',
          ficha: '228118-ADSO',
          centro: 'Centro de Biotecnología Agropecuaria / CSF',
          regional: 'Regional Distrito Capital',
          instructor: 'INSTRUCTOR TÉCNICO SENA',
        };
        const camposCoincidentes = Object.keys(camposDeEjemplo)
          .filter((campo) => perfil && String(perfil[campo] || '').trim() === camposDeEjemplo[campo]);
        if (!camposCoincidentes.length) return perfil;
        const perfilLimpio = { ...perfil };
        camposCoincidentes.forEach((campo) => {
          perfilLimpio[campo] = perfilInicial[campo];
        });
        return perfilLimpio;
      }
    } catch (e) {}
    return perfilInicial;
  }
  
  /**
   * Guarda el perfil del aprendiz en localStorage.
   * @param {string} prefijo
   * @param {Object} datos
   */
  function dbeGuardarPerfilAprendiz(prefijo, datos) {
    const clave = `${prefijo || 'dbe'}_apprentice_profile`;
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
    } catch (e) {}
  }
  
  /**
   * Construye la barra de progreso de evidencias.
   * @param {number} listas
   * @param {number} total
   * @returns {HTMLElement}
   */
  function dbeBarraProgreso(listas, total) {
    const porcentaje = total ? Math.round((listas / total) * 100) : 0;
    const relleno = dbeEl('div', { clase: 'dbe-progreso__relleno' });
    relleno.style.width = `${porcentaje}%`;
    return dbeEl('div', {
      clase: 'dbe-progreso',
      hijos: [
        dbeEl('p', {
          clase: 'dbe-progreso__texto',
          texto: `${listas} de ${total} evidencias listas según el criterio declarado (${porcentaje} %).`,
          attrs: { role: 'status', 'aria-live': 'polite' },
        }),
        dbeEl('div', {
          clase: 'dbe-progreso__pista',
          attrs: { role: 'progressbar', 'aria-valuenow': porcentaje, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Evidencias listas' },
          hijos: [relleno],
        }),
      ],
    });
  }
  
  /**
   * Construye la vista de la bitácora humano–IA acumulada.
   * @param {Array<Object>} bitacora
   * @returns {HTMLElement}
   */
  function dbeVistaBitacora(bitacora) {
    if (!bitacora || !bitacora.length) {
      return dbeEl('p', {
        clase: 'dbe-bloque__texto',
        texto: 'Todavía no registraste uso de IA. Si trabajaste con un asistente y no lo declaras, la evidencia queda incompleta: en 2026 lo evaluable es qué pediste, qué verificaste y qué decidiste.',
      });
    }
    return dbeEl('ul', {
      clase: 'dbe-lista dbe-bitacora',
      hijos: bitacora.map((entrada) => dbeEl('li', {
        hijos: [
          dbeEl('strong', { texto: `${entrada.artifactId || 'general'} · ${entrada.tool || 'herramienta no declarada'}` }),
          dbeEl('p', { clase: 'dbe-bloque__texto', texto: `Verificación: ${entrada.verified || 'no declarada'}. Decisión: ${entrada.decision || 'no declarada'}.` }),
        ],
      })),
    });
  }
  
  /**
   * Crea un grupo de campo sim/input para el formulario.
   * @param {string} etiqueta
   * @param {string} id
   * @param {string} valor
   * @returns {HTMLElement}
   */
  function dbeCrearGrupoInput(etiqueta, id, valor) {
    return dbeEl('div', {
      clase: 'sim-form-group',
      hijos: [
        dbeEl('label', { clase: 'sim-label', texto: etiqueta, attrs: { for: id } }),
        dbeEl('input', {
          clase: 'sim-input',
          attrs: { type: 'text', id, value: valor || '' }
        })
      ]
    });
  }
  
  /**
   * Vincula los inputs del formulario con la vista imprimible y localStorage.
   * @param {HTMLElement} raiz
   * @param {Object} apprenticeData
   * @param {string} prefijo
   */
  function dbeVincularInputs(raiz, apprenticeData, prefijo) {
    const mapeo = [
      { id: 'ev-name', target: ['disp-name'], key: 'name' },
      { id: 'ev-doc', target: ['disp-doc', 'sig-doc'], key: 'docNumber', prefix: 'C.C. ' },
      { id: 'ev-ficha', target: ['disp-ficha'], key: 'ficha' },
      { id: 'ev-centro', target: ['disp-centro'], key: 'centro' },
      { id: 'ev-regional', target: ['disp-regional'], key: 'regional' },
      { id: 'ev-instructor', target: ['disp-instructor', 'sig-instructor'], key: 'instructor' }
    ];
  
    mapeo.forEach((item) => {
      const input = raiz.querySelector(`#${item.id}`);
      if (!input) return;
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        apprenticeData[item.key] = val;
        dbeGuardarPerfilAprendiz(prefijo, apprenticeData);
        item.target.forEach((targetId) => {
          const nodo = raiz.querySelector(`#${targetId}`);
          if (nodo) {
            nodo.textContent = item.prefix ? `${item.prefix}${val}` : val;
          }
        });
      });
    });
  }
  
  /**
   * Monta la sección de consolidación local de evidencias.
   *
   * @param {HTMLElement} contenedor - Nodo con `data-db-evidence-dossier`
   * @param {Object} registro - Registro normalizado de entregables
   * @param {Object} store - Instancia de DbeEvidenceStore
   * @returns {{refrescar: Function}}
   */
  function dbeMontarDossier(contenedor, registro, store) {
    const apprenticeData = dbeLeerPerfilAprendiz(store ? store.prefijo : '');
  
    const construirFilas = () => registro.artifacts.map((artefacto) => {
      const datos = store ? store.leer(artefacto.id) : {};
      return { artefacto, datos, estado: dbeCalcularEstado(artefacto, datos) };
    });
  
    const pintar = () => {
      const filas = construirFilas();
      const listas = filas.filter((fila) => fila.estado === 'lista').length;
      const bitacora = store ? store.leerBitacora() : [];
  
      // 1. Tarjeta de Formulario de Identificación (no-print)
      const formCard = dbeEl('div', {
        clase: 'evidence-form-card no-print',
        hijos: [
          dbeEl('h3', { clase: 'evidence-title', texto: '📋 Datos de identificación para el registro de evidencias' }),
          dbeEl('p', { clase: 'text-muted', texto: 'Diligencia estos datos solo si corresponde y revisa con el instructor el formato de entrega aplicable:' }),
          dbeEl('div', {
            clase: 'evidence-form-grid',
            hijos: [
              dbeCrearGrupoInput('Nombre Completo del Aprendiz:', 'ev-name', apprenticeData.name),
              dbeCrearGrupoInput('Documento de Identidad:', 'ev-doc', apprenticeData.docNumber),
              dbeCrearGrupoInput('Número de Ficha ADSO:', 'ev-ficha', apprenticeData.ficha),
              dbeCrearGrupoInput('Centro de Formación:', 'ev-centro', apprenticeData.centro),
              dbeCrearGrupoInput('Regional SENA:', 'ev-regional', apprenticeData.regional),
              dbeCrearGrupoInput('Nombre del Instructor Líder:', 'ev-instructor', apprenticeData.instructor),
            ]
          })
        ]
      });
  
      // 2. Acciones de exportación
      const botonImprimir = dbeEl('button', {
        clase: 'btn btn--primary',
        texto: '🖨️ Imprimir / Guardar en PDF',
        attrs: { type: 'button', id: 'btn-print-evidence' }
      });
      botonImprimir.addEventListener('click', () => { window.print(); });
  
      const botonDescargarJson = dbeEl('button', {
        clase: 'btn btn--secondary',
        texto: '💾 Descargar Evidencia en JSON',
        attrs: { type: 'button', id: 'btn-download-json' }
      });
      botonDescargarJson.addEventListener('click', () => {
        const payload = {
          apprentice: apprenticeData,
          guideId: registro.guideId,
          program: 'Tecnólogo en Análisis y Desarrollo de Software (ADSO) - Ficha ' + apprenticeData.ficha,
          competency: (registro.submission && registro.submission.packageName) || 'Desarrollo de Software ADSO',
          dossierStatus: listas === filas.length ? 'COMPLETED' : 'IN_PROGRESS',
          evaluationTimestamp: new Date().toISOString(),
          summary: { total: filas.length, completed: listas, pending: filas.length - listas },
          artifacts: filas.map((f) => ({
            id: f.artefacto.id,
            code: f.artefacto.code,
            name: f.artefacto.name,
            instrument: f.artefacto.instrument || 'Instrumento de evaluación aplicable',
            status: f.estado,
            criterion: f.artefacto.criterion || 'Criterio de trabajo declarado'
          })),
          aiLog: bitacora
        };
        dbeDescargar(JSON.stringify(payload, null, 2), `registro_evidencias_${apprenticeData.ficha}_${apprenticeData.docNumber}.json`, 'application/json');
      });
  
      const botonDescargarMd = dbeEl('button', {
        clase: 'btn btn--secondary',
        texto: '📄 Descargar Paquete (.md)',
        attrs: { type: 'button', id: 'btn-download-md' }
      });
      botonDescargarMd.addEventListener('click', () => {
        const md = dbePaqueteAMarkdown({ registro, filas, bitacora, identificacion: apprenticeData });
        dbeDescargar(md, `${registro.guideId || 'evidencias'}.md`);
      });
  
      const botonCopiarMd = dbeEl('button', {
        clase: 'btn btn--secondary',
        texto: '📋 Copiar Paquete',
        attrs: { type: 'button' }
      });
      botonCopiarMd.addEventListener('click', () => {
        const md = dbePaqueteAMarkdown({ registro, filas, bitacora, identificacion: apprenticeData });
        dbeCopiar(md, botonCopiarMd);
      });
  
      formCard.appendChild(dbeEl('div', {
        clase: 'evidence-actions-bar no-print',
        hijos: [botonImprimir, botonDescargarJson, botonDescargarMd, botonCopiarMd]
      }));
  
      // 3. Hoja imprimible de trabajo
      const dossierSheet = dbeConstruirHojaSena({
        registro,
        filas,
        listas,
        apprenticeData,
        nodoBitacora: dbeVistaBitacora(bitacora)
      });
  
      // 4. Bloque de pendientes / avisos
      const pendientes = filas.filter((fila) => fila.estado !== 'lista');
      const bloquePendientes = pendientes.length
        ? dbeEl('div', {
          clase: 'dbe-dossier__pendientes no-print',
          hijos: [
            dbeEl('h3', { clase: 'dbe-dossier__subtitulo', texto: `Te faltan ${pendientes.length} evidencias por completar` }),
            dbeEl('p', { clase: 'dbe-bloque__texto', texto: 'Cada enlace te devuelve a la estación donde se encuentra la teoría, el ejemplo y el formulario correspondiente:' }),
            dbeEl('ul', {
              clase: 'dbe-lista',
              hijos: pendientes.map((fila) => dbeEl('li', {
                hijos: [
                  dbeEl('a', {
                    texto: `${fila.artefacto.code} · ${fila.artefacto.name}`,
                    attrs: { href: fila.artefacto.station.sectionId ? `#${fila.artefacto.station.sectionId}` : '#' },
                  }),
                  document.createTextNode(` — ${dbeEtiquetaEstado(fila.estado).toLowerCase()}`),
                ],
              })),
            }),
          ],
        })
        : dbeEl('p', {
          clase: 'dbe-bloque__texto dbe-bloque--exito no-print',
            texto: 'Todas las evidencias declaradas están diligenciadas y contrastadas con su criterio. Imprime el registro o descarga el paquete JSON para revisarlo con el instructor.',
        });
  
      const tarjeta = dbeEl('div', {
        clase: 'dbe-dossier evidence-wrapper',
        hijos: [
          dbeEl('div', { clase: 'no-print', hijos: [dbeBarraProgreso(listas, filas.length), bloquePendientes] }),
          formCard,
          dossierSheet,
          dbeEl('p', {
            clase: 'dbe-dossier__limite no-print',
              texto: 'Este registro se calcula en tu navegador a partir del avance guardado localmente. La valoración final la realiza el instructor mediante los instrumentos institucionales aplicables.',
          })
        ]
      });
  
      contenedor.replaceChildren(tarjeta);
      dbeSeguirTema(tarjeta);
      dbeVincularInputs(tarjeta, apprenticeData, store ? store.prefijo : '');
    };
  
    pintar();
    if (store) {
      store.suscribir(() => pintar());
    }
    return { refrescar: pintar };
  }
  
  /**
   * Monta un indicador compacto de progreso reutilizable en cualquier punto.
   * @param {HTMLElement} contenedor
   * @param {Object} registro
   * @param {Object} store
   */
  function dbeMontarProgreso(contenedor, registro, store) {
    const pintar = () => {
      const listas = registro.artifacts.filter((artefacto) => dbeCalcularEstado(artefacto, store ? store.leer(artefacto.id) : {}) === 'lista').length;
      const tarjeta = dbeEl('div', { clase: 'dbe-dossier dbe-dossier--compacto', hijos: [dbeBarraProgreso(listas, registro.artifacts.length)] });
      contenedor.replaceChildren(tarjeta);
      dbeSeguirTema(tarjeta);
    };
    pintar();
    if (store) {
      store.suscribir(() => pintar());
    }
  }
  

  /* --- evidence/index.js --- */
  /**
   * Módulo de evidencias distribuidas.
   *
   * Una guía lo usa así:
   *
   *   <section id="sipoc"> … teoría, ejemplo, ejercicio …
   *     <div data-db-evidence="G1-A03"></div>
   *   </section>
   *   …
   *   <section id="cierre">
   *     <div data-db-evidence-dossier></div>
   *   </section>
   *
   *   <script>
   *     DevBrainEvidence.montar({ registro: registroDeEntregables, prefijo: 'devbrain_guia1' });
   *   </script>
   *
   * El registro puede pasarse como objeto ya cargado o como ruta a
   * `deliverables.registry.json`. Abrir la guía con `file://` bloquea `fetch`, así
   * que una guía que deba funcionar desde un USB debe incrustar el objeto.
   */
  
  
  
  
  
  /**
   * Resuelve el registro cuando llega como ruta.
   * @param {Object|string} origen
   * @returns {Promise<Object>}
   */
  async function dbeResolverRegistro(origen) {
    if (!origen) throw new Error('DevBrainEvidence: falta el registro de entregables.');
    if (typeof origen === 'object') return origen;
    const respuesta = await fetch(String(origen), { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(`DevBrainEvidence: no se pudo leer ${origen} (${respuesta.status}).`);
    return respuesta.json();
  }
  
  /**
   * Avisa en la propia página cuando el registro declara una evidencia que
   * ninguna sección pide.
   *
   * Es el fallo que este módulo existe para impedir, así que se muestra en la
   * página y no solo en la consola: una evidencia sin estación vuelve a ser una
   * factura al final del recorrido.
   *
   * @param {Array<Object>} huerfanos
   */
  function dbeAvisarHuerfanos(huerfanos) {
    if (!huerfanos.length) return;
    const ids = huerfanos.map((artefacto) => artefacto.id).join(', ');
    console.warn(`DevBrainEvidence: sin punto de montaje para ${ids}. Añade data-db-evidence="<id>" en la sección donde se produce.`);
  }
  
  /**
   * Monta las estaciones y la consolidación declaradas en el documento.
   *
   * @param {Object} opciones
   * @param {Object|string} opciones.registro - Objeto del registro o ruta al JSON
   * @param {string} [opciones.prefijo] - Prefijo de almacenamiento por guía
   * @param {Document|HTMLElement} [opciones.raiz] - Ámbito de búsqueda
   * @param {string} [opciones.dossierHref] - Ancla de la sección de consolidación
   * @returns {Promise<Object>} Estado montado
   */
  async function dbeMontar(opciones = {}) {
    const bruto = await dbeResolverRegistro(opciones.registro);
    const registro = dbeNormalizarRegistro(bruto);
    const raiz = opciones.raiz || document;
    const prefijo = opciones.prefijo || `devbrain_${registro.guideId || 'guia'}`;
    const store = new DbeEvidenceStore(prefijo);
  
    const montadas = [];
    const huerfanos = [];
  
    registro.artifacts.forEach((artefacto) => {
      const contenedor = raiz.querySelector(`[data-db-evidence="${artefacto.id}"]`);
      if (!contenedor) {
        huerfanos.push(artefacto);
        return;
      }
      montadas.push(dbeMontarEstacion(contenedor, artefacto, store, {
        total: registro.artifacts.length,
        dossierHref: opciones.dossierHref || '#cierre',
      }));
    });
  
    dbeAvisarHuerfanos(huerfanos);
  
    const nodoDossier = raiz.querySelector('[data-db-evidence-dossier]');
    const portafolio = nodoDossier ? dbeMontarDossier(nodoDossier, registro, store) : null;
    if (!nodoDossier) {
      console.warn('DevBrainEvidence: la guía no declara [data-db-evidence-dossier]; no hay consolidación final.');
    }
  
    raiz.querySelectorAll('[data-db-evidence-progress]').forEach((nodo) => {
      dbeMontarProgreso(nodo, registro, store);
    });
  
    return {
      registro,
      store,
      estaciones: montadas,
      dossier: portafolio,
      huerfanos: huerfanos.map((artefacto) => artefacto.id),
      /**
       * Devuelve el resumen de estados, útil para gamificación o pruebas.
       * @returns {{listas: number, total: number, detalle: Array}}
       */
      resumen() {
        const detalle = registro.artifacts.map((artefacto) => ({
          id: artefacto.id,
          estado: dbeCalcularEstado(artefacto, store.leer(artefacto.id)),
        }));
        return {
          listas: detalle.filter((fila) => fila.estado === 'lista').length,
          total: detalle.length,
          detalle,
        };
      },
    };
  }
  
  /**
   * Interfaz pública del módulo.
   */
  const evidence = {
    montar: dbeMontar,
    normalizarRegistro: dbeNormalizarRegistro,
    agruparPorSeccion: dbeAgruparPorSeccion,
    Store: DbeEvidenceStore,
    calcularEstado: dbeCalcularEstado,
  };
  


  // SDK API
  const DevBrainSDK = {
    QuizPlugin,
    DebugPlugin,
    code,
    evidence,
    reader,
    createApp: function(options = {}) {
      const storagePrefix = options.storagePrefix || 'devbrain_sdk';
      const storage = new StorageAdapter(storagePrefix);
      const events = new EventBus();
      const config = new ConfigLoader(options);
      
      const gamification = createGamification(storage, events, options.levels);
      
      const navigation = createNavigation(storage, events, {
        container: options.routerContainer,
        sidebarContainer: options.sidebarContainer,
        modules: options.modules || []
      });
      
      const builders = createBuilders(storage, events);
      
      const simulators = createSimulators(events, gamification);
      
      return {
        storage,
        events,
        config,
        gamification,
        navigation,
        builders,
        simulators
      };
    }
  };
  
  global.DevBrainSDK = DevBrainSDK;
})(window);
