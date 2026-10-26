// Conformidad estática del despliegue remoto en Coolify (.antigravityrules §2 y §6.2).
// Docker no es runtime local: aquí solo se lee el texto del compose y del Dockerfile.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const read = (relative) => fs.readFileSync(path.join(projectRoot, relative), 'utf-8');
const SECRET_NAME = /(secret|password|passwd|pwd|token|api[_-]?key|private[_-]?key|mnemonic)/i;

// Parser mínimo para el subconjunto YAML del compose: mapas por sangría, listas `- x`
// y escalares. No admite anclas ni bloques multilínea, que el compose tampoco usa.
export function parseComposeYaml(text) {
  const lines = text.split(/\r?\n/)
    .map((raw) => raw.replace(/\s+#.*$/, '').replace(/^\s*#.*$/, ''))
    .filter((line) => line.trim() !== '')
    .map((line) => ({ indent: line.length - line.trimStart().length, body: line.trim() }));
  let index = 0;
  const scalar = (value) => {
    const unquoted = value.replace(/^(["'])(.*)\1$/, '$2');
    if (unquoted === 'true') return true;
    if (unquoted === 'false') return false;
    return unquoted;
  };
  function parseBlock(indent) {
    const isList = lines[index].body.startsWith('- ');
    const result = isList ? [] : {};
    while (index < lines.length && lines[index].indent === indent) {
      const { body } = lines[index];
      index += 1;
      if (isList) {
        result.push(body.slice(2).startsWith('[') ? JSON.parse(body.slice(2)) : scalar(body.slice(2).trim()));
        continue;
      }
      const separator = body.indexOf(':');
      const key = body.slice(0, separator).trim().replace(/^(["'])(.*)\1$/, '$2');
      const rest = body.slice(separator + 1).trim();
      if (rest !== '') result[key] = rest.startsWith('[') ? JSON.parse(rest) : scalar(rest);
      else if (index < lines.length && lines[index].indent > indent) result[key] = parseBlock(lines[index].indent);
      else result[key] = null;
    }
    return result;
  }
  return lines.length === 0 ? {} : parseBlock(lines[0].indent);
}

// Devuelve la lista de incumplimientos del compose; vacía significa conforme.
export function composeViolations(text) {
  const violations = [];
  const compose = parseComposeYaml(text);
  const services = Object.keys(compose.services ?? {});
  if (services.length !== 1 || services[0] !== 'frontend') violations.push(`servicios: se espera solo frontend y hay ${services.join(', ') || 'ninguno'}`);
  if (/^\s*ports\s*:/m.test(text)) violations.push('ports: prohibido publicar puertos en el host');
  if (/\$\{[^}]*:-/.test(text)) violations.push('fallback ${VAR:-...}: prohibido en el compose');
  for (const match of text.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (SECRET_NAME.test(match[1])) violations.push(`secreto referenciado en compose: ${match[1]}`);
  }
  if (compose.networks?.coolify?.external !== true) violations.push('red coolify: debe declararse external: true');
  const extraNetworks = Object.keys(compose.networks ?? {}).filter((name) => name !== 'coolify');
  if (extraNetworks.length > 0) violations.push(`redes ad hoc no permitidas: ${extraNetworks.join(', ')}`);
  for (const name of services) {
    const service = compose.services[name] ?? {};
    if (service.image !== undefined && !/:[^:]*\d/.test(service.image) || /:latest$/.test(service.image ?? '')) {
      violations.push(`${name}: imagen sin versión explícita`);
    }
    if (service.image === undefined && service.build?.dockerfile === undefined) violations.push(`${name}: sin imagen ni Dockerfile`);
    if (JSON.stringify(service.networks ?? []) !== JSON.stringify(['coolify'])) violations.push(`${name}: debe conectarse solo a coolify`);
    for (const entry of Array.isArray(service.environment) ? service.environment : Object.keys(service.environment ?? {})) {
      if (SECRET_NAME.test(String(entry).split('=')[0])) violations.push(`${name}: variable secreta en environment`);
    }
  }
  const frontend = compose.services?.frontend ?? {};
  if (!(frontend.expose ?? []).map(String).includes('80')) violations.push('frontend: debe declarar expose 80');
  if (!(frontend.volumes ?? []).some((volume) => String(volume).startsWith('frontend_logs:'))) violations.push('frontend: falta volumen frontend_logs');
  if (!compose.volumes || !('frontend_logs' in compose.volumes)) violations.push('volumes: falta frontend_logs nombrado');
  if (frontend.healthcheck?.test === undefined) violations.push('frontend: falta healthcheck');
  return violations;
}

// Devuelve la lista de incumplimientos del Dockerfile; vacía significa conforme.
export function dockerfileViolations(text) {
  const violations = [];
  const instructions = text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'));
  const froms = instructions.filter((line) => /^FROM\s/i.test(line));
  for (const from of froms) {
    const image = from.split(/\s+/)[1];
    if (!/:[^:]*\d/.test(image) || /:latest$/i.test(image)) violations.push(`imagen sin versión explícita: ${image}`);
  }
  if (froms.length < 2 || !/COPY\s+--from=/i.test(text)) violations.push('multi-stage: se esperan etapa de build y COPY --from');
  if (!/^HEALTHCHECK\s+.*\b(curl|wget)\b/ims.test(text)) violations.push('HEALTHCHECK activo con curl o wget ausente');
  const users = instructions.filter((line) => /^USER\s/i.test(line)).map((line) => line.split(/\s+/)[1]);
  if (users.length === 0 || ['root', '0'].includes(users.at(-1))) violations.push('USER no root ausente en la etapa final');
  if (!/tzdata/.test(text) || !/^ENV\s+TZ=America\/Bogota/m.test(text)) violations.push('zona horaria: falta tzdata con ENV TZ=America/Bogota');
  for (const line of instructions.filter((entry) => /^(ARG|ENV)\s/i.test(entry))) {
    if (SECRET_NAME.test(line.split(/\s+/)[1] ?? '')) violations.push(`secreto en capa: ${line}`);
  }
  const dependencies = instructions.findIndex((line) => /^COPY\s.*package(-lock)?(\*)?\.json/i.test(line));
  const source = instructions.findIndex((line) => /^COPY\s+frontend\/web/i.test(line));
  if (dependencies === -1 || source === -1 || dependencies > source) violations.push('capas: package*.json debe copiarse antes del código fuente');
  return violations;
}

describe('Validadores de conformidad', () => {
  test('parseComposeYaml interpreta mapas, listas, booleanos y listas JSON', () => {
    const parsed = parseComposeYaml('a:\n  b: "x" # nota\n  c:\n    - "80"\n  d: [ "CMD", "ok" ]\n  e: true\n');
    assert.deepEqual(parsed, { a: { b: 'x', c: ['80'], d: ['CMD', 'ok'], e: true } });
  });

  test('composeViolations detecta ports, fallbacks, secretos, redes y servicios extra', () => {
    const bad = [
      'services:', '  web:', '    image: nginx', '    ports:', '      - "${WEB_PORT:-8080}:80"',
      '    environment:', '      - DB_PASSWORD=${DB_PASSWORD}', '    networks:', '      - web3',
      '  db:', '    image: postgres:latest', 'networks:', '  web3:', '    driver: bridge',
    ].join('\n');
    const violations = composeViolations(bad).join('\n');
    for (const expected of ['servicios', 'ports', 'fallback', 'secreto referenciado', 'red coolify', 'redes ad hoc', 'imagen sin versión', 'debe conectarse solo a coolify', 'variable secreta', 'expose 80', 'frontend_logs', 'healthcheck']) {
      assert.match(violations, new RegExp(expected), `debería reportar «${expected}»`);
    }
  });

  test('dockerfileViolations detecta latest, una etapa, root, sin healthcheck, sin TZ y capas invertidas', () => {
    const bad = 'FROM node:latest\nENV API_TOKEN=x\nCOPY frontend/web ./web\nCOPY package.json ./\nUSER root\nCMD ["node"]\n';
    const violations = dockerfileViolations(bad).join('\n');
    for (const expected of ['imagen sin versión', 'multi-stage', 'HEALTHCHECK', 'USER no root', 'zona horaria', 'secreto en capa', 'capas']) {
      assert.match(violations, new RegExp(expected), `debería reportar «${expected}»`);
    }
  });
});

describe('Despliegue remoto de la guía en Coolify', () => {
  const composeText = read('docker-compose.yml');
  const compose = parseComposeYaml(composeText);

  test('docker-compose.yml cumple §6.2: un servicio, sin ports, red coolify externa y sin secretos', () => {
    assert.deepEqual(composeViolations(composeText), []);
  });

  test('el compose construye frontend/Dockerfile con contexto en la raíz', () => {
    assert.equal(compose.services.frontend.build.context, '.');
    assert.equal(compose.services.frontend.build.dockerfile, 'frontend/Dockerfile');
    assert.ok(fs.existsSync(path.join(projectRoot, 'frontend', 'Dockerfile')));
  });

  test('no hay Dockerfile en la raíz ni compose secundarios que compitan', () => {
    const rootFiles = fs.readdirSync(projectRoot);
    assert.ok(!rootFiles.includes('Dockerfile'), 'el Dockerfile vive en frontend/');
    const composes = rootFiles.filter((name) => /^docker-compose.*\.ya?ml$/.test(name) && name !== 'docker-compose.override.yml' && name !== 'docker-compose.anvil.yml');
    assert.deepEqual(composes, ['docker-compose.yml']);
  });

  test('el material Docker heredado salió del proyecto (cuarentena)', () => {
    for (const legacy of ['Dockerfile.evm', 'consortium-besu-4nodes.yml', 'docker/evm-entrypoint.sh', 'docker/sql/init-cqrs.sql']) {
      assert.ok(!fs.existsSync(path.join(projectRoot, legacy)), `${legacy} no debe seguir en el proyecto`);
    }
  });

  test('el comentario del compose justifica no publicar el backend y cita archivos existentes', () => {
    assert.match(composeText, /backend NO se publica/);
    assert.match(composeText, /loopback/);
    for (const cited of ['backend/http/handler.cjs', 'backend/chain/connection.cjs', 'backend/security/webauthn.cjs']) {
      assert.ok(composeText.includes(cited), `el comentario cita ${cited}`);
      assert.ok(fs.existsSync(path.join(projectRoot, cited)), `${cited} existe`);
    }
  });

  test('frontend/Dockerfile cumple §6.2: versión fija, multi-stage, tzdata, USER no root y HEALTHCHECK', () => {
    const dockerfile = read('frontend/Dockerfile');
    assert.deepEqual(dockerfileViolations(dockerfile), []);
    assert.match(dockerfile, /^FROM nginx:1\.27-alpine$/m);
    assert.match(dockerfile, /^USER appuser$/m);
    assert.match(dockerfile, /RUN npm run build/);
  });

  test('cada origen COPY del Dockerfile existe y no lo excluye .dockerignore', () => {
    const dockerfile = read('frontend/Dockerfile');
    const ignored = read('.dockerignore').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
    const sources = dockerfile.split(/\r?\n/)
      .filter((line) => /^COPY\s/.test(line) && !/--from=/.test(line))
      .flatMap((line) => line.replace(/--chown=\S+\s*/, '').split(/\s+/).slice(1, -1));
    assert.ok(sources.length >= 8);
    for (const source of sources) {
      assert.ok(fs.existsSync(path.join(projectRoot, source)), `${source} existe en el repositorio`);
      const top = source.replace(/\/$/, '').split('/')[0];
      assert.ok(!ignored.includes(top) && !ignored.includes(`${top}/`) && !ignored.includes(source), `${source} no está en .dockerignore`);
    }
  });

  test('la etapa de build copia cada archivo que frontend/web importa fuera de su carpeta', () => {
    const dockerfile = read('frontend/Dockerfile');
    const buildStage = dockerfile.split(/^FROM\s/m)[1];
    const copied = buildStage.split(/\r?\n/)
      .filter((line) => /^COPY\s/.test(line))
      .flatMap((line) => line.split(/\s+/).slice(1, -1));
    const webRoot = path.join(projectRoot, 'frontend', 'web');
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
      return /\.(m?js)$/.test(entry.name) ? [full] : [];
    });
    const external = new Set();
    for (const file of walk(webRoot)) {
      for (const [, specifier] of fs.readFileSync(file, 'utf-8').matchAll(/(?:from|import\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const resolved = path.resolve(path.dirname(file), specifier);
        if (!resolved.startsWith(webRoot + path.sep)) external.add(path.relative(projectRoot, resolved).split(path.sep).join('/'));
      }
    }
    assert.ok(external.size >= 1, 'frontend/web importa al menos un archivo compartido');
    for (const dependency of external) {
      const covered = copied.some((source) => dependency === source || (source.endsWith('/') && dependency.startsWith(source)));
      assert.ok(covered, `frontend/Dockerfile copia ${dependency} antes de npm run build`);
    }
  });

  test('.dockerignore impide copiar secretos y control de versiones a la imagen', () => {
    const ignored = read('.dockerignore').split(/\r?\n/).map((line) => line.trim());
    for (const pattern of ['.git', '.env', '.env.*', 'node_modules', 'web/']) assert.ok(ignored.includes(pattern), `.dockerignore incluye ${pattern}`);
  });
});
