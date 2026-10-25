const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { tmpdir } = require('node:os');
const { listarArchivos, crearZip, empaquetarTaller } = require('../../scripts/package-taller.cjs');

// Lector mínimo del formato ZIP para comprobar el archivo generado.
function leerZip(zip) {
  const fin = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const total = zip.readUInt16LE(fin + 10);
  let posicion = zip.readUInt32LE(fin + 16);
  const archivos = {};
  for (let i = 0; i < total; i++) {
    assert.equal(zip.readUInt32LE(posicion), 0x02014b50);
    const metodo = zip.readUInt16LE(posicion + 10);
    const crc = zip.readUInt32LE(posicion + 16);
    const comprimido = zip.readUInt32LE(posicion + 20);
    const largoNombre = zip.readUInt16LE(posicion + 28);
    const local = zip.readUInt32LE(posicion + 42);
    const nombre = zip.subarray(posicion + 46, posicion + 46 + largoNombre).toString('utf8');
    const inicioDatos = local + 30 + zip.readUInt16LE(local + 26);
    const datos = zlib.inflateRawSync(zip.subarray(inicioDatos, inicioDatos + comprimido));
    assert.equal(metodo, 8);
    assert.equal(zlib.crc32(datos), crc);
    archivos[nombre] = datos.toString('utf8');
    posicion += 46 + largoNombre;
  }
  return archivos;
}

async function carpetaTemporal(t) {
  const raiz = await fs.mkdtemp(path.join(tmpdir(), 'taller-zip-'));
  t.after(() => fs.rm(raiz, { recursive: true, force: true }));
  return raiz;
}

test('el ZIP conserva nombres con tildes y el contenido exacto de cada archivo', () => {
  const zip = crearZip([{ nombre: 'agropay/reglas.js', datos: Buffer.from('const límite = 4;') }, { nombre: 'agropay/vacío.txt', datos: Buffer.alloc(0) }]);
  assert.deepEqual(leerZip(zip), { 'agropay/reglas.js': 'const límite = 4;', 'agropay/vacío.txt': '' });
  assert.deepEqual(crearZip([{ nombre: 'a', datos: Buffer.from('x') }]), crearZip([{ nombre: 'a', datos: Buffer.from('x') }]));
});

test('el empaquetado incluye el inicio y omite dependencias y salidas generadas', async (t) => {
  const origen = await carpetaTemporal(t);
  for (const [archivo, contenido] of Object.entries({
    'package.json': '{}', 'src/reglas.js': 'const x = 1;', 'test/etapa-1.reglas.test.js': 'prueba',
    'node_modules/hardhat/index.js': 'x', 'artifacts/a.json': 'x', 'cache/b.json': 'x', 'coverage.json': '{}', 'evidencia-taller.md': 'x',
  })) {
    await fs.mkdir(path.dirname(path.join(origen, archivo)), { recursive: true });
    await fs.writeFile(path.join(origen, archivo), contenido);
  }
  assert.deepEqual(await listarArchivos(origen), ['package.json', 'src/reglas.js', 'test/etapa-1.reglas.test.js']);
  const destino = path.join(origen, '..', path.basename(origen) + '-salida', 'taller.zip');
  t.after(() => fs.rm(path.dirname(destino), { recursive: true, force: true }));
  const resultado = await empaquetarTaller({ origen, destino });
  assert.deepEqual(resultado.archivos, ['package.json', 'src/reglas.js', 'test/etapa-1.reglas.test.js']);
  assert.deepEqual(leerZip(await fs.readFile(destino)), {
    'agropay-taller/package.json': '{}', 'agropay-taller/src/reglas.js': 'const x = 1;', 'agropay-taller/test/etapa-1.reglas.test.js': 'prueba',
  });
});

test('el empaquetado del taller real contiene las siete etapas completamente construidas y scripts de inspección', async (t) => {
  const destino = path.join(await carpetaTemporal(t), 'taller.zip');
  const { archivos } = await empaquetarTaller({ origen: path.resolve(__dirname, '../../taller/inicio'), destino });
  for (const etapa of [0, 1, 2, 3, 4, 5, 6]) assert.ok(archivos.some(a => a.startsWith(`test/etapa-${etapa}.`)), `etapa ${etapa}`);
  const contenido = leerZip(await fs.readFile(destino));
  assert.match(contenido['agropay-taller/src/reglas.js'], /evaluarLectura/);
  assert.match(contenido['agropay-taller/contracts/GarantiaAgroPay.sol'], /contract GarantiaAgroPay/);
  assert.ok(contenido['agropay-taller/scripts/inspeccionar-estado.js']);
  assert.ok(contenido['agropay-taller/scripts/probar-seguridad.js']);
});

test('el empaquetado rechaza una carpeta vacía', async (t) => {
  const origen = await carpetaTemporal(t);
  await assert.rejects(empaquetarTaller({ origen, destino: path.join(origen, 'x.zip') }), /vacía/);
});
