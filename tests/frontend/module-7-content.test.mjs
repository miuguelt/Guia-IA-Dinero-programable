// Módulo 7: lleva el contrato a un proyecto propio. Comprueba que el portal enseña la analogía con
// el CRUD, la arquitectura híbrida, quién firma, la misma ruta en Node.js y Python, el recorrido
// local con la plantilla mi-dapp y la publicación en Coolify, y que lo citado existe en la plantilla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { modules, learningStages } from '../../frontend/web/learning/catalog.mjs';
import { resolveRoute, searchGuide } from '../../frontend/web/navigation/model.mjs';
import { createProgress, createMemoryStorage } from '../../frontend/web/learning/progress.mjs';
import { lessonView } from '../../frontend/web/learning/view.mjs';

const leer = archivo => readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
const PLANTILLA = 'plantilla/mi-dapp/';
const REGISTRO = JSON.parse(leer('deliverables.registry.json'));
const m7 = modules.find(module => module.id === 'm7');
const cuerpo = paso => m7.steps[paso].body;
const todo = () => m7.steps.map(step => step.body).join('\n');
const sinEtiquetas = html => html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const bloques = (html, lenguaje) => [...html.matchAll(new RegExp(`<pre><code class="language-${lenguaje}">([\\s\\S]*?)</code></pre>`, 'g'))].map(([, texto]) => sinEtiquetas(texto));
const sinEspacios = texto => texto.replace(/\s+/g, '');

test('el módulo 7 cierra la ruta con cuatro pasos, su evidencia y rutas válidas', () => {
  assert.ok(m7, 'falta el módulo m7');
  assert.equal(modules.at(-1).id, 'm7');
  assert.equal(learningStages.at(-1).modules.at(-1).id, 'm7');
  assert.deepEqual(m7.steps.map(step => step.title), ['Comprende', 'Revisa el ejemplo', 'Practica', 'Aplica']);
  assert.equal(m7.evidence, 'MG-A06');
  assert.ok(m7.minutes >= 60);
  assert.equal(resolveRoute('#m7/2').route, 'm7/2');
  assert.equal(resolveRoute('#m8/0').route, 'home');
  const progreso = createProgress(createMemoryStorage());
  assert.equal(progreso.visit('m7/3').lastRoute, 'm7/3');
  assert.equal(progreso.saveEvidence('MG-A06', 'Mi aplicación').evidence['MG-A06'], 'Mi aplicación');
  assert.ok(searchGuide('CRUD').some(resultado => resultado.route.startsWith('m7/')), 'la búsqueda encuentra la analogía con el CRUD');
});

test('el recorrido enlaza el módulo 6 con el 7 y el 7 con el Portafolio', () => {
  const estado = createProgress(createMemoryStorage()).read();
  const m6 = modules.find(module => module.id === 'm6');
  assert.match(lessonView(m6, 3, estado), /data-complete="m6" data-next="m7\/0"/);
  assert.match(lessonView(m7, 3, estado), /data-complete="m7" data-next="portfolio"/);
  assert.match(lessonView(m7, 0, estado), /href="#m6\/3"[^>]*>← Módulo anterior/);
  assert.match(lessonView(m7, 3, estado), /data-db-evidence="MG-A06"/);
});

test('la tabla del CRUD relaciona cada operación SQL con su función del contrato', () => {
  const tabla = cuerpo(0).match(/<table data-crud>[\s\S]*?<\/table>/);
  assert.ok(tabla, 'falta la tabla data-crud');
  const filas = [...tabla[0].matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)].map(fila => fila.slice(1).map(sinEtiquetas));
  assert.deepEqual(filas.map(([operacion, sql]) => [operacion.trim(), sql.trim()]), [['Crear', 'INSERT'], ['Leer', 'SELECT'], ['Actualizar', 'UPDATE'], ['Eliminar', 'DELETE']]);
  const contrato = leer(PLANTILLA + 'contracts/RegistroProductos.sol');
  for (const [, , enContrato] of filas) {
    const [, funcion] = enContrato.match(/(\w+)\(/);
    assert.match(contrato, new RegExp(`function ${funcion}\\(`), `el contrato define ${funcion}`);
  }
  assert.match(filas[3][3], /No existe el borrado/);
  for (const evento of ['ProductoCreado', 'PrecioActualizado']) assert.ok(tabla[0].includes(evento), evento);
});

test('Comprende explica la aplicación híbrida, las tres capas de datos, quién firma y las redes', () => {
  const texto = sinEtiquetas(cuerpo(0));
  for (const idea of ['aplicación descentralizada', 'híbridas', 'Estado del contrato', 'Eventos del bloque', 'Proyección en PostgreSQL', 'Firma la API', 'Firma el usuario', 'Local (Hardhat)', 'Nodo propio en un VPS', 'Red pública de pruebas', 'Red pública principal', 'variable de entorno']) {
    assert.ok(texto.includes(idea), `falta: ${idea}`);
  }
  assert.match(texto, /se prepararon para aprender/);
  assert.match(texto, /PostgreSQL es más simple, barato y seguro/);
  assert.ok(leer(PLANTILLA + 'sql/001_eventos_productos.sql').includes('eventos_productos') && texto.includes('eventos_productos'));
});

