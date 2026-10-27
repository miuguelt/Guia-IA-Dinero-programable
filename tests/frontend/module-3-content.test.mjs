// Módulo 3: el contenido enseña lo que pide MG-A03 (rechazo por permisos, orden de retirar()
// y una regla de permiso) y cada nombre, cifra y comando citado coincide con el código del taller y del aula.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { simulateLab, createSimulationState } from '../../frontend/web/labs/simulation.mjs';
import { simulateAudit } from '../../frontend/web/labs/audit-model.mjs';
import { parseEtherInput } from '../../frontend/web/labs/rules.mjs';

const leer = archivo => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
const m3 = modules.find(module => module.id === 'm3');
const [comprende, ejemplo, practica, aplica] = m3.steps.map(step => step.body);
const todo = m3.steps.map(step => step.body).join('\n');
const sinEtiquetas = html => html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const tablas = html => [...html.matchAll(/<div class="table-scroll"><table>([\s\S]*?)<\/table><\/div>/g)].map(match => match[1]);
const TALLER = leer('taller/solucion/contracts/GarantiaAgroPay.sol');
const PRACTICA_TALLER = ['AtacanteRetiro', 'ReceptorQueRechaza'].map(nombre => leer(`taller/solucion/contracts/practica/${nombre}.sol`)).join('\n');
const BASE = leer('contracts/DineroProgramableBase.sol');
const SEGURIDAD = leer('taller/solucion/scripts/probar-seguridad.js');
const PRUEBAS_ETAPA_3 = leer('taller/solucion/test/etapa-3.seguridad.test.js');
const NOMBRES_DEL_AULA = ['retirarMiDinero', 'saldosPendientes', 'NoAutorizado', 'autorizarPagoCondicional', 'totalEnGarantia'];

test('el módulo 3 conserva su estructura y dedica 120 minutos', () => {
  assert.deepEqual(m3.steps.map(step => step.title), ['Comprende', 'Revisa el ejemplo', 'Practica', 'Aplica']);
  assert.equal(m3.minutes, 120);
  assert.deepEqual(m3.labs, ['evm', 'audit']);
  assert.equal(m3.evidence, 'MG-A03');
});

test('Comprende presenta el contrato del taller y separa sus capas de datos', () => {
  for (const titulo of ['Dónde viven los datos', 'Anatomía de GarantiaAgroPay', 'Dos contratos con la misma idea', 'Permisos y cantidades']) {
    assert.match(comprende, new RegExp(`<h3>${titulo}`), titulo);
  }
  const anatomia = tablas(comprende).find(tabla => /Quién puede llamarla/.test(tabla));
  assert.ok(anatomia, 'tabla de funciones con su permiso');
  for (const funcion of ['depositarGarantia', 'autorizarPago', 'retirar']) {
    assert.match(anatomia, new RegExp(`<code>${funcion}\\(\\)</code>`), funcion);
    assert.match(TALLER, new RegExp(`function ${funcion}\\(`), funcion);
  }
  for (const variable of ['oraculo', 'garantiaDisponible', 'saldoPendiente', 'loteAutorizado']) {
    assert.match(comprende, new RegExp(`<code>${variable}</code>`), variable);
    assert.match(TALLER, new RegExp(`public (immutable )?${variable};`), `${variable} no es una variable pública del taller`);
  }
  assert.ok(!/<table>/.test(comprende.replace(/<div class="table-scroll"><table>[\s\S]*?<\/table><\/div>/g, '')), 'toda tabla tiene su propio desplazamiento');
});

