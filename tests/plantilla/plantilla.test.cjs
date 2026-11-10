// Verifica la plantilla mi-dapp tal como la recibe el aprendiz: el contrato, la API de Node.js,
// la API de Python, la interfaz y los archivos de publicación. Exige 100 % de funciones en
// JavaScript (incluido PostgreSQL), Solidity y Python.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyFunctions } = require('../../scripts/check-solidity-coverage.cjs');
const { empaquetarTaller, listarArchivos } = require('../../scripts/package-taller.cjs');

const root = path.resolve(__dirname, '../..');
const plantilla = path.join(root, 'plantilla', 'mi-dapp');
const hardhat = path.join(root, 'node_modules/hardhat/internal/cli/cli.js');
const c8 = path.join(root, 'node_modules/c8/bin/c8.js');
const leer = relativo => fs.readFileSync(path.join(plantilla, relativo), 'utf8').replace(/\r\n/g, '\n');

function ejecutar(comando, args, env = {}) {
  const { NODE_V8_COVERAGE, ...heredado } = process.env;
  const result = spawnSync(comando, args, { cwd: plantilla, encoding: 'utf8', windowsHide: true, env: { ...heredado, ...env }, timeout: 600000 });
  return { status: result.status, salida: `${result.stdout}\n${result.stderr}\n${result.error ?? ''}` };
}

function limpiarSalidas() {
  for (const nombre of ['artifacts', 'cache', 'coverage', 'coverage.json', 'despliegue.json', '.pytest_cache', 'backend-python/__pycache__', 'backend-python/.pytest_cache']) {
    fs.rmSync(path.join(plantilla, nombre), { recursive: true, force: true });
  }
}

async function conEsquemaTemporal(accion) {
  const { GUIA_DB_USER: usuario, GUIA_DB_PASSWORD: clave } = process.env;
  if (!usuario || !clave) throw new Error('Carga las credenciales de la guía (Import-GuideCredentials) para probar la plantilla con PostgreSQL.');
  const url = `postgres://${encodeURIComponent(usuario)}:${encodeURIComponent(clave)}@${process.env.GUIA_DB_HOST || '127.0.0.1'}:${process.env.GUIA_DB_PORT || '5434'}/${process.env.GUIA_DB_NAME || 'guia_dinero_programable'}`;
  const esquema = `plantilla_${process.pid}_${Date.now()}`;
  const { Client } = require('pg');
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query(`CREATE SCHEMA ${esquema}`);
    return await accion({ DATABASE_URL: url, DATABASE_SCHEMA: esquema });
  } finally {
    await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
    await cliente.end();
  }
}

test('la plantilla entrega contrato, dos API, interfaz, SQL, publicación e instrucciones', async () => {
  const archivos = await listarArchivos(plantilla);
  for (const esperado of [
    'README.md', 'package.json', 'hardhat.config.js', '.gitignore', '.dockerignore',
    'contracts/RegistroProductos.sol', 'scripts/desplegar.js', 'sql/001_eventos_productos.sql',
    'backend-node/app.js', 'backend-node/servidor.js', 'backend-node/contrato.js', 'backend-node/indexador.js',
    'backend-node/repositorio-memoria.js', 'backend-node/repositorio-postgres.js', 'backend-node/Dockerfile',
    'backend-python/app.py', 'backend-python/cadena.py', 'backend-python/servidor.py', 'backend-python/requirements.txt',
    'backend-python/conftest.py', 'backend-python/test_app.py', 'backend-python/Dockerfile',
    'frontend/index.html', 'frontend/app.js', 'frontend/estilos.css',
    'docker-compose.yml', 'docker-compose.python.yml',
    'test/contrato.test.js', 'test/api.test.js', 'test/indexador.test.js', 'test/interfaz.test.js', 'test/apoyo.js',
  ]) assert.ok(archivos.includes(esperado), `falta ${esperado}`);
  assert.ok(!archivos.some(archivo => /node_modules|__pycache__|despliegue\.json|\.pytest_cache/.test(archivo)), 'el paquete no lleva salidas generadas');
});

test('las versiones de la plantilla coinciden con las del proyecto', () => {
  const paquete = JSON.parse(leer('package.json'));
  const raiz = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const [nombre, version] of Object.entries({ ...paquete.devDependencies, ...paquete.dependencies })) {
    assert.equal(version, raiz.devDependencies[nombre] || raiz.dependencies[nombre], `versión de ${nombre} alineada con el proyecto`);
  }
  for (const linea of leer('backend-python/requirements.txt').trim().split('\n')) assert.match(linea, /^[a-z0-9-]+==\d+(\.\d+)+$/, `versión fija: ${linea}`);
});

