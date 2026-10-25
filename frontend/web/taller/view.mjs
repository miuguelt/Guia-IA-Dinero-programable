import { etapas, MINUTOS_TALLER } from './catalog.mjs';
import { labs } from '../labs/catalog.mjs';
import { modules } from '../learning/catalog.mjs';
import { escapeHtml, icon } from '../dom.mjs';

const tituloModulo = id => modules.find(module => module.id === id).title;
const tituloLab = id => labs.find(lab => lab.id === id).title;
const bloqueCodigo = texto => `<pre><code>${escapeHtml(texto)}</code></pre>`;
const salida = (titulo, texto) => `<h3>${titulo}</h3><pre class="terminal-output"><code>${escapeHtml(texto)}</code></pre>`;

export function tallerView() {
  return `<section class="module-page" id="taller" data-reader-page data-reader-kind="resources"><div id="taller-catalog"><header class="page-heading"><p class="eyebrow">Inspecciona · Prueba · Transfiere</p><h1 tabindex="-1">Taller AgroPay</h1><p>Explora un sistema completo de dinero programable y datos verificables en siete etapas. No tienes que escribir código: la solución está completamente construida y lista para ejecutar. Tu tarea es inspeccionar dónde se guardan los datos, entender cómo funciona la nueva capa criptográfica y transferir este paradigma a otros casos de uso.</p></header>
    <article class="lesson-body surface"><h2>Cómo funciona el taller</h2><ol><li><strong>Descarga el paquete</strong> e instálalo una vez (<a href="#taller/0">etapa 0</a>). Viene 100 % implementado.</li><li><strong>Inspecciona el código</strong> de cada etapa: analiza las variables de estado en el contrato, la firma en el oráculo y la tabla en PostgreSQL.</li><li><strong>Ejecuta las pruebas</strong> con <code>npm run etapa:N</code> para observar las aserciones que certifican el comportamiento.</li><li><strong>Experimenta con la seguridad</strong> ejecutando <code>npm run probar:seguridad</code> y observa la persistencia en tres capas con <code>npm run inspeccionar:estado</code>.</li><li><strong>Transfiere a tu proyecto</strong>: aplica la matriz de decisión de cuatro preguntas clave para mapear este nuevo paradigma a tu proyecto formativo ADSO.</li></ol>
    <p>Necesitas el <a href="#preparar">nivel mínimo de instalación</a>. El taller amplía la ruta introductoria; su tiempo orientativo es de ${Math.round(MINUTOS_TALLER / 60 * 10) / 10} horas y varía según tu experiencia. La red es local y los fondos son de práctica: no tienen valor monetario.</p>
    <div class="actions"><a class="button primary" href="descargas/taller-agropay.zip" download>Descargar el taller completo (ZIP)</a><a class="button secondary" href="#preparar">Preparar mi equipo</a></div></article>
    <section class="section-block" aria-labelledby="transfer-title"><div class="section-heading"><div><p class="eyebrow">Transferencia de arquitectura</p><h2 id="transfer-title">El nuevo paradigma: Blockchain y PostgreSQL en ADSO</h2></div><span class="pill">ADSO · Arquitectura Web3</span></div>
    <div class="surface">
      <h3>El Semáforo de Decisión ADSO: ¿Dónde y por qué usarlo?</h3>
      <p>Como futuro tecnólogo en desarrollo de software, debes saber justificar cuándo una base de datos relacional es la opción óptima y cuándo se justifica una arquitectura híbrida con contratos inteligentes:</p>
      <div class="table-scroll"><table><caption>El Semáforo de Decisión ADSO</caption><thead><tr><th scope="col">Nivel</th><th scope="col">Tipo de problema</th><th scope="col">Solución técnica</th><th scope="col">Justificación para el aprendiz</th></tr></thead><tbody>
      <tr><td>🟢 <strong>Verde: Solo PostgreSQL</strong></td><td>Inventarios, catálogos, sesiones, notas diarias, compras internas.</td><td>PostgreSQL 18 puro con índices B-Tree.</td><td>Aplica al 95 % de los casos de software: velocidad extrema (&lt; 1 ms), costo cero en gas y facilidad para modificar o corregir datos.</td></tr>
      <tr><td>🟡 <strong>Amarillo: PostgreSQL con Hashes</strong></td><td>Auditoría forense interna donde se quiere demostrar que un registro no fue alterado.</td><td>PostgreSQL + Hashes SHA-256 + Firmas digitales ECDSA.</td><td>Permite trazabilidad comprobable sin la sobrecarga ni el costo de desplegar una red blockchain completa.</td></tr>
      <tr><td>🟣 <strong>Púrpura: Arquitectura Híbrida</strong></td><td>Múltiples actores que desconfían entre sí, custodia de fondos (escrow), liquidaciones automáticas o diplomas verificables globalmente.</td><td>Smart Contracts en EVM (Write Model) + PostgreSQL (Read Model CQRS).</td><td>Garantiza confianza matemática: ninguna parte ni programador central puede alterar las reglas de pago ni el dinero custodiado.</td></tr>
      </tbody></table></div>

      <h3>¿Dónde se guardan los datos en AgroPay? (Persistencia en 3 capas)</h3>
      <p>AgroPay demuestra la coexistencia armónica de la cadena y la base relacional mediante el patrón CQRS:</p>
      <ol class="flow">
        <li><strong>Capa 1 · EVM Storage (On-chain):</strong> Guarda balances y estados inmutables (<code>garantiaDisponible</code>, <code>saldosPendientes</code>). Nadie puede modificarlos sin una transacción firmada.</li>
        <li><strong>Capa 2 · Event Logs (Bloque):</strong> Bitácora notarial inmutable emitida por el contrato (<code>PagoAutorizado</code>, <code>PagoRetirado</code>) con recibo y gas verificado.</li>
        <li><strong>Capa 3 · Proyección SQL (PostgreSQL):</strong> Un indexador escucha los eventos y hace <code>INSERT ... ON CONFLICT (tx_hash, log_index) DO NOTHING</code>. Permite búsquedas veloces en menos de 5 ms sin gastar gas.</li>
      </ol>

      <h3>Matriz de decisión en 4 preguntas</h3>
      <div class="table-scroll"><table><caption>Matriz de decisión de persistencia y verdad</caption><thead><tr><th scope="col">Pregunta clave</th><th scope="col">Capa técnica</th><th scope="col">En AgroPay</th><th scope="col">En tu proyecto formativo</th></tr></thead><tbody>
      <tr><td><strong>1. ¿Qué datos deben consultarse rápido y con filtros complejos?</strong></td><td>Base de datos relacional (PostgreSQL)</td><td>Tabla <code>eventos_agropay</code> para consultas y reportes</td><td>Inventarios, catálogos, perfiles de usuario, sesiones y reportería privada.</td></tr>
      <tr><td><strong>2. ¿Qué mediciones o datos externos deben demostrar autenticidad?</strong></td><td>Oráculo firmado (ECDSA + Nonce)</td><td>Lectura de temperatura y acidez firmada con clave privada</td><td>Resultados de sensores IoT, firmas de diplomas o dictámenes periciales externos.</td></tr>
      <tr><td><strong>3. ¿Qué reglas de custodia o compromisos no pueden ser alterados?</strong></td><td>Contrato inteligente (EVM Storage)</td><td>Contrato <code>GarantiaAgroPay.sol</code> con custodia y retiro CEI</td><td>Garantías de cumplimiento, pagos condicionados por hitos, firmas mutuas inmutables.</td></tr>
      <tr><td><strong>4. ¿Qué bitácora histórica compartida debe ser auditable?</strong></td><td>Logs / Eventos en la cadena</td><td>Eventos <code>PagoAutorizado</code> y <code>PagoRetirado</code></td><td>Trazabilidad de transferencias de dominio, actas de grado y auditorías inmutables.</td></tr>
      </tbody></table></div>
    </div></section>
    <section class="section-block" aria-labelledby="etapas-title"><div class="section-heading"><div><p class="eyebrow">Tu recorrido guiado</p><h2 id="etapas-title">Siete etapas de exploración</h2></div><span class="pill">JavaScript · Solidity · SQL</span></div><div class="lab-grid">${etapas.map(etapa => `<a class="lab-card surface" href="#taller/${etapa.numero}"><div class="card-top"><span class="lab-number">${String(etapa.numero).padStart(2, '0')}</span><span class="small-meta">${etapa.minutos} min</span></div><h3>${etapa.titulo}</h3><p>${etapa.objetivo}</p><div class="lab-card-detail"><strong>Módulo</strong><span>${tituloModulo(etapa.modulo)}</span></div><div class="card-footer"><span>Abrir etapa</span>${icon()}</div></a>`).join('')}</div></section></div>
    ${etapas.map(etapa => `<section class="lab-detail" id="taller/${etapa.numero}" data-etapa-page="${etapa.numero}" hidden>${etapaView(etapa)}</section>`).join('')}</section>`;
}