test('la tabla «Dos contratos» empareja cada nombre del taller con el del aula', () => {
  const tabla = tablas(comprende).find(item => /DineroProgramableBase/.test(item) && /GarantiaAgroPay/.test(item));
  assert.ok(tabla, 'tabla comparativa de los dos contratos');
  const pares = [
    ['autorizarPago', 'autorizarPagoCondicional'],
    ['retirar', 'retirarMiDinero'],
    ['saldoPendiente', 'saldosPendientes'],
    ['garantiaDisponible', 'totalEnGarantia'],
    ['SoloOraculo', 'NoAutorizado'],
    ['LoteYaAutorizado', 'MontoInvalido'],
    ['PagoAutorizado', 'PagoAutorizadoPorIA'],
  ];
  const filas = [...tabla.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, fila]) => fila);
  for (const [taller, aula] of pares) {
    const fila = filas.find(item => item.includes(`<code>${taller}`) && item.includes(`<code>${aula}`));
    assert.ok(fila, `falta la fila ${taller} / ${aula}`);
    assert.match(TALLER, new RegExp(`(function|error|event|mapping\\(address => uint256\\) public|uint256 public) ${taller}\\b`), `${taller} no está en el taller`);
    assert.match(BASE, new RegExp(`(function|error|event|mapping\\(address => uint256\\) public|uint256 public) ${aula}\\b`), `${aula} no está en el aula`);
  }
  for (const nombre of ['autorizarPagoCondicional', 'retirarMiDinero', 'saldosPendientes', 'totalEnGarantia', 'NoAutorizado']) {
    assert.doesNotMatch(TALLER, new RegExp(`\\b${nombre}\\b`), `${nombre} no debería existir en el taller`);
  }
  // El aula exige además un puntaje mínimo de 90 que el taller resuelve fuera de la cadena.
  assert.match(BASE, /PUNTAJE_MINIMO = 90/);
  assert.match(tabla, /<code>CondicionNoCumplida<\/code>/);
  assert.match(BASE, /error CondicionNoCumplida\b/);
  assert.match(sinEtiquetas(tabla), /90/);
  for (const destino of ['#taller/3', '#lab/evm', '#lab/audit']) assert.ok(comprende.includes(`href="${destino}"`), destino);
});

test('fuera de la tabla comparativa, el módulo usa solo los nombres del taller', () => {
  const sinComparativa = todo.replace(/<div class="table-scroll"><table>(?:(?!<\/table>)[\s\S])*?DineroProgramableBase[\s\S]*?<\/table><\/div>/, '');
  for (const nombre of NOMBRES_DEL_AULA) assert.doesNotMatch(sinComparativa, new RegExp(`\\b${nombre}\\b`), `${nombre} aparece fuera de la comparación`);
});

test('el código de retirar() del ejemplo es el mismo del contrato del taller', () => {
  const [, bloque] = ejemplo.match(/<pre><code>(function retirar\(\)[\s\S]*?)<\/code><\/pre>/) ?? [];
  assert.ok(bloque, 'el ejemplo muestra retirar()');
  assert.match(bloque, /^ {4}uint256 monto = saldoPendiente\[msg\.sender\];$/m, 'conserva la sangría');
  const fuente = TALLER.slice(TALLER.indexOf('function retirar()'));
  const cuerpo = fuente.slice(0, fuente.indexOf('\n    }\n') + 6);
  const normalizar = texto => texto.replace(/\/\/.*$/gm, '').split('\n').map(linea => linea.trim()).filter(Boolean).join('\n');
  assert.equal(normalizar(bloque.replace(/&quot;/g, '"')), normalizar(cuerpo));
});

test('cada función y error citado existe en el contrato del taller o en sus contratos de práctica', () => {
  const fuentes = [TALLER, PRACTICA_TALLER, BASE].join('\n');
  const funciones = [...todo.matchAll(/<code>([a-z][A-Za-z]+)\(\)<\/code>/g)].map(([, nombre]) => nombre);
  const errores = [...todo.matchAll(/<code>([A-Z][a-z]+(?:[A-Z][a-z]+)+)<\/code>/g)].map(([, nombre]) => nombre);
  for (const nombre of new Set(funciones)) assert.match(fuentes, new RegExp(`function ${nombre}\\(`), `${nombre}() no existe`);
  for (const nombre of new Set(errores)) assert.match(fuentes, new RegExp(`(function|error|event|contract) ${nombre}\\b`), `${nombre} no existe`);
});

