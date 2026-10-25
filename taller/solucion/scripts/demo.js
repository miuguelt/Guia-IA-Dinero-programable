// Etapa 6: ejecuta el recorrido completo y guarda un resumen para el Portafolio.
// Uso: npm run demo
const fs = require('node:fs');
const path = require('node:path');
const { recorrerFlujo, resumenMarkdown } = require('../src/recorrido');

const LECTURA_DE_PRACTICA = { idLote: 1, temperatura: 3.5, acidez: 16, nonce: 'demo-1' };

async function main({ ethers = require('hardhat').ethers, destino = path.join(process.cwd(), 'evidencia-taller.md'), log = console.log } = {}) {
  const resultado = await recorrerFlujo({ ethers, lectura: LECTURA_DE_PRACTICA });
  const resumen = resumenMarkdown(resultado);
  fs.writeFileSync(destino, resumen, 'utf8');
  log(resumen);
  log(`Resumen guardado en ${destino}`);
  return resultado;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { LECTURA_DE_PRACTICA, main };