export function etapaView(etapa) {
  const anterior = etapa.numero > 0 ? `<a class="button secondary" href="#taller/${etapa.numero - 1}">← Etapa ${etapa.numero - 1}</a>` : '<a class="button secondary" href="#preparar">← Prepara tu equipo</a>';
  const siguiente = etapa.numero < etapas.length - 1 ? `<a class="button primary" href="#taller/${etapa.numero + 1}">Etapa ${etapa.numero + 1} ${icon()}</a>` : '<a class="button primary" href="#portfolio">Consolidar en el Portafolio ' + icon() + '</a>';
  return `<header class="page-heading"><a class="back-link" href="#taller">← Todas las etapas</a><p class="eyebrow">Etapa ${etapa.numero} · ${etapa.minutos} min · ${etapa.lenguajes}</p><h1 tabindex="-1">${etapa.titulo}</h1><p>${etapa.objetivo}</p></header>
    <article class="lesson-body surface">
      <h2>Qué necesitas saber y dónde se guardan los datos</h2>${etapa.conceptos}
      <h2>Archivos que vas a inspeccionar</h2><div class="table-scroll"><table><caption>Archivos de la etapa ${etapa.numero}</caption><thead><tr><th scope="col">Archivo</th><th scope="col">Qué analizar</th></tr></thead><tbody>${etapa.archivos.map(([archivo, accion]) => `<tr><td><code>${archivo}</code></td><td>${accion}</td></tr>`).join('')}</tbody></table></div>
      <h2>Pasos de análisis y comprobación</h2><ol class="taller-steps">${etapa.pasos.map(paso => `<li>${paso}</li>`).join('')}</ol>
      ${etapa.codigo.map(bloque => `<h3>${bloque.titulo}</h3>${bloqueCodigo(bloque.texto)}`).join('')}
      ${etapa.desdeCero ? `<details><summary>Cómo se creó este proyecto en Hardhat</summary>${etapa.desdeCero}</details>` : ''}
      <h2>Comprueba tu avance</h2>${bloqueCodigo(etapa.comprobar.comando)}
      ${etapa.comprobar.antes ? salida('Al empezar verás', etapa.comprobar.antes) : ''}
      ${salida('Salida esperada de las pruebas', etapa.comprobar.despues)}
      <p class="field-hint">Los tiempos en milisegundos, las versiones y los hashes cambian en cada equipo. Compara los nombres de las pruebas y el conteo final.</p>
      ${etapa.comprobar.nota ? `<p>${etapa.comprobar.nota}</p>` : ''}${etapa.notas || ''}
      <h2>Si algo falla</h2><div class="table-scroll"><table><caption>Mensajes frecuentes en la etapa ${etapa.numero}</caption><thead><tr><th scope="col">Mensaje o síntoma</th><th scope="col">Qué hacer</th></tr></thead><tbody>${etapa.siFalla.map(([sintoma, accion]) => `<tr><td>${escapeHtml(sintoma)}</td><td>${accion}</td></tr>`).join('')}</tbody></table></div>
      <h2>Evidencia y transferencia a tu proyecto</h2><p>${etapa.evidenciaTexto}</p>
      <ul class="clean-list"><li>${icon('book')} <a href="#${etapa.modulo}/0">Módulo: ${tituloModulo(etapa.modulo)}</a></li>${etapa.labs.map(id => `<li>${icon('flask')} <a href="#lab/${id}">Laboratorio: ${tituloLab(id)}</a></li>`).join('')}${etapa.evidencia ? `<li>${icon('layers')} <a href="#${etapa.modulo}/3">Registrar ${etapa.evidencia}</a></li>` : ''}</ul>
    </article>
    <nav class="lesson-footer" aria-label="Continuar el taller">${anterior}${siguiente}</nav>`;
}
