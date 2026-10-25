// Pruebas analíticas de exploración:
// Demuestra cómo inspeccionar comportamientos de frontera en las reglas y el contrato.
const { expect } = require('chai');
const { evaluarLectura, LIMITES } = require('../src/reglas');

describe('Mis pruebas · Análisis de frontera', () => {
  it('una lectura con temperatura negativa y acidez válida se aprueba (cadena de frío preservada)', () => {
    // Caso de frontera: temperaturas bajo cero cumplen el criterio de refrigeración (< 4 °C)
    const dictamen = evaluarLectura({ temperatura: -1.5, acidez: 16 });
    expect(dictamen.aprobada).to.equal(true);
    expect(dictamen.motivos).to.have.lengthOf(0);
  });

  it('los límites exactos del ejercicio son aceptados sin error', () => {
    // Casos de frontera en valores exactos de los límites
    const limiteSuperior = evaluarLectura({ temperatura: LIMITES.temperaturaMaxima, acidez: LIMITES.acidezMaxima });
    expect(limiteSuperior.aprobada).to.equal(true);

    const limiteInferior = evaluarLectura({ temperatura: 0, acidez: LIMITES.acidezMinima });
    expect(limiteInferior.aprobada).to.equal(true);
  });
});
