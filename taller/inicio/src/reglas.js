// Etapa 1: reglas de negocio puras escritas en JavaScript desacoplado.
// Los límites son didácticos; demuestran cómo aislar la lógica determinista
// antes de vincularla con firmas digitales o contratos inteligentes.
const LIMITES = Object.freeze({
  temperaturaMaxima: 4,
  acidezMinima: 14,
  acidezMaxima: 18,
});

/**
 * Valida que un campo numérico exista y sea finito.
 * Las reglas puras deben ser estrictas ante entradas malformadas.
 */
function comprobarNumero(valor, nombre) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new TypeError(`La lectura necesita ${nombre} como número.`);
  }
}

/**
 * Evalúa una lectura de lote y produce un dictamen explicable.
 * @param {Object} lectura Datos de la medición (temperatura, acidez, etc.).
 * @returns {{ aprobada: boolean, motivos: string[] }}
 */
function evaluarLectura(lectura) {
  if (!lectura || typeof lectura !== 'object') {
    throw new TypeError('La lectura debe ser un objeto con temperatura y acidez.');
  }
  comprobarNumero(lectura.temperatura, 'temperatura');
  comprobarNumero(lectura.acidez, 'acidez');

  const motivos = [];

  // Regla 1: Cadena de frío (temperatura máxima permitida)
  if (lectura.temperatura > LIMITES.temperaturaMaxima) {
    motivos.push(`Temperatura ${lectura.temperatura} °C supera el máximo de ${LIMITES.temperaturaMaxima} °C.`);
  }

  // Regla 2: Estándar de calidad química (acidez dentro de rango)
  if (lectura.acidez < LIMITES.acidezMinima || lectura.acidez > LIMITES.acidezMaxima) {
    motivos.push(`Acidez ${lectura.acidez} fuera del rango ${LIMITES.acidezMinima}–${LIMITES.acidezMaxima}.`);
  }

  // Dictamen explicable: devuelve el resultado booleano y la lista detallada de causas
  return { aprobada: motivos.length === 0, motivos };
}

module.exports = { LIMITES, evaluarLectura };
