// Verifica el taller completo: inicio y solución vienen completamente construidos,
// pasan todas las etapas con 100 % de funciones JavaScript (incluido PostgreSQL),
// alcanzan el 100 % de funciones Solidity y ejecutan los scripts de inspección y seguridad.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyFunctions } = require('../../scripts/check-solidity-coverage.cjs');

const root = path.resolve(__dirname, '../..');
const taller = path.join(root, 'taller');
const solucion = path.join(taller, 'solucion');
const inicio = path.join(taller, 'inicio');
const hardhat = path.join(root, 'node_modules/hardhat/internal/cli/cli.js');
const c8 = path.join(root, 'node_modules/c8/bin/c8.js');

const ARCHIVOS_ENTREGADOS = [
  'hardhat.config.js', 'package.json', '.gitignore',
  'scripts/demo.js', 'scripts/verificar-entorno.cjs', 'scripts/inspeccionar-estado.js', 'scripts/probar-seguridad.js',
  'contracts/GarantiaAgroPay.sol', 'contracts/practica/AtacanteRetiro.sol', 'contracts/practica/ReceptorQueRechaza.sol',
  'src/reglas.js', 'src/oraculo.js', 'src/indexador.js', 'src/recorrido.js',
  'src/repositorio-memoria.js', 'src/repositorio-postgres.js', 'sql/001_proyeccion.sql',
  'test/mis-pruebas.test.js',
  ...[0, 1, 2, 3, 4, 5, 6].map(n => fs.readdirSync(path.join(solucion, 'test')).find(f => f.startsWith(`etapa-${n}.`))).map(f => `test/${f}`),
];

function ejecutar(args, cwd, env = {}) {
  const { NODE_V8_COVERAGE, ...heredado } = process.env;
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', windowsHide: true, env: { ...heredado, ...env }, timeout: 300000 });
  return { status: result.status, salida: `${result.stdout}\n${result.stderr}` };
}

function entornoPostgres() {
  const { GUIA_DB_USER: usuario, GUIA_DB_PASSWORD: clave } = process.env;
  if (!usuario || !clave) throw new Error('Carga las credenciales de la guía (Import-GuideCredentials) para probar el nivel completo del taller.');
  const host = process.env.GUIA_DB_HOST || '127.0.0.1';
  const puerto = process.env.GUIA_DB_PORT || '5434';
  const base = process.env.GUIA_DB_NAME || 'guia_dinero_programable';
  return { TALLER_DATABASE_URL: `postgres://${encodeURIComponent(usuario)}:${encodeURIComponent(clave)}@${host}:${puerto}/${base}` };
}

async function conEsquemaTemporal(accion) {
  const entorno = entornoPostgres();
  const esquema = `taller_${process.pid}_${Date.now()}`;
  const { Client } = require('pg');
  const cliente = new Client({ connectionString: entorno.TALLER_DATABASE_URL });
  await cliente.connect();
  try {
    await cliente.query(`CREATE SCHEMA ${esquema}`);
    return await accion({ ...entorno, TALLER_DATABASE_SCHEMA: esquema });
  } finally {
    await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
    await cliente.end();
  }
}

function limpiarSalidas(carpeta) {
  for (const nombre of ['artifacts', 'cache', 'coverage', 'coverage.json']) {
    fs.rmSync(path.join(carpeta, nombre), { recursive: true, force: true });
  }
}

test('inicio y solución comparten pruebas, configuración, scripts y fuentes', () => {
  for (const archivo of ARCHIVOS_ENTREGADOS) {
    if (archivo === 'package.json') continue;
    assert.equal(fs.readFileSync(path.join(inicio, archivo), 'utf8'), fs.readFileSync(path.join(solucion, archivo), 'utf8'), archivo);
  }
  const paqueteInicio = JSON.parse(fs.readFileSync(path.join(inicio, 'package.json'), 'utf8'));
  const paqueteSolucion = JSON.parse(fs.readFileSync(path.join(solucion, 'package.json'), 'utf8'));
  assert.deepEqual(paqueteInicio.scripts, paqueteSolucion.scripts);
  assert.deepEqual(paqueteInicio.devDependencies, paqueteSolucion.devDependencies);
  assert.deepEqual(paqueteInicio.dependencies, paqueteSolucion.dependencies);
  const raiz = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const [nombre, version] of Object.entries({ ...paqueteSolucion.devDependencies, ...paqueteSolucion.dependencies })) {
    assert.equal(version, raiz.devDependencies[nombre] || raiz.dependencies[nombre], `versión de ${nombre} alineada con el proyecto`);
  }
});

