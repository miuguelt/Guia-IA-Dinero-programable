const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { isoCBOR } = require('@simplewebauthn/server/helpers');
const { createWebAuthnLab } = require('../../backend/security/webauthn.cjs');

function setup(options = {}) {
  const saved = new Map();
  const store = {
    async saveCredential(value) { saved.set(value.id, value); },
    async getCredential(id) { return saved.get(id); },
    async updateCredential(id, counter) { saved.get(id).counter = counter; },
    async listCredentials(sessionId) { return [...saved.values()].filter(value => value.sessionId === sessionId); }
  };
  return { store, lab: createWebAuthnLab({ store, ...options }), saved };
}

function authenticator() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const idBytes = crypto.randomBytes(32);
  const id = idBytes.toString('base64url');
  function client(type, challenge, origin) { return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false })); }
  function data(flags, count) {
    const counter = Buffer.alloc(4); counter.writeUInt32BE(count);
    return Buffer.concat([crypto.createHash('sha256').update('localhost').digest(), Buffer.from([flags]), counter]);
  }
  function registration(challenge, origin = 'http://localhost:8153') {
    const cose = new Map([[1, 2], [3, -7], [-1, 1], [-2, new Uint8Array(Buffer.from(jwk.x, 'base64url'))], [-3, new Uint8Array(Buffer.from(jwk.y, 'base64url'))]]);
    const length = Buffer.alloc(2); length.writeUInt16BE(idBytes.length);
    const authData = Buffer.concat([data(0x45, 0), Buffer.alloc(16), length, idBytes, Buffer.from(isoCBOR.encode(cose))]);
    const attestation = isoCBOR.encode(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', new Uint8Array(authData)]]));
    return { id, rawId: id, type: 'public-key', clientExtensionResults: {}, response: { clientDataJSON: client('webauthn.create', challenge, origin).toString('base64url'), attestationObject: Buffer.from(attestation).toString('base64url'), transports: ['internal'] } };
  }
  function authentication(challenge, count = 1, origin = 'http://localhost:8153') {
    const authData = data(0x05, count);
    const clientData = client('webauthn.get', challenge, origin);
    const signed = Buffer.concat([authData, crypto.createHash('sha256').update(clientData).digest()]);
    return { id, rawId: id, type: 'public-key', clientExtensionResults: {}, response: { authenticatorData: authData.toString('base64url'), clientDataJSON: clientData.toString('base64url'), signature: crypto.sign('sha256', signed, privateKey).toString('base64url'), userHandle: null } };
  }
  return { id, registration, authentication };
}

test('registro y autenticación verifican realmente una firma FIDO y actualizan contador', async () => {
  const { lab, saved } = setup();
  const device = authenticator();
  const options = await lab.registrationOptions('session-1');
  assert.equal(options.rp.id, 'localhost');
  const registration = await lab.register('session-1', device.registration(options.challenge));
  assert.equal(registration.registered, true);
  assert.equal(registration.verified, true);
  const auth = await lab.authenticationOptions('session-1');
  assert.equal(auth.allowCredentials[0].id, device.id);
  const authentication = await lab.authenticate('session-1', device.authentication(auth.challenge));
  assert.equal(authentication.authenticated, true);
  assert.equal(authentication.verified, true);
  assert.equal(saved.get(device.id).counter, 1);
  assert.equal('privateKey' in saved.get(device.id), false);
  await assert.rejects(lab.authenticate('session-1', device.authentication(auth.challenge)), { code: 'CHALLENGE_INVALID' });
});

test('rechaza origen alterado, sesión diferente, credencial desconocida y desafíos vencidos', async () => {
  let now = 1000;
  const { lab } = setup({ now: () => now });
  const device = authenticator();
  const options = await lab.registrationOptions('s1');
  await assert.rejects(lab.register('s2', device.registration(options.challenge)), { code: 'CHALLENGE_INVALID' });
  await assert.rejects(lab.register('s1', device.registration(options.challenge, 'https://example.com')), { code: 'WEBAUTHN_INVALID' });
  const expired = await lab.registrationOptions('s1');
  now += 120001;
  await assert.rejects(lab.register('s1', device.registration(expired.challenge)), { code: 'CHALLENGE_INVALID' });
  await assert.rejects(lab.authenticationOptions('s1'), { code: 'CREDENTIAL_MISSING' });
  const fresh = await lab.registrationOptions('s1');
  await lab.register('s1', device.registration(fresh.challenge));
  const login = await lab.authenticationOptions('s1');
  await assert.rejects(lab.authenticate('s1', { ...device.authentication(login.challenge), id: 'unknown' }), { code: 'CREDENTIAL_MISSING' });
});

test('rechaza firma de autenticación alterada y respuesta de otra sesión', async () => {
  const { lab, saved } = setup();
  const device = authenticator();
  const registration = await lab.registrationOptions('s1');
  await lab.register('s1', device.registration(registration.challenge));
  const login = await lab.authenticationOptions('s1');
  const response = device.authentication(login.challenge);
  response.response.signature = crypto.randomBytes(70).toString('base64url');
  await assert.rejects(lab.authenticate('s1', response), { code: 'WEBAUTHN_INVALID' });
  const other = await lab.authenticationOptions('s1');
  saved.get(device.id).sessionId = 'different';
  await assert.rejects(lab.authenticate('s1', device.authentication(other.challenge)), { code: 'CREDENTIAL_MISSING' });
  await assert.rejects(lab.registrationOptions(''), { code: 'SESSION_INVALID' });
  assert.throws(() => setup({ origin: 'http://example.com' }), { code: 'ORIGIN_INVALID' });
});
