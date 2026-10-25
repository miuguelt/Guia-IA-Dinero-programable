const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const base = process.env.GUIA_BASE_URL || 'http://localhost:8153';

async function serveBuiltWeb(t) {
  const root = path.resolve('web');
  const server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const target = path.resolve(root, pathname === '/' ? 'index.html' : '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const content = await fs.readFile(target);
      const type = target.endsWith('.js') ? 'text/javascript; charset=utf-8' : target.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      response.writeHead(200, { 'content-type': type }).end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('El aula redistribuye el contenido y conserva controles accesibles en seis tamaños', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext();
  const page = await context.newPage();
  await fs.mkdir('output/playwright', { recursive: true });
  await fs.mkdir('test-results', { recursive: true });
  const failures = [];
  for (const width of [320, 390, 768, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await page.locator('#main-content h1:visible').waitFor();
    const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(size.content <= size.viewport + 1, `${width}px: el contenido ocupa ${size.content}px.`);
    assert.equal(await page.locator('h1:visible').count(), 1);
    await page.screenshot({ path: path.resolve(`output/playwright/aula-${width}.png`), fullPage: true });
    if (width === 390) await page.screenshot({ path: path.resolve('output/playwright/aula-390-viewport.png'), clip: { x: 0, y: 0, width: 390, height: 844 } });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    failures.push(...audit.violations.map(v => ({ width, id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })));
  }
  await fs.writeFile('test-results/accesibilidad.json', JSON.stringify(failures, null, 2));
  assert.deepEqual(failures, []);
});

test('La lección usa todo el ancho del contenedor y justifica sus párrafos', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const builtWeb = await serveBuiltWeb(t);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // devbrain-prose.js recalcula la alineación con ResizeObserver; se espera a que el párrafo cumpla la regla 7.4.
  const settleAlignment = selector => page.waitForFunction(target => {
    const element = document.querySelector(target);
    if (!element) return false;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return getComputedStyle(element).textAlign === (element.getBoundingClientRect().width >= 40 * rem ? 'justify' : 'start');
  }, selector, { timeout: 5000 });
  const assertCopyWidth = async (selector, width, minimumRatio = 0.98) => {
    const node = page.locator(selector).first();
    await node.waitFor();
    await settleAlignment(selector);
    const layout = await node.evaluate(element => {
      const parent = element.parentElement;
      const parentStyle = getComputedStyle(parent);
      const style = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        parentContentWidth: parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight),
        textAlign: style.textAlign,
        maxWidth: style.maxWidth,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize)
      };
    });
    // Regla 7.4: se justifica cuando la región de lectura mide al menos 40rem; en regiones menores, alineación inicial.
    assert.equal(layout.textAlign, layout.width >= 40 * layout.rem ? 'justify' : 'start', `${width}px ${selector}: ${JSON.stringify(layout)}`);
    assert.equal(layout.maxWidth, 'none', `${width}px ${selector}: ${JSON.stringify(layout)}`);
    assert.ok(layout.width >= layout.parentContentWidth * minimumRatio, `${width}px ${selector}: ${JSON.stringify(layout)}`);
  };
  await page.goto(builtWeb + '/#m1/0');
  for (const width of [320, 390, 768, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto(builtWeb + '/#m1/0');
    const paragraph = page.locator('.lesson-body .lesson-step p').first();
    await paragraph.waitFor();
    await settleAlignment('.lesson-body .lesson-step:not([hidden]) p');
    const layout = await paragraph.evaluate(node => {
      const article = node.closest('.lesson-body');
      const articleStyle = getComputedStyle(article);
      const style = getComputedStyle(node);
      return {
        paragraphWidth: node.getBoundingClientRect().width,
        articleContentWidth: article.clientWidth - parseFloat(articleStyle.paddingLeft) - parseFloat(articleStyle.paddingRight),
        textAlign: style.textAlign,
        maxWidth: style.maxWidth,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize)
      };
    });
    assert.equal(layout.textAlign, layout.paragraphWidth >= 40 * layout.rem ? 'justify' : 'start', `${width}px: ${JSON.stringify(layout)}`);
    assert.equal(layout.maxWidth, 'none');
    assert.ok(Math.abs(layout.paragraphWidth - layout.articleContentWidth) <= 1, `${width}px: ${JSON.stringify(layout)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px: la lección se desborda.`);
    assert.equal(await page.locator('.lesson-body img, .lesson-body iframe, .lesson-body video, .lesson-body canvas, .lesson-media-placeholder').count(), 0);
    if (width === 1920) await page.screenshot({ path: path.resolve('output/playwright/leccion-ancho-completo-1920.png'), fullPage: true });
    await page.goto(builtWeb + '/#home');
    await assertCopyWidth('.hero-intro', width);
    await assertCopyWidth('.practice-note > p', width, 0.7);
    await assertCopyWidth('.module-card > p', width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px: la portada se desborda.`);
    await page.goto(builtWeb + '/#portfolio');
    await assertCopyWidth('.portfolio-intro p', width);
    await assertCopyWidth('.evidence-summary [data-evidence-content]', width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px: el Portafolio se desborda.`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(builtWeb + '/#home');
  assert.deepEqual(await page.locator('.learning-stage').evaluateAll(nodes => nodes.map(node => node.querySelector('h3').textContent)), ['Comprender y decidir', 'Construir y conectar', 'Verificar y entregar']);
  assert.deepEqual(await page.locator('.learning-stage').evaluateAll(nodes => nodes.map(node => node.querySelectorAll('.module-card').length)), [2, 2, 2]);
  await page.screenshot({ path: path.resolve('output/playwright/ruta-tres-etapas-1440.png'), fullPage: true });
  await page.goto(builtWeb + '/#labs');
  assert.equal(await page.locator('.lab-stage').count(), 3);
  assert.equal(await page.locator('#labs-catalog .lab-card').count(), 12);
  assert.equal(await page.locator('#labs-catalog .lab-card').evaluateAll(nodes => new Set(nodes.map(node => node.getAttribute('href'))).size), 12);
});

