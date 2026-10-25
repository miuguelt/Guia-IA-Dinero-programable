const { randomUUID, randomBytes, timingSafeEqual } = require('node:crypto');
const { reject } = require('./response.cjs');

function createSessions() {
  const sessions = new Map();
  function get(request, response) {
    const id = /(?:^|;\s*)aula_session=([a-f0-9-]+)/.exec(request.headers.cookie || '')?.[1];
    let session = sessions.get(id);
    if (!session || Date.now() - session.touched > 28800000) {
      session = { id: randomUUID(), csrfToken: randomBytes(24).toString('hex') };
      if (sessions.size >= 500) sessions.delete(sessions.keys().next().value);
      sessions.set(session.id, session);
      response.setHeader('set-cookie', `aula_session=${session.id}; HttpOnly; SameSite=Strict; Path=/`);
    }
    session.touched = Date.now();
    return session;
  }

  function verify(request, session) {
    const origin = request.headers.origin;
    if (origin && ![`http://${request.headers.host}`].includes(origin)) {
      throw reject(403, 'El origen de la solicitud no está autorizado.', 'ORIGIN_REJECTED');
    }
    const token = String(request.headers['x-csrf-token'] || '');
    if (token.length !== session.csrfToken.length || !timingSafeEqual(Buffer.from(token), Buffer.from(session.csrfToken))) {
      throw reject(403, 'Actualiza el estado del aula antes de enviar la operación.', 'CSRF_REJECTED');
    }
  }
  return { get, verify };
}

module.exports = { createSessions };
