const { expect } = require('chai');
const { LIMITES, evaluarLectura } = require('../src/reglas');

describe('Etapa 1 · Reglas en JavaScript', () => {
  it('aprueba una lectura dentro de los límites del ejercicio', () => {
    expect(evaluarLectura({ temperatura: 3.5, acidez: 16 })).to.deep.equal({ aprobada: true, motivos: [] });
  });

  it('acepta los valores exactos de los límites', () => {
    const resultado = evaluarLectura({ temperatura: LIMITES.temperaturaMaxima, acidez: LIMITES.acidezMinima });
    expect(resultado.aprobada).to.equal(true);
    expect(evaluarLectura({ temperatura: 0, acidez: LIMITES.acidezMaxima }).aprobada).to.equal(true);
  });

  it('rechaza una temperatura alta y explica el motivo', () => {
    const resultado = evaluarLectura({ temperatura: 9, acidez: 16 });
    expect(resultado.aprobada).to.equal(false);
    expect(resultado.motivos).to.deep.equal(['Temperatura 9 °C supera el máximo de 4 °C.']);
  });

  it('rechaza una acidez fuera de rango por debajo y por encima', () => {
    expect(evaluarLectura({ temperatura: 3, acidez: 13.9 }).motivos).to.deep.equal(['Acidez 13.9 fuera del rango 14–18.']);
    expect(evaluarLectura({ temperatura: 3, acidez: 18.1 }).aprobada).to.equal(false);
  });

  it('acumula todos los motivos cuando fallan ambas reglas', () => {
    expect(evaluarLectura({ temperatura: 4.1, acidez: 20 }).motivos).to.have.length(2);
  });

  it('rechaza entradas que no son lecturas válidas', () => {
    expect(() => evaluarLectura(null)).to.throw(TypeError, 'objeto');
    expect(() => evaluarLectura({ temperatura: '3', acidez: 16 })).to.throw(TypeError, 'temperatura');
    expect(() => evaluarLectura({ temperatura: 3, acidez: Number.NaN })).to.throw(TypeError, 'acidez');
  });
});