test('ningún archivo de la plantilla contiene una clave privada ni una URL con credenciales reales', async () => {
  for (const archivo of await listarArchivos(plantilla)) {
    const texto = leer(archivo);
    assert.doesNotMatch(texto, /0x[0-9a-fA-F]{64}(?![0-9a-fA-F])/, `${archivo}: parece contener una clave o un hash escrito a mano`);
    for (const [, credencial, servidor] of texto.matchAll(/:\/\/([^\s/@"'`]+:[^\s/@"'`]+)@([^\s/"'`)]+)/g)) {
      const ejemplo = /^(usuario|aprendiz):(clave|x|clave%20de%20pr%C3%A1ctica)$/.test(credencial) || credencial.includes('$');
      assert.ok(ejemplo, `${archivo}: credencial escrita en una URL hacia ${servidor}`);
    }
  }
});

test('el contrato, la API de Node.js, el indexador y la interfaz pasan con 100 % de funciones, incluido PostgreSQL', async () => {
  limpiarSalidas();
  const resultado = await conEsquemaTemporal(entorno => ejecutar(process.execPath, [
    c8, '--temp-directory=' + path.join(plantilla, 'coverage', 'tmp'), '--reports-dir=' + path.join(plantilla, 'coverage'), '--all',
    '--include=backend-node/**/*.js', '--include=scripts/**/*.js', '--include=frontend/**/*.js',
    '--check-coverage', '--functions=100', '--lines=95', '--branches=90', '--reporter=text', process.execPath, hardhat, 'test',
  ], entorno));
  limpiarSalidas();
  assert.equal(resultado.status, 0, resultado.salida);
  assert.match(resultado.salida, /\d+ passing/);
  assert.doesNotMatch(resultado.salida, /\d+ (pending|failing)/);
  assert.match(resultado.salida, /All files\s*\|[^|]*\|[^|]*\|\s*100 \|/);
});

test('sin PostgreSQL la plantilla pasa en memoria y avisa qué pruebas quedan pendientes', () => {
  limpiarSalidas();
  const resultado = ejecutar(process.execPath, [hardhat, 'test'], { DATABASE_URL: '' });
  limpiarSalidas();
  assert.equal(resultado.status, 0, resultado.salida);
  assert.match(resultado.salida, /Nivel completo omitido: define DATABASE_URL/);
  assert.match(resultado.salida, /4 pending/);
  assert.doesNotMatch(resultado.salida, /failing/);
});

test('el contrato RegistroProductos alcanza todas sus funciones Solidity', () => {
  limpiarSalidas();
  const resultado = ejecutar(process.execPath, [hardhat, 'coverage', '--testfiles', 'test/contrato.test.js']);
  try {
    assert.equal(resultado.status, 0, resultado.salida);
    const cobertura = JSON.parse(fs.readFileSync(path.join(plantilla, 'coverage.json'), 'utf8'));
    assert.equal(verifyFunctions(cobertura).pct, 100);
    assert.ok(Object.keys(cobertura).some(archivo => archivo.endsWith('RegistroProductos.sol')));
  } finally {
    limpiarSalidas();
  }
});

test('la API de Python pasa contra un nodo Hardhat real con 100 % de funciones', () => {
  limpiarSalidas();
  const informe = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'plantilla-python-')), 'funciones.json');
  const resultado = ejecutar('uv', ['run', '--python', '3.12', '--with-requirements', 'backend-python/requirements.txt', 'pytest', 'backend-python', '-q', '-p', 'no:cacheprovider'], { COBERTURA_FUNCIONES_JSON: informe, PYTHONDONTWRITEBYTECODE: '1' });
  try {
    assert.equal(resultado.status, 0, resultado.salida);
    assert.match(resultado.salida, /\d+ passed/);
    assert.doesNotMatch(resultado.salida, /failed|skipped|error/i);
    const cobertura = JSON.parse(fs.readFileSync(informe, 'utf8'));
    assert.ok(cobertura.total >= 20, `solo ${cobertura.total} funciones`);
    assert.deepEqual(cobertura.missing, []);
    assert.equal(cobertura.covered, cobertura.total);
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    fs.writeFileSync(path.join(root, 'test-results', 'python-functions-plantilla.json'), JSON.stringify({ source: 'plantilla/mi-dapp/backend-python', functionCoverage: 100, ...cobertura }, null, 2));
  } finally {
    fs.rmSync(path.dirname(informe), { recursive: true, force: true });
    limpiarSalidas();
  }
});

for (const [compose, dockerfile] of [['docker-compose.yml', 'backend-node/Dockerfile'], ['docker-compose.python.yml', 'backend-python/Dockerfile']]) {
  test(`${compose} publica en Coolify sin puertos, sin valores por defecto y sin secretos escritos`, () => {
    const texto = leer(compose);
    assert.doesNotMatch(texto, /^\s*ports\s*:/m, 'no publica puertos en el host');
    assert.doesNotMatch(texto, /\$\{[^}]*:-/, 'sin valores por defecto ${VAR:-…}');
    const variables = [...texto.matchAll(/(?<!\$)\$\{([A-Z_]+)([^}]*)\}/g)];
    assert.ok(variables.length >= 2);
    for (const [, nombre, resto] of variables) assert.match(resto, /^:\?.+/, `${nombre} es obligatoria y explica qué falta`);
    for (const nombre of ['RPC_URL', 'CLAVE_PRIVADA_API']) assert.ok(variables.some(([, variable]) => variable === nombre), `usa ${nombre}`);
    assert.match(texto, /networks:\n  coolify:\n    external: true/);
    assert.match(texto, new RegExp(`dockerfile: ${dockerfile}`));
    assert.match(texto, /healthcheck:/);
    for (const [, imagen] of texto.matchAll(/^\s*image:\s*(\S+)/gm)) assert.match(imagen, /:\d[^:]*$/, `imagen con versión fija: ${imagen}`);
    for (const linea of texto.split('\n').filter(l => /^\s*- [A-Z_]+=/.test(l))) {
      const [nombre, valor] = linea.trim().slice(2).split(/=(.*)/);
      if (/CLAVE|PASSWORD|SECRET|TOKEN/.test(nombre)) assert.match(valor, /^\$\{/, `${nombre} llega del entorno`);
    }
  });

  test(`${dockerfile} usa versión fija, usuario sin privilegios, comprobación de salud y copia fuentes existentes`, () => {
    const texto = leer(dockerfile);
    const instrucciones = texto.split('\n').filter(linea => linea.trim() && !linea.trim().startsWith('#'));
    for (const desde of instrucciones.filter(linea => /^FROM\s/.test(linea))) assert.match(desde.split(/\s+/)[1], /:\d[^:]*$/);
    const usuario = instrucciones.filter(linea => /^USER\s/.test(linea)).at(-1);
    assert.ok(usuario && !/\b(root|0)\b/.test(usuario), 'termina con un usuario sin privilegios');
    assert.match(texto, /^HEALTHCHECK /m);
    assert.match(texto, /TZ=America\/Bogota/);
    assert.doesNotMatch(texto, /^(ARG|ENV)\s.*(CLAVE|PASSWORD|SECRET|TOKEN|PRIVATE)/mi, 'ningún secreto queda en una capa');
    const origenes = instrucciones.filter(linea => /^COPY\s/.test(linea)).flatMap(linea => linea.split(/\s+/).slice(1, -1)).map(origen => origen.replace(/\*$/, ''));
    assert.ok(origenes.length >= 4);
    for (const origen of origenes) {
      // despliegue.remota.json lo escribe el aprendiz con `npm run desplegar:remota`; package-lock.json, con `npm install`.
      if (['despliegue.remota.json', 'package-lock.json'].includes(origen)) continue;
      assert.ok(fs.existsSync(path.join(plantilla, origen)), `${origen} existe en la plantilla`);
    }
    const dependencias = instrucciones.findIndex(linea => /^COPY\s.*(package\.json|requirements\.txt)/.test(linea));
    const fuentes = instrucciones.findIndex(linea => /^COPY\s+frontend\//.test(linea));
    assert.ok(dependencias !== -1 && dependencias < fuentes, 'las dependencias se copian antes que el código');
  });
}

test('el README guía el recorrido local, la billetera y la publicación con los comandos reales', () => {
  const readme = leer('README.md');
  const comandos = Object.keys(JSON.parse(leer('package.json')).scripts);
  for (const [, comando] of readme.matchAll(/`npm run ([a-z:]+)`/g)) assert.ok(comandos.includes(comando), `npm run ${comando} existe`);
  for (const esperado of ['npm run nodo', 'npm run desplegar', 'npm run api', 'npm run api:python', 'npm run desplegar:remota', 'Docker Compose Location', '/docker-compose.python.yml', 'CLAVE_PRIVADA_API', 'Crear con mi billetera', 'se prepararon para aprender']) {
    assert.ok(readme.includes(esperado), `el README menciona ${esperado}`);
  }
  for (const operacion of ['INSERT', 'SELECT', 'UPDATE', 'DELETE']) assert.ok(readme.includes(`\`${operacion}\``), `la tabla CRUD incluye ${operacion}`);
  assert.doesNotMatch(readme, /dossier/i);
});

test('el paquete descargable de la plantilla contiene el proyecto completo bajo mi-dapp/', async (t) => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'plantilla-zip-'));
  t.after(() => fs.rmSync(carpeta, { recursive: true, force: true }));
  const { archivos } = await empaquetarTaller({ origen: plantilla, destino: path.join(carpeta, 'mi-dapp.zip'), prefijo: 'mi-dapp/' });
  assert.ok(archivos.includes('contracts/RegistroProductos.sol') && archivos.includes('backend-python/app.py') && archivos.includes('docker-compose.yml'));
  const zip = fs.readFileSync(path.join(carpeta, 'mi-dapp.zip'));
  assert.ok(zip.includes(Buffer.from('mi-dapp/README.md')));
  assert.ok(zip.length > 20000);
});
