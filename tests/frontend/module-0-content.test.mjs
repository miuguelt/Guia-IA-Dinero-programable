// Módulo 0: ruta de entrada para quien no sabe nada de criptomonedas. Comprueba que el portal
// enseña el vocabulario con equivalentes conocidos, guía el primer contrato con comandos reales,
// explica qué añade la capa a un sistema ADSO y dibuja sus diagramas como SVG accesibles offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modules, learningStages } from '../../frontend/web/learning/catalog.mjs';
import { resolveRoute } from '../../frontend/web/navigation/model.mjs';

const leer = archivo => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
const m0 = modules.find(module => module.id === 'm0');
const cuerpo = paso => m0.steps[paso].body;
const todo = () => m0.steps.map(step => step.body).join('\n');
const sinEtiquetas = html => html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const svgs = html => [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(match => match[0]);

test('el módulo 0 abre el recorrido con cuatro pasos y sin estación de evidencia', () => {
  assert.ok(m0, 'falta el módulo m0');
  assert.equal(modules[0].id, 'm0');
  assert.equal(learningStages[0].modules[0].id, 'm0');
  assert.equal(m0.steps.length, 4);
  assert.equal(m0.evidence, undefined);
  assert.ok(m0.minutes > 0);
  assert.equal(resolveRoute('#m0/2').route, 'm0/2');
});

test('el glosario traduce al menos ocho términos a equivalentes de software tradicional', () => {
  const tabla = cuerpo(0).match(/<table[^>]*data-glossary[\s\S]*?<\/table>/);
  assert.ok(tabla, 'falta la tabla de glosario');
  const filas = [...tabla[0].matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td>/g)];
  assert.ok(filas.length >= 8, `solo ${filas.length} términos`);
  const terminos = filas.map(([, termino]) => sinEtiquetas(termino).toLowerCase());
  for (const esperado of ['billetera', 'transacción', 'gas', 'bloque', 'msg.sender', 'msg.value', 'evento', 'wei']) {
    assert.ok(terminos.some(t => t.includes(esperado)), `falta ${esperado}`);
  }
  assert.ok(filas.every(([, , equivalente]) => sinEtiquetas(equivalente).trim().length > 10));
});

test('cada diagrama es un SVG inline accesible, con título, descripción y colores por tokens', () => {
  const diagramas = svgs(todo());
  assert.ok(diagramas.length >= 4, `solo ${diagramas.length} diagramas`);
  for (const svg of diagramas) {
    assert.match(svg, /role="img"/);
    assert.match(svg, /aria-labelledby="([^"]+)"/);
    const [, ids] = svg.match(/aria-labelledby="([^"]+)"/);
    for (const id of ids.split(' ')) assert.match(svg, new RegExp(`id="${id}"`), `${id} sin destino`);
    assert.match(svg, /<title id=/);
    assert.match(svg, /<desc id=/);
    assert.doesNotMatch(svg, /fill="#|stroke="#/, 'usa tokens CSS, no colores fijos');
  }
  assert.doesNotMatch(todo(), /<script|https?:\/\/(?!127\.0\.0\.1)/);
});

test('el paso de ejemplo cita el contrato DispensadorDigital tal como está en el repositorio', () => {
  const contrato = leer('contracts/DispensadorDigital.sol');
  const texto = sinEtiquetas(cuerpo(1));
  for (const fragmento of ['function comprar() external payable', 'revert PagoInsuficiente(msg.value, precioArticulo)', 'emit CompraExitosa(msg.sender, msg.value, totalVentas)', 'function retirarGanancias() external']) {
    assert.ok(contrato.includes(fragmento), `el contrato ya no tiene: ${fragmento}`);
    assert.ok(texto.includes(fragmento), `la guía no cita: ${fragmento}`);
  }
});

test('la práctica usa comandos y archivos que existen en el proyecto y en el taller', () => {
  const texto = sinEtiquetas(cuerpo(2));
  const scripts = JSON.parse(leer('package.json')).scripts;
  assert.ok(texto.includes('npx hardhat compile'));
  assert.ok(texto.includes('npx hardhat test test/DispensadorDigital.test.js'));
  assert.ok(texto.includes('npm run node') && scripts.node);
  for (const archivo of ['test/DispensadorDigital.test.js', 'taller/inicio/contracts/DispensadorDigital.sol', 'taller/inicio/test/etapa-1b.dispensador.test.js']) {
    assert.ok(texto.includes(archivo.split('/').pop()), `no menciona ${archivo}`);
    assert.ok(leer(archivo).length > 0);
  }
  assert.match(texto, /PagoInsuficiente/);
});

test('el paso Aplica compara la arquitectura tradicional con la capa programable y dice cuándo no usarla', () => {
  const html = cuerpo(3);
  const texto = sinEtiquetas(html);
  assert.match(html, /<table[^>]*data-comparison/);
  for (const idea of ['PostgreSQL', 'Sistema tradicional', 'Con capa programable', 'No la uses']) assert.ok(texto.includes(idea), `falta ${idea}`);
  assert.match(html, /href="#taller\/1"/);
  assert.doesNotMatch(todo(), /dossier/i);
});
