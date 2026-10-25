const crypto = require('node:crypto');

function failure(code, message) {
  return Object.assign(new Error(message), { code, retryable: false });
}

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  throw failure('READING_INVALID', 'La lectura debe contener únicamente valores JSON válidos.');
}

function signedContent(envelope) {
  return canonical({ deviceId: envelope.deviceId, nonce: envelope.nonce, issuedAt: envelope.issuedAt, payload: envelope.payload });
}

function createSignatureLab({ now = Date.now } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const deviceId = crypto.createHash('sha256').update(publicPem).digest('hex');
  const used = new Set();

  function sign(input) {
    if (!input || Array.isArray(input) || typeof input !== 'object' || !Object.keys(input).length) {
      throw failure('READING_INVALID', 'Ingresa al menos una lectura con nombre y valor.');
    }
    const payload = JSON.parse(canonical(input));
    const envelope = { deviceId, nonce: crypto.randomUUID(), issuedAt: now(), payload };
    envelope.signature = crypto.sign('sha256', Buffer.from(signedContent(envelope)), privateKey).toString('base64url');
    return { ...envelope, publicKey: publicPem };
  }

  function verify(envelope) {
    if (!envelope || typeof envelope.nonce !== 'string' || typeof envelope.signature !== 'string' || !Number.isFinite(envelope.issuedAt)) {
      throw failure('ENVELOPE_INVALID', 'La lectura firmada está incompleta. Vuelve a generar la firma.');
    }
    if (envelope.deviceId !== deviceId || envelope.publicKey !== publicPem) {
      throw failure('DEVICE_UNKNOWN', 'La firma no pertenece a la identidad de software registrada en esta sesión.');
    }
    if (used.has(envelope.nonce)) throw failure('SIGNATURE_REPLAY', 'Esta lectura ya se verificó. Genera una lectura nueva.');
    const age = now() - envelope.issuedAt;
    if (age > 300000 || age < -30000) throw failure('SIGNATURE_EXPIRED', 'La lectura está fuera del intervalo de cinco minutos permitido.');
    const valid = crypto.verify('sha256', Buffer.from(signedContent(envelope)), publicKey, Buffer.from(envelope.signature, 'base64url'));
    if (!valid) throw failure('SIGNATURE_INVALID', 'La firma no corresponde a la lectura recibida. Revisa si los datos fueron alterados.');
    used.add(envelope.nonce);
    return { verified: true, deviceId, nonce: envelope.nonce, payload: envelope.payload, algorithm: 'ECDSA-P256-SHA256' };
  }

  return { sign, verify };
}

module.exports = { createSignatureLab };
