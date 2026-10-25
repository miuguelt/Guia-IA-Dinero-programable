// Etapa 0: comprueba que el equipo tiene lo necesario para el taller.
const VERSION_MINIMA = 24;
const PAQUETES = ['hardhat', 'ethers', 'solc'];

function verificarEntorno({ version = process.version, resolver = require.resolve } = {}) {
  const mayor = Number(version.replace(/^v/, '').split('.')[0]);
  const resultados = [{ nombre: `Node.js ${VERSION_MINIMA} o superior`, ok: mayor >= VERSION_MINIMA, detalle: version }];
  for (const paquete of PAQUETES) {
    try {
      resolver(paquete);
      resultados.push({ nombre: `Paquete ${paquete}`, ok: true, detalle: 'instalado' });
    } catch {
      resultados.push({ nombre: `Paquete ${paquete}`, ok: false, detalle: 'falta; ejecuta npm install' });
    }
  }
  return resultados;
}

function main({ verificar = verificarEntorno, log = console.log } = {}) {
  const resultados = verificar();
  for (const r of resultados) log(`${r.ok ? 'OK   ' : 'FALTA'} ${r.nombre} (${r.detalle})`);
  const listo = resultados.every(r => r.ok);
  log(listo ? 'Entorno listo. Continúa con la etapa 1.' : 'Corrige lo marcado como FALTA y vuelve a ejecutar npm run verificar.');
  process.exitCode = listo ? 0 : 1;
  return listo;
}

if (require.main === module) main();

module.exports = { VERSION_MINIMA, verificarEntorno, main };