test('la solución pasa todas las etapas con 100 % de funciones JavaScript, incluido PostgreSQL', async () => {
  limpiarSalidas(solucion);
  const resultado = await conEsquemaTemporal(entorno => ejecutar([
    c8, '--temp-directory=' + path.join(solucion, 'coverage', 'tmp'), '--reports-dir=' + path.join(solucion, 'coverage'), '--all', '--include=src/**/*.js', '--include=scripts/**/*.js', '--include=scripts/**/*.cjs',
    '--check-coverage', '--functions=100', '--lines=90', '--branches=85', '--reporter=text', process.execPath, hardhat, 'test',
  ], solucion, entorno));
  limpiarSalidas(solucion);
  assert.equal(resultado.status, 0, resultado.salida);
  assert.match(resultado.salida, /\d+ passing/);
  assert.doesNotMatch(resultado.salida, /pending|failing/);
  assert.match(resultado.salida, /All files\s*\|[^|]*\|[^|]*\|\s*100 \|/);
});

test('el contrato de la solución alcanza todas sus funciones Solidity', () => {
  limpiarSalidas(solucion);
  const resultado = ejecutar([hardhat, 'coverage'], solucion);
  try {
    assert.equal(resultado.status, 0, resultado.salida);
    const cobertura = JSON.parse(fs.readFileSync(path.join(solucion, 'coverage.json'), 'utf8'));
    const verificacion = verifyFunctions(cobertura);
    assert.equal(verificacion.pct, 100);
    assert.ok(Object.keys(cobertura).some(archivo => archivo.endsWith('GarantiaAgroPay.sol')));
  } finally {
    limpiarSalidas(solucion);
  }
});

test('el inicio pasa todas las etapas con 100 % de funciones JavaScript, incluido PostgreSQL', async () => {
  limpiarSalidas(inicio);
  const resultado = await conEsquemaTemporal(entorno => ejecutar([
    c8, '--temp-directory=' + path.join(inicio, 'coverage', 'tmp'), '--reports-dir=' + path.join(inicio, 'coverage'), '--all', '--include=src/**/*.js', '--include=scripts/**/*.js', '--include=scripts/**/*.cjs',
    '--check-coverage', '--functions=100', '--lines=90', '--branches=85', '--reporter=text', process.execPath, hardhat, 'test',
  ], inicio, entorno));
  limpiarSalidas(inicio);
  assert.equal(resultado.status, 0, resultado.salida);
  assert.match(resultado.salida, /\d+ passing/);
  assert.doesNotMatch(resultado.salida, /pending|failing/);
  assert.match(resultado.salida, /All files\s*\|[^|]*\|[^|]*\|\s*100 \|/);
});

test('el contrato del inicio alcanza todas sus funciones Solidity', () => {
  limpiarSalidas(inicio);
  const resultado = ejecutar([hardhat, 'coverage'], inicio);
  try {
    assert.equal(resultado.status, 0, resultado.salida);
    const cobertura = JSON.parse(fs.readFileSync(path.join(inicio, 'coverage.json'), 'utf8'));
    const verificacion = verifyFunctions(cobertura);
    assert.equal(verificacion.pct, 100);
    assert.ok(Object.keys(cobertura).some(archivo => archivo.endsWith('GarantiaAgroPay.sol')));
  } finally {
    limpiarSalidas(inicio);
  }
});

test('el inicio ejecuta demo, inspección de almacenamiento y experimentos de seguridad', () => {
  const demo = ejecutar([hardhat, 'run', 'scripts/demo.js'], inicio);
  assert.equal(demo.status, 0, demo.salida);
  assert.match(demo.salida, /# Evidencia del taller AgroPay/);

  const inspeccion = ejecutar([hardhat, 'run', 'scripts/inspeccionar-estado.js'], inicio);
  assert.equal(inspeccion.status, 0, inspeccion.salida);
  assert.match(inspeccion.salida, /CAPA 1: EVM STORAGE/);
  assert.match(inspeccion.salida, /CAPA 2: BITÁCORA DE EVENTOS/);
  assert.match(inspeccion.salida, /CAPA 3: PROYECCIÓN EN BASE DE DATOS/);

  const seguridad = ejecutar([hardhat, 'run', 'scripts/probar-seguridad.js'], inicio);
  assert.equal(seguridad.status, 0, seguridad.salida);
  assert.match(seguridad.salida, /TODOS LOS EXPERIMENTOS DE SEGURIDAD FUERON SUPERADOS/);
});

for (const etapa of [0, 1, 2, 3, 4, 5, 6]) {
  test(`la etapa ${etapa} pasa directamente en el inicio entregado`, async () => {
    const archivoPrueba = fs.readdirSync(path.join(inicio, 'test')).find(f => f.startsWith(`etapa-${etapa}.`));
    const correr = entorno => ejecutar([hardhat, 'test', `test/${archivoPrueba}`], inicio, entorno);
    const resultado = etapa === 5 ? await conEsquemaTemporal(correr) : correr({});
    assert.equal(resultado.status, 0, resultado.salida);
    assert.doesNotMatch(resultado.salida, /failing/);
    assert.match(resultado.salida, /\d+ passing/);
  });
}