test('cada diagrama es un SVG inline accesible, con título, descripción y colores por tokens', () => {
  const diagramas = [...todo().matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(match => match[0]);
  assert.equal(diagramas.length, 2);
  for (const svg of diagramas) {
    assert.match(svg, /role="img"/);
    const [, ids] = svg.match(/aria-labelledby="([^"]+)"/);
    for (const id of ids.split(' ')) assert.ok(svg.includes(`id="${id}"`), `falta el elemento ${id}`);
    assert.match(svg, /<title id=/);
    assert.match(svg, /<desc id=[^>]+>[^<]{80,}/);
    assert.doesNotMatch(svg, /(fill|stroke)="#|style=/, 'los colores salen de las clases del tema');
    assert.doesNotMatch(svg, /https?:\/\//);
  }
  assert.equal(new Set([...todo().matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id)).size, [...todo().matchAll(/\sid="([^"]+)"/g)].length, 'ids repetidos');
});

test('los fragmentos de Revisa el ejemplo están tomados de los archivos de la plantilla', () => {
  const fuentes = {
    solidity: sinEspacios(leer(PLANTILLA + 'contracts/RegistroProductos.sol')),
    javascript: sinEspacios(leer(PLANTILLA + 'backend-node/app.js') + leer(PLANTILLA + 'backend-node/indexador.js') + leer(PLANTILLA + 'frontend/app.js')),
    python: sinEspacios(leer(PLANTILLA + 'backend-python/app.py')),
  };
  for (const [lenguaje, fuente] of Object.entries(fuentes)) {
    const fragmentos = bloques(cuerpo(1), lenguaje);
    assert.ok(fragmentos.length >= 1, `sin fragmentos de ${lenguaje}`);
    for (const fragmento of fragmentos) {
      for (const linea of fragmento.split(/(?<=[;{}])\s+/).map(sinEspacios).filter(l => l.length > 25)) {
        assert.ok(fuente.includes(linea), `${lenguaje}: «${linea.slice(0, 70)}» no está en la plantilla`);
      }
    }
  }
  const [java] = bloques(cuerpo(1), 'java');
  assert.match(java, /Web3j\.build/);
  assert.match(sinEtiquetas(cuerpo(1)), /comparativo; la plantilla no incluye un proyecto Java y la guía no lo ejecuta/);
});

test('los mensajes de error citados son los que devuelven las dos API', () => {
  const node = leer(PLANTILLA + 'backend-node/app.js');
  const python = leer(PLANTILLA + 'backend-python/app.py');
  const citados = [...sinEtiquetas(cuerpo(1) + cuerpo(2)).matchAll(/«([^»]{20,})»/g)].map(([, mensaje]) => mensaje);
  const deLaApi = citados.filter(mensaje => !/^(Transacción enviada|Todavía no hay)/.test(mensaje) && !mensaje.includes('billetera'));
  assert.ok(deLaApi.length >= 5);
  for (const mensaje of deLaApi) {
    assert.ok(node.includes(mensaje), `Node.js no devuelve: ${mensaje}`);
    assert.ok(python.includes(mensaje), `Python no devuelve: ${mensaje}`);
  }
  for (const [error, codigo] of [['ProductoInexistente', 404], ['SoloResponsable', 403], ['ProductoInactivo', 409]]) {
    assert.match(cuerpo(1), new RegExp(`<code>${error}</code></td><td>${codigo}</td>`));
    assert.match(node, new RegExp(`${error}: \\[${codigo},`));
    assert.match(python, new RegExp(`"${error}": \\(${codigo},`));
  }
  assert.ok(leer(PLANTILLA + 'frontend/app.js').includes('Todavía no hay productos. Crea el primero con el formulario.'));
});

test('Practica guía con comandos reales de la plantilla, resultados esperados y qué hacer si falla', () => {
  const practica = cuerpo(2);
  const comandos = Object.keys(JSON.parse(leer(PLANTILLA + 'package.json')).scripts);
  const citados = [...sinEtiquetas(todo()).matchAll(/npm run ([a-z][a-z:]*)/g)].map(([, comando]) => comando);
  assert.ok(citados.length >= 6);
  for (const comando of citados) assert.ok(comandos.includes(comando), `npm run ${comando} existe en la plantilla`);
  for (const esperado of ['nodo', 'desplegar', 'api', 'api:python', 'desplegar:remota']) assert.ok(citados.includes(esperado), `falta npm run ${esperado}`);
  assert.match(practica, /href="descargas\/mi-dapp\.zip" download/);
  assert.match(practica, /Read-Host "Clave privada de práctica" -MaskInput/);
  assert.doesNotMatch(todo(), /0x[0-9a-fA-F]{64}/, 'ninguna clave privada escrita');
  assert.equal([...practica.matchAll(/<ol class="steps-list">[\s\S]*?<\/ol>/g)][0][0].match(/<li><strong>/g).length, 7);
  assert.match(sinEtiquetas(practica), /escribe primero lo que crees que pasará/);
  assert.ok([...practica.matchAll(/<details>/g)].length >= 6);
  assert.match(practica, /<caption>Mensajes frecuentes y cómo continuar<\/caption>/);
  const fuentesNode = leer(PLANTILLA + 'backend-node/contrato.js') + leer(PLANTILLA + 'backend-node/servidor.js');
  // El tercer mensaje se arma con el nombre de la variable: en el código aparece como ${nombre}.
  for (const [mensaje, enCodigo] of [['No existe despliegue.json', 'No existe despliegue.json'], ['No hay contrato en la dirección de despliegue.json', 'No hay contrato en la dirección de despliegue.json'], ['Define la variable RPC_URL antes de iniciar la API', 'Define la variable ${nombre} antes de iniciar la API']]) {
    assert.ok(practica.includes(mensaje) && fuentesNode.includes(enCodigo), mensaje);
  }
  const paquete = JSON.parse(leer(PLANTILLA + 'package.json'));
  for (const [, nombre, version] of bloques(practica, 'powershell').join('\n').matchAll(/(@?[a-z/-]+)@(\d[\d.]*)/g)) {
    assert.equal(paquete.devDependencies[nombre] ?? paquete.dependencies[nombre], version, `versión de ${nombre}`);
  }
  assert.doesNotMatch(practica, /href="#taller\//, 'el módulo 7 no tiene etapas del taller');
});

test('Aplica publica en Coolify con los archivos reales y sin secretos en el repositorio', () => {
  const aplica = cuerpo(3);
  assert.match(aplica, /<h2>MG-A06 · Aplicación integrada publicada<\/h2>/);
  for (const archivo of ['docker-compose.yml', 'docker-compose.python.yml']) {
    assert.ok(aplica.includes(`<code>/${archivo}</code>`), archivo);
    assert.ok(existsSync(PLANTILLA + archivo), `${archivo} existe en la plantilla`);
  }
  const compose = leer(PLANTILLA + 'docker-compose.yml');
  for (const variable of ['RPC_URL', 'CLAVE_PRIVADA_API', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']) {
    assert.ok(aplica.includes(`<code>${variable}</code>`) && compose.includes('${' + variable + ':?'), variable);
  }
  assert.match(aplica, /Docker Compose Location/);
  assert.match(aplica, /despliegue\.remota\.json/);
  assert.match(aplica, /\/api\/salud/);
  assert.match(sinEtiquetas(aplica), /En tu equipo no necesitas Docker/);
  assert.match(sinEtiquetas(aplica), /Si no tienes un VPS/);
  assert.deepEqual([...aplica.matchAll(/href="(#[^"]+)"/g)].map(([, destino]) => destino), ['#portfolio']);
});

test('MG-A06 queda registrada con su estación, su documento y su lugar en el manifiesto', () => {
  const artefacto = REGISTRO.artifacts.find(item => item.id === 'MG-A06');
  assert.ok(artefacto, 'falta MG-A06 en el registro');
  assert.equal(artefacto.name, 'Aplicación integrada publicada');
  assert.deepEqual([artefacto.station.sectionId, artefacto.station.order, artefacto.station.phase], ['m7', 6, 'transfer']);
  assert.ok(existsSync(artefacto.evidence));
  const manifiesto = JSON.parse(leer('guide.manifest.json'));
  assert.ok(manifiesto.project.checkpoints.some(punto => punto.evidence === 'MG-A06' && punto.criterion === artefacto.criterion));
  assert.ok(manifiesto.evidence.product.includes('MG-A06'));
  assert.ok(REGISTRO.submission.competencyMap.some(grupo => grupo.artifacts.includes('MG-A06')));
  assert.equal(manifiesto.template.download, 'web/descargas/mi-dapp.zip');
  assert.equal(manifiesto.template.verification, 'npm run test:plantilla');
  assert.ok(existsSync(manifiesto.template.source));
});

test('los módulos anteriores anuncian la analogía con el CRUD, las redes públicas y el paso al módulo 7', () => {
  const de = id => modules.find(module => module.id === id);
  const m0 = sinEtiquetas(de('m0').steps[3].body);
  for (const operacion of ['INSERT', 'SELECT', 'UPDATE', 'DELETE']) assert.ok(m0.includes(operacion), `m0: ${operacion}`);
  assert.match(m0, /módulo 7/);
  assert.match(sinEtiquetas(de('m1').steps[0].body), /Red pública de pruebas/);
  const m6 = sinEtiquetas(de('m6').steps[3].body);
  assert.match(m6, /módulo 7/);
  assert.match(m6, /MG-A06/);
});
