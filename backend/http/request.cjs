const { reject } = require('./response.cjs');

async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    throw reject(415, 'Envía los datos como JSON.');
  }
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 65536) throw reject(413, 'La solicitud supera el tamaño permitido.');
  }
  try {
    const value = JSON.parse(body || '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch { throw reject(400, 'Los datos enviados no son un objeto JSON válido.'); }
}

module.exports = { readJson };
