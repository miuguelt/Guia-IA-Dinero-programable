/* DevBrain · estaciones de evidencia para guías. Generado por bundle.cjs. */
(function (global) {
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
          observacion: `Verificado mediante ${f.artefacto.instrument || 'instrumento de evaluación'}.`
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
                  dbeEl('td', { texto: '[ X ] SÍ   [   ] NO' }),
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
                dbeEl('label', { hijos: [dbeEl('input', { attrs: { type: 'radio', name: 'resultado_aprendizaje', checked: true } }), dbeEl('strong', { texto: ' LISTO PARA REVISIÓN' })] }),
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
                dbeEl('p', { texto: '_________________________________________' }),
                dbeEl('p', { hijos: [dbeEl('strong', { texto: 'Firma del Aprendiz' })] }),
                dbeEl('p', { texto: `C.C. ${apprenticeData.docNumber}`, attrs: { id: 'sig-doc' } })
              ]
            }),
            dbeEl('div', {
              clase: 'sig-line',
              hijos: [
                dbeEl('p', { texto: '_________________________________________' }),
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
  

  global.DevBrainEvidence = evidence;
})(window);
