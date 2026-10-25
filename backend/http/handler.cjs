const { createSessions } = require('./sessions.cjs');
const { readJson } = require('./request.cjs');
const { serveStatic } = require('./static.cjs');
const { json, failure, reject } = require('./response.cjs');

function createHandler(dependencies) {
  const sessions = createSessions();
  return async function handle(request, response) {
    try {
      const address = request.socket.remoteAddress;
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) throw reject(403, 'El aula real solo admite conexiones locales.');
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(request.headers.host || '')) {
        throw reject(403, 'El nombre del servidor local no está autorizado.', 'HOST_REJECTED');
      }
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (!pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method)) throw reject(405, 'Este recurso solo admite lectura.');
        return await serveStatic(request, response, dependencies);
      }
      const session = sessions.get(request, response);
      if (request.method === 'GET' && pathname === '/api/revision') {
        return json(response, 200, dependencies.revision ? await dependencies.revision() : { revision: null });
      }
      if (request.method === 'GET' && pathname === '/api/runtime') {
        return json(response, 200, { ...await dependencies.runtime(), csrfToken: session.csrfToken });
      }
      if (request.method === 'GET' && pathname.startsWith('/api/runs/')) {
        const job = dependencies.runs.get(pathname.slice(10), session.id);
        if (!job) throw reject(404, 'No se encontró esta ejecución en tu sesión.');
        const { sessionId, ...visible } = job;
        return json(response, 200, visible);
      }
      if (request.method !== 'POST') throw reject(404, 'La ruta solicitada no existe.');
      sessions.verify(request, session);
      const body = await readJson(request);
      const match = /^\/api\/labs\/([a-z-]+)\/runs$/.exec(pathname);
      if (match) {
        const job = dependencies.runs.create(match[1], body.input ?? {}, session.id);
        return json(response, 202, { id: job.id, labId: job.labId, mode: job.mode, status: job.status });
      }
      const auth = { '/api/auth/register/options': 'registrationOptions', '/api/auth/register/verify': 'register',
        '/api/auth/login/options': 'authenticationOptions', '/api/auth/login/verify': 'authenticate' }[pathname];
      if (auth) return json(response, 200, await dependencies.webAuthn[auth](session.id, body));
      throw reject(404, 'La ruta solicitada no existe.');
    } catch (error) { failure(response, error); }
  };
}

module.exports = { createHandler };