test('Búsqueda, historial, progreso y simulación funcionan sin dependencias de internet', { timeout: 60000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('https://**', route => route.abort());
  await page.goto(base);
  await page.locator('[data-toggle-menu]').click();
  await page.getByLabel('Buscar en la guía').fill('reentrada');
  await page.getByRole('link').filter({ hasText: /reentrada/i }).first().click();
  assert.match(page.url(), /#m3/);
  await page.reload();
  assert.match(page.url(), /#m3/);
  await page.goto(base + '/#lab/pharma');
  await page.locator('#run-lab-pharma').click();
  await page.locator('#run-result-pharma').waitFor();
  assert.match(await page.locator('#run-result-pharma').innerText(), /simulaci[oó]n/i);
  assert.doesNotMatch(await page.locator('#run-result-pharma').innerText(), /0x[a-f0-9]{64}/i);
  await page.goto(base + '/#portfolio');
  await page.locator('#main-content h1:visible').waitFor();
  assert.match(await page.locator('#main-content').innerText(), /Portafolio de Evidencias/);
});

test('WebAuthn registra y autentica desde la interfaz con verificación real del servidor', { timeout: 60000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext();
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('WebAuthn.enable');
  await session.send('WebAuthn.addVirtualAuthenticator', { options: {
    protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true,
    isUserVerified: true, automaticPresenceSimulation: true
  } });
  await page.goto(base + '/#lab/architecture');
  await page.locator('[data-lab-page="architecture"] input[name=mode][value=real]').check();
  await page.locator('[data-auth=register]').click();
  await page.locator('#auth-status-architecture').filter({ hasText: 'Clave de acceso registrada.' }).waitFor();
  await page.locator('[data-auth=login]').click();
  await page.locator('#auth-status-architecture').filter({ hasText: 'Autenticación verificada por el servicio local.' }).waitFor();
  assert.match(await page.locator('#auth-status-architecture').innerText(), /verificada/);
});

test('Lecciones, catálogo, formularios y Portafolio conservan lectura y foco con teclado', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const failures = [];
  for (const width of [320, 390, 768, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['m3/1', 'labs', 'lab/pharma', 'portfolio', 'preparar', 'taller', 'taller/3', 'taller/5', 'publicar']) {
      await page.goto(base + '/#' + route);
      await page.locator('#main-content h1:visible').waitFor();
      if (route === 'lab/pharma') {
        await page.locator('#run-lab-pharma').click();
        await page.getByText('Ejecución terminada', { exact: true }).waitFor();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route} en ${width}px`);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      failures.push(...result.violations.map(item => ({ width, route, id: item.id, targets: item.nodes.map(node => node.target) })));
      await page.screenshot({ path: path.resolve(`output/playwright/${route.replace('/', '-')}-${width}.png`), fullPage: true });
    }
  }
  await fs.writeFile('test-results/accesibilidad-recorrido.json', JSON.stringify(failures, null, 2));
  assert.deepEqual(failures, []);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.locator('[data-toggle-menu]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-toggle-menu]').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#sidebar .brand').evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#sidebar a').last().evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-toggle-menu]').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('[data-toggle-menu]').evaluate(node => node === document.activeElement), true);
  assert.equal(await page.locator('[data-toggle-menu]').evaluate(node => getComputedStyle(node).outlineStyle !== 'none'), true);
  await page.keyboard.press('/');
  assert.equal(await page.getByLabel('Buscar en la guía').evaluate(node => node === document.activeElement), true);
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
});

test('El árbol accesible expone títulos, campos y anuncios para tecnologías de asistencia', async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base + '/#lab/pharma');
  await page.locator('#lab-form-pharma').waitFor();
  const session = await context.newCDPSession(page);
  await session.send('Accessibility.enable');
  const { nodes } = await session.send('Accessibility.getFullAXTree');
  const exposed = nodes.filter(node => !node.ignored);
  assert.ok(exposed.some(node => node.role.value === 'heading' && node.name?.value === 'Cadena de frío'));
  assert.ok(exposed.some(node => node.role.value === 'spinbutton' && node.name?.value === 'Temperatura (°C)'));
  assert.ok(exposed.some(node => node.role.value === 'radio' && node.name?.value === 'Real local'));
  assert.ok(exposed.some(node => node.properties?.some(property => property.name === 'live' && property.value.value === 'polite')));
  await fs.writeFile('test-results/arbol-accesible.json', JSON.stringify(exposed.map(node => ({ role: node.role.value, name: node.name?.value, properties: node.properties })), null, 2));
});

test('El laboratorio real presenta seis etapas y transiciones confirmadas sin perder la evidencia', async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base + '/#lab/pipeline');
  await page.locator('[data-lab-page="pipeline"] input[name=mode][value=real]').check();
  await page.locator('#run-lab-pipeline').click();
  await page.locator('.pipeline-stages li').last().waitFor();
  assert.equal(await page.locator('.pipeline-stages li').count(), 6);
  assert.equal(await page.locator('.operation-timeline .phase-label').filter({ hasText: 'Transacción confirmada' }).count(), 3);
  assert.match(await page.locator('.phase-current').innerText(), /Eventos indexados/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await page.getByText('Ver datos y referencias de la ejecución', { exact: true }).click();
  const evidence = JSON.parse(await page.locator('#run-result-pipeline pre code').innerText());
  assert.equal(evidence.indexing.status, 'indexed');
  assert.match(evidence.receipt.hash, /^0x[a-f0-9]{64}$/i);
  await page.screenshot({ path: path.resolve('output/playwright/pipeline-real-390.png'), fullPage: true });
});
