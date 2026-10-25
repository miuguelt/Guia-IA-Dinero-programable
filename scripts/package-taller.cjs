// Empaqueta taller/inicio en un ZIP descargable desde la web, sin dependencias externas.
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');

const EXCLUIDOS = new Set(['node_modules', 'artifacts', 'cache', 'coverage', 'coverage.json', 'evidencia-taller.md']);
// Fecha fija: el mismo contenido produce el mismo archivo en cada compilación.
const FECHA_DOS = { hora: 0, dia: ((2026 - 1980) << 9) | (1 << 5) | 1 };

async function listarArchivos(directorio, base = '') {
  const entradas = await fs.readdir(path.join(directorio, base), { withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas.sort((a, b) => a.name.localeCompare(b.name))) {
    if (EXCLUIDOS.has(entrada.name)) continue;
    const relativo = base ? `${base}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) archivos.push(...await listarArchivos(directorio, relativo));
    else archivos.push(relativo);
  }
  return archivos;
}

function crearZip(entradas) {
  const locales = [];
  const centrales = [];
  let desplazamiento = 0;
  for (const { nombre, datos } of entradas) {
    const nombreBytes = Buffer.from(nombre, 'utf8');
    const comprimido = zlib.deflateRawSync(datos);
    const crc = zlib.crc32(datos);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(FECHA_DOS.hora, 10);
    local.writeUInt16LE(FECHA_DOS.dia, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombreBytes.length, 26);
    locales.push(local, nombreBytes, comprimido);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(FECHA_DOS.hora, 12);
    central.writeUInt16LE(FECHA_DOS.dia, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(datos.length, 24);
    central.writeUInt16LE(nombreBytes.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    centrales.push(central, nombreBytes);
    desplazamiento += local.length + nombreBytes.length + comprimido.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

async function empaquetarTaller({ origen, destino, prefijo = 'agropay-taller/' }) {
  const archivos = await listarArchivos(origen);
  if (!archivos.length) throw new Error('La carpeta del taller está vacía.');
  const entradas = [];
  for (const archivo of archivos) entradas.push({ nombre: prefijo + archivo, datos: await fs.readFile(path.join(origen, archivo)) });
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, crearZip(entradas));
  return { destino, archivos };
}

module.exports = { EXCLUIDOS, listarArchivos, crearZip, empaquetarTaller };