test('los estados alternos cubren cada error del taller en el orden en que el contrato los revisa', () => {
  const tabla = tablas(ejemplo).find(item => /Qué comprueba/.test(item) && /Error/.test(item));
  assert.ok(tabla, 'tabla de estados alternos');
  const errores = [...TALLER.matchAll(/error (\w+)\(/g)].map(([, nombre]) => nombre);
  assert.equal(errores.length, 7);
  for (const error of errores) assert.match(tabla, new RegExp(`<code>${error}</code>`), error);
  const autorizar = TALLER.slice(TALLER.indexOf('function autorizarPago'), TALLER.indexOf('function retirar'));
  const ordenContrato = [...autorizar.matchAll(/revert (\w+)\(/g)].map(([, nombre]) => nombre);
  assert.deepEqual(ordenContrato, ['SoloOraculo', 'DireccionInvalida', 'MontoInvalido', 'LoteYaAutorizado', 'FondosInsuficientes']);
  const filaAutorizar = tabla.slice(tabla.indexOf('autorizarPago()'), tabla.indexOf('retirar()'));
  const ordenTabla = [...filaAutorizar.matchAll(/<code>([A-Z]\w+)<\/code>/g)].map(([, nombre]) => nombre).filter(nombre => ordenContrato.includes(nombre));
  assert.deepEqual([...new Set(ordenTabla)], ordenContrato);
});

test('la traza de los experimentos 3 y 4 coincide con probar-seguridad.js', () => {
  assert.match(ejemplo, /<h3>Traza de los experimentos 3 y 4<\/h3>/);
  for (const linea of ['Error custom revertido', 'revert SoloOraculo()', 'Intentos de reentrada realizados por el atacante', '¿Reentrada exitosa lograda?', 'Fondos recibidos']) {
    assert.ok(SEGURIDAD.includes(linea), `el script ya no imprime: ${linea}`);
    assert.ok(sinEtiquetas(ejemplo).includes(linea), `el ejemplo no cita: ${linea}`);
  }
  assert.match(SEGURIDAD, /depositarGarantia\(\{ value: ethers\.parseEther\('2\.0'\) \}\)/);
  assert.match(SEGURIDAD, /autorizarPago\(203, atacante\.address, ethers\.parseEther\('1\.0'\)\)/);
  assert.match(SEGURIDAD, /autorizarPago\(204, await atacanteContrato\.getAddress\(\), ethers\.parseEther\('0\.5'\)\)/);
  const texto = sinEtiquetas(ejemplo);
  for (const dato of ['2 ETH', '203', '1 ETH', '204', '0,5 ETH']) assert.ok(texto.includes(dato), `falta ${dato}`);
  // AtacanteRetiro vuelve a llamar una sola vez y atrapa la reversión.
  assert.match(PRACTICA_TALLER, /if \(intentosReentrada == 0\)/);
  assert.match(PRACTICA_TALLER, /try garantia\.retirar\(\)/);
  assert.match(texto, /receive\(\)/);
  assert.match(texto, /try/);
});

test('las invariantes se apoyan en pruebas reales de la etapa 3', () => {
  const tabla = tablas(ejemplo).find(item => /Invariante/.test(item));
  assert.ok(tabla, 'tabla de invariantes con su prueba');
  const titulos = [...tabla.matchAll(/«([^»]+)»/g)].map(([, titulo]) => titulo);
  assert.ok(titulos.length >= 5, 'al menos cinco invariantes con su prueba');
  for (const titulo of titulos) assert.ok(PRUEBAS_ETAPA_3.includes(`it('${titulo}'`), `no existe la prueba «${titulo}»`);
});

test('la prueba mínima de Hardhat usa la interfaz del taller', () => {
  const [, prueba] = practica.match(/<pre><code>(await expect[\s\S]*?)<\/code><\/pre>/) ?? [];
  assert.ok(prueba, 'Practica incluye la prueba mínima');
  assert.match(prueba, /autorizarPago\(1, productor\.address, UN_ETH\)/);
  assert.match(prueba, /revertedWithCustomError\(contrato, 'SoloOraculo'\)\s*\.withArgs\(otro\.address\)/);
  assert.match(prueba, /saldoPendiente\(productor\.address\)\)\s*\.to\.equal\(0n\)/);
  assert.match(PRUEBAS_ETAPA_3, /const UN_ETH = ethers\.parseEther\('1'\)/);
  assert.match(PRUEBAS_ETAPA_3, /revertedWithCustomError\(contrato, 'SoloOraculo'\)\.withArgs\(otro\.address\)/);
});

test('las cifras del laboratorio Taller EVM coinciden con la simulación', () => {
  const estado = createSimulationState();
  const paso = input => simulateLab('evm', input, estado);
  assert.equal(paso({ action: 'balance' }).result.balanceEth, '1');
  assert.equal(paso({ action: 'deposit', amountEth: '0.01' }).result.balanceEth, '1.01');
  const autorizado = paso({ action: 'authorize', amountEth: '0.5' }).result;
  assert.deepEqual([autorizado.balanceEth, autorizado.pendingEth], ['0.51', '0.5']);
  assert.equal(paso({ action: 'withdraw' }).result.pendingEth, '0');
  const segundo = paso({ action: 'withdraw' });
  assert.equal(segundo.status, 'failed');
  const excedido = paso({ action: 'authorize', amountEth: '2' });
  assert.equal(excedido.status, 'failed');
  const texto = sinEtiquetas(practica);
  for (const dato of ['1,01', '0,51', '0,5', segundo.error.message, excedido.error.message]) assert.ok(texto.includes(dato), `falta ${dato}`);
});

test('la práctica de auditoría anticipa qué herramienta detecta cada variante', () => {
  const resultados = Object.fromEntries(['protected', 'reentrancy', 'no-access', 'replay'].map(id => [id, simulateAudit({ scenario: id })]));
  assert.deepEqual(Object.values(resultados).map(r => [r.staticPassed, r.attackTest.passed]), [[true, true], [false, false], [true, false], [true, false]]);
  assert.ok(resultados.reentrancy.findings.some(f => f.detector === 'reentrancy-eth' && f.impact === 'High'));
  const tabla = tablas(practica).find(item => /Slither/.test(item));
  assert.ok(tabla, 'tabla de predicción para la auditoría');
  for (const etiqueta of Object.values(resultados).map(r => r.scenarioLabel)) assert.ok(sinEtiquetas(tabla).includes(etiqueta), etiqueta);
  assert.match(tabla, /reentrancy-eth/);
});

test('cada comando citado existe en el taller o en la guía', () => {
  const scripts = { ...JSON.parse(leer('taller/solucion/package.json')).scripts, ...JSON.parse(leer('package.json')).scripts };
  const comandos = [...todo.matchAll(/npm run ([a-z0-9:-]+)/g)].map(([, nombre]) => nombre);
  for (const nombre of ['etapa:2', 'etapa:3', 'probar:seguridad', 'mis-pruebas']) assert.ok(comandos.includes(nombre), `no se cita npm run ${nombre}`);
  for (const nombre of comandos) assert.ok(scripts[nombre], `npm run ${nombre} no existe`);
  assert.equal(parseEtherInput('1'), 10n ** 18n);
  assert.match(comprende, /10<sup>18<\/sup> wei/);
  assert.equal(parseEtherInput('0.5'), 500000000000000000n);
  assert.match(comprende, /500000000000000000 wei/);
});

test('Practica guía cada laboratorio y la etapa 3 con predicción, ejecución y anotación', () => {
  for (const destino of [...m3.labs.map(lab => `#lab/${lab}`), '#taller/2', '#taller/3']) assert.ok(practica.includes(`href="${destino}"`), destino);
  assert.equal([...practica.matchAll(/<strong>Predice:<\/strong>/g)].length, 3);
  assert.equal([...practica.matchAll(/<strong>Ejecuta:<\/strong>/g)].length, 3);
  assert.equal([...practica.matchAll(/<strong>Anota:<\/strong>/g)].length, 3);
  assert.match(practica, /<h3>Errores frecuentes al construir<\/h3>/);
});

test('Practica cierra con preguntas de autoevaluación que se abren con teclado', () => {
  assert.match(practica, /<h3>Comprueba lo que aprendiste<\/h3>/);
  const preguntas = [...practica.matchAll(/<details><summary>([^<]+)<\/summary>([\s\S]*?)<\/details>/g)];
  assert.ok(preguntas.length >= 5, `solo hay ${preguntas.length} preguntas`);
  for (const [, pregunta, respuesta] of preguntas) {
    assert.match(pregunta, /^¿[^?]+\?$/, `pregunta mal formada: ${pregunta}`);
    assert.ok(sinEtiquetas(respuesta).trim().length > 60, `respuesta corta: ${pregunta}`);
  }
});

test('Aplica sigue breve y orienta a sus fuentes', () => {
  assert.match(aplica, /<h2>MG-A03 · Implementación comprobada<\/h2>/);
  assert.ok(sinEtiquetas(aplica).length < 900, 'la ficha completa vive en la estación');
  assert.match(aplica, /href="#taller\/3"/);
  assert.match(aplica, /npm run probar:seguridad/);
});
