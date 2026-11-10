// Despliega RegistroProductos y escribe despliegue.json con lo que la API y la interfaz
// necesitan para encontrarlo: red (chainId), dirección, bloque de despliegue y ABI.
const fs = require('node:fs');
const path = require('node:path');

/**
 * El despliegue local cambia cada vez que reinicias el nodo: va a despliegue.json y no se versiona.
 * El de la red remota es estable y público (dirección y ABI): va a despliegue.remota.json y sí se versiona,
 * porque la aplicación publicada lo necesita para encontrar el contrato.
 */
function archivoDespliegue(nombreRed) {
  return path.join(__dirname, '..', nombreRed === 'remota' ? 'despliegue.remota.json' : 'despliegue.json');
}

async function desplegar({ hre = require('hardhat'), destino = archivoDespliegue(hre.network.name) } = {}) {
  const fabrica = await hre.ethers.getContractFactory('RegistroProductos');
  const contrato = await fabrica.deploy();
  const recibo = await contrato.deploymentTransaction().wait();
  const { chainId } = await hre.ethers.provider.getNetwork();
  const despliegue = {
    chainId: Number(chainId),
    direccion: await contrato.getAddress(),
    bloque: recibo.blockNumber,
    abi: JSON.parse(contrato.interface.formatJson()),
  };
  fs.writeFileSync(destino, JSON.stringify(despliegue, null, 2));
  return despliegue;
}

async function ejecutar({ opciones, registro = console, proceso = process } = {}) {
  try {
    const despliegue = await desplegar(opciones);
    registro.log(`Contrato desplegado en ${despliegue.direccion} (red ${despliegue.chainId}, bloque ${despliegue.bloque}). Se escribió el archivo de despliegue.`);
    return despliegue;
  } catch (error) {
    registro.error(`No fue posible desplegar: ${error.message}`);
    proceso.exitCode = 1;
    return null;
  }
}

if (require.main === module) void ejecutar();

module.exports = { archivoDespliegue, desplegar, ejecutar };
