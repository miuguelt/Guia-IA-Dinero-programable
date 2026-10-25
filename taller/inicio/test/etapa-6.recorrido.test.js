const { expect } = require('chai');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ethers } = require('hardhat');
const { recorrerFlujo, resumenMarkdown } = require('../src/recorrido');
const { main } = require('../scripts/demo');
const { inspeccionarEstado } = require('../scripts/inspeccionar-estado');

describe('Etapa 6 · Recorrido completo', () => {
  it('lleva una lectura aprobada hasta el pago y la proyección', async () => {
    const resultado = await recorrerFlujo({ ethers, lectura: { idLote: 10, temperatura: 3, acidez: 15, nonce: 'r-10' } });
    expect(resultado.dictamen).to.deep.equal({ aprobada: true, motivos: [] });
    expect(resultado.autorizacion).to.match(/^0x[0-9a-f]{64}$/);
    expect(resultado.retiro).to.match(/^0x[0-9a-f]{64}$/);
    expect(resultado.sincronizacion).to.deep.equal({ leidos: 3, nuevos: 3 });
    expect(resultado.eventos.map(e => e.tipo)).to.deep.equal(['GarantiaDepositada', 'PagoAutorizado', 'PagoRetirado']);
  });

  it('detiene el recorrido cuando la lectura no cumple', async () => {
    const resultado = await recorrerFlujo({ ethers, lectura: { idLote: 11, temperatura: 8, acidez: 15, nonce: 'r-11' } });
    expect(resultado.dictamen.aprobada).to.equal(false);
    expect(resultado.autorizacion).to.equal(null);
    expect(resultado.retiro).to.equal(null);
    expect(resultado.eventos.map(e => e.tipo)).to.deep.equal(['GarantiaDepositada']);
    expect(resumenMarkdown(resultado)).to.include('- Dictamen: rechazada\n  - Temperatura 8 °C supera el máximo de 4 °C.');
  });

  it('el script de demostración guarda el resumen para el Portafolio', async () => {
    const destino = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'taller-')), 'evidencia-taller.md');
    const lineas = [];
    const resultado = await main({ ethers, destino, log: l => lineas.push(l) });
    const texto = fs.readFileSync(destino, 'utf8');
    expect(texto).to.include('# Evidencia del taller AgroPay');
    expect(texto).to.include(`- Contrato: \`${resultado.contrato}\``);
    expect(texto).to.include('| PagoRetirado |');
    expect(lineas.at(-1)).to.equal(`Resumen guardado en ${destino}`);
  });

  it('el script de inspección de almacenamiento en tres capas se ejecuta correctamente', async () => {
    const logs = [];
    const inspeccion = await inspeccionarEstado({ log: msg => logs.push(msg) });
    expect(inspeccion.contrato).to.match(/^0x[0-9a-fA-F]{40}$/);
    expect(inspeccion.eventos).to.have.lengthOf(3);
    expect(logs.some(l => l.includes('CAPA 1: EVM STORAGE'))).to.be.true;
    expect(logs.some(l => l.includes('CAPA 2: BITÁCORA DE EVENTOS'))).to.be.true;
    expect(logs.some(l => l.includes('CAPA 3: PROYECCIÓN EN BASE DE DATOS'))).to.be.true;
  });
});
