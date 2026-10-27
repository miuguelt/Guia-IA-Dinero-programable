// Contenido sobre el funcionamiento de la cadena de bloques y la verificación de la red:
// documento de apoyo, ilustraciones accesibles, módulo 1 y separación entre el nodo local y el VPS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { modules } from '../../frontend/web/learning/catalog.mjs';
import { labs } from '../../frontend/web/labs/catalog.mjs';
import { publicarView } from '../../frontend/web/taller/publicar.mjs';

const leer = archivo => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
const DOC = 'docs/FUNCIONAMIENTO_BLOCKCHAIN_Y_VERIFICACION_DE_RED.md';
const ILUSTRACIONES = ['anatomia-bloque', 'cadena-de-bloques', 'ciclo-transaccion', 'cuentas-y-claves', 'local-vs-coolify'];

test('el documento explica la cadena de bloques y cómo verificar la red desde el equipo', () => {
  const texto = leer(DOC);
  for (const seccion of [
    '## 1. Qué es la cadena de bloques', '## 2. Anatomía de un bloque', '## 3. Cómo se encadenan los bloques',
    '## 4. Cuentas, claves y direcciones', '## 5. Ciclo de vida de una transacción', '## 6. Consenso y finalidad',
    '## 7. JSON-RPC: la puerta de entrada al nodo', '## 8. Verifica desde tu PC a qué nodo te conectas', '## 9. Diagnóstico',
  ]) assert.ok(texto.includes(seccion), seccion);
  for (const campo of ['parentHash', 'stateRoot', 'transactionsRoot', 'receiptsRoot', 'baseFeePerGas', 'gasUsed']) assert.match(texto, new RegExp('`' + campo + '`'));
  for (const metodo of ['eth_chainId', 'web3_clientVersion', 'eth_blockNumber', 'eth_getBlockByNumber', 'eth_getCode']) assert.match(texto, new RegExp(metodo));
  assert.match(texto, /```mermaid\r?\nsequenceDiagram/);
  assert.match(texto, /```mermaid\r?\nflowchart/);
  assert.match(texto, /npm run red:verificar -- --red local/);
  assert.match(texto, /npm run red:verificar -- --red vps/);
  assert.match(texto, /31338/);
  assert.match(texto, /401/);
  assert.match(texto.slice(0, 600), /se prepararon para aprender/);
  for (const nombre of ILUSTRACIONES) assert.ok(texto.includes(`](../assets/diagrams/blockchain/${nombre}.svg)`), nombre);
});

test('el documento nuevo se enlaza desde README, fundamentos y la guía de Coolify', () => {
  assert.match(leer('README.md'), /\]\(docs\/FUNCIONAMIENTO_BLOCKCHAIN_Y_VERIFICACION_DE_RED\.md\)[^\n]*m1/);
  assert.ok(leer('docs/01-fundamentos.md').includes('](FUNCIONAMIENTO_BLOCKCHAIN_Y_VERIFICACION_DE_RED.md)'));
  const coolify = leer('docs/GUIA_SERVIDOR_EVM_COOLIFY_Y_USO_LOCAL.md');
  assert.ok(coolify.includes('](FUNCIONAMIENTO_BLOCKCHAIN_Y_VERIFICACION_DE_RED.md'));
  assert.match(coolify, /npm run red:verificar -- --red vps/);
});

test('cada ilustración es un SVG accesible, escalable y legible en tema claro y oscuro', () => {
  for (const nombre of ILUSTRACIONES) {
    const ruta = `assets/diagrams/blockchain/${nombre}.svg`;
    assert.ok(existsSync(ruta), ruta);
    const svg = leer(ruta);
    const raiz = svg.match(/<svg\b[^>]*>/)[0];
    assert.match(raiz, /viewBox="0 0 \d+ \d+"/, ruta);
    assert.match(raiz, /role="img"/, ruta);
    assert.match(raiz, /aria-labelledby="[^"]+"/, ruta);
    assert.doesNotMatch(raiz, /\b(width|height)="/, `${ruta}: tamaño fijo`);
    assert.match(svg, /<title id="[^"]+">[^<]{10,}<\/title>/, ruta);
    assert.match(svg, /<desc id="[^"]+">[^<]{20,}<\/desc>/, ruta);
    assert.match(svg, /@media \(prefers-color-scheme: dark\)/, ruta);
    assert.doesNotMatch(svg, /<script|<image|https?:\/\/(?!www\.w3\.org)/, `${ruta}: recurso externo o script`);
  }
});

test('el módulo 1 enseña bloques, transacciones y redes con diagramas en línea y el laboratorio de bloques', () => {
  const m1 = modules.find(module => module.id === 'm1');
  const [comprende, ejemplo] = m1.steps;
  assert.match(comprende.body, /<h3>Qué guarda un bloque y cómo se encadena<\/h3>/);
  assert.match(comprende.body, /<h3>Cómo viaja una transacción<\/h3>/);
  assert.match(ejemplo.body, /<h3>¿A qué red estás conectado\?<\/h3>/);
  const diagramas = [...m1.steps.map(step => step.body).join('').matchAll(/<figure class="chain-diagram">([\s\S]*?)<\/figure>/g)].map(match => match[1]);
  assert.equal(diagramas.length, 3);
  for (const figura of diagramas) {
    // En pantallas angostas el dibujo se desplaza en su propio contenedor, alcanzable con teclado.
    assert.match(figura, /^<div class="chain-diagram-scroll" tabindex="0" role="region" aria-label="[^"]+"><svg/);
    assert.match(figura, /<svg[^>]*role="img"[^>]*aria-labelledby="[^"]+"/);
    assert.match(figura, /<figcaption>[^<]{20,}/);
    assert.doesNotMatch(figura, /fill="#|stroke="#/, 'los colores salen de las clases de styles.css');
  }
  assert.deepEqual(m1.labs, ['myths', 'comparison', 'blocks']);
  const lab = labs.find(item => item.id === 'blocks');
  assert.equal(lab.module, 'm1');
  assert.equal(lab.number, '13');
  assert.ok(lab.steps.length >= 3 && lab.expect && lab.troubleshoot);
  assert.match(leer('frontend/web/styles.css'), /\.chain-diagram/);
});

test('las referencias al VPS usan el chainId 31338 y el nodo local conserva 31337', () => {
  // 31337 solo puede aparecer para contrastar con el nodo local, nunca como valor del VPS.
  const valorVps = /(ANVIL|VPS)_CHAIN_ID\s*=\s*"?31337|ANVIL_CHAIN_ID:-31337|Chain ID <code>31337|Identificador de cadena: `31337`, Símbolo|chainId 31337`\)/;
  const coolify = leer('docs/GUIA_SERVIDOR_EVM_COOLIFY_Y_USO_LOCAL.md');
  assert.doesNotMatch(coolify, valorVps);
  assert.match(coolify, /ANVIL_CHAIN_ID=31338/);
  assert.match(coolify, /VPS_CHAIN_ID = "31338"/);
  const anexo = publicarView();
  assert.doesNotMatch(anexo, valorVps);
  assert.match(anexo, /ANVIL_CHAIN_ID:-31338/);
  assert.match(anexo, /VPS_CHAIN_ID = (&quot;|")31338/);
  assert.match(leer('hardhat.config.js'), /localhost: \{[^}]*chainId: 31337/);
});
