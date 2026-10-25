const { expect } = require('chai');
const { verificarEntorno, main } = require('../scripts/verificar-entorno.cjs');

describe('Etapa 0 · Entorno', () => {
  it('acepta Node.js 24 y los paquetes instalados', () => {
    const resultados = verificarEntorno({ version: 'v24.1.0', resolver: () => 'ok' });
    expect(resultados.every(r => r.ok)).to.equal(true);
    expect(resultados.map(r => r.nombre)).to.include('Paquete hardhat');
  });

  it('señala una versión antigua de Node.js y un paquete faltante', () => {
    const resultados = verificarEntorno({
      version: 'v20.11.0',
      resolver: paquete => { if (paquete === 'solc') throw new Error('no instalado'); },
    });
    expect(resultados[0]).to.include({ ok: false, detalle: 'v20.11.0' });
    expect(resultados.find(r => r.nombre === 'Paquete solc')).to.include({ ok: false });
  });

  it('el equipo actual cumple los requisitos', () => {
    expect(verificarEntorno().every(r => r.ok)).to.equal(true);
  });

  it('informa el resultado y fija el código de salida', () => {
    const lineas = [];
    const anterior = process.exitCode;
    try {
      expect(main({ verificar: () => [{ nombre: 'Prueba', ok: false, detalle: 'x' }], log: l => lineas.push(l) })).to.equal(false);
      expect(process.exitCode).to.equal(1);
      expect(lineas[0]).to.equal('FALTA Prueba (x)');
      expect(main({ log: l => lineas.push(l) })).to.equal(true);
      expect(lineas.at(-1)).to.equal('Entorno listo. Continúa con la etapa 1.');
    } finally {
      process.exitCode = anterior;
    }
  });
});
