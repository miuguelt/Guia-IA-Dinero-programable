const crypto = require('node:crypto');
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');

function failure(code, message) { return Object.assign(new Error(message), { code, retryable: false }); }

function createWebAuthnLab({ store, origin = 'http://localhost:8153', now = Date.now }) {
  const url = new URL(origin);
  if (url.hostname !== 'localhost' || !['http:', 'https:'].includes(url.protocol)) throw failure('ORIGIN_INVALID', 'La práctica de credenciales funciona desde localhost.');
  const challenges = new Map();
  const registered = new Map();

  function validateSession(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 256) throw failure('SESSION_INVALID', 'La sesión de la práctica no es válida. Recarga la guía.');
  }

  function consume(sessionId, type) {
    const value = challenges.get(sessionId);
    challenges.delete(sessionId);
    if (!value || value.type !== type || now() - value.createdAt > 120000) throw failure('CHALLENGE_INVALID', 'El desafío no existe, venció o ya se utilizó. Inicia la operación de nuevo.');
    return value.challenge;
  }

  async function credentials(sessionId) {
    if (store.listCredentials) return store.listCredentials(sessionId);
    const id = registered.get(sessionId);
    const credential = id ? await store.getCredential(id) : null;
    return credential ? [credential] : [];
  }

  async function registrationOptions(sessionId) {
    validateSession(sessionId);
    const existing = await credentials(sessionId);
    const options = await generateRegistrationOptions({
      rpName: 'Aula de dinero programable', rpID: 'localhost', userName: `aprendiz-${sessionId.slice(0, 8)}`,
      userID: new Uint8Array(crypto.createHash('sha256').update(sessionId).digest()),
      attestationType: 'none', supportedAlgorithmIDs: [-7], timeout: 120000,
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      excludeCredentials: existing.map(credential => ({ id: credential.id, transports: credential.transports }))
    });
    challenges.set(sessionId, { type: 'registration', challenge: options.challenge, createdAt: now() });
    return options;
  }

  async function register(sessionId, response) {
    const expectedChallenge = consume(sessionId, 'registration');
    let result;
    try {
      result = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: 'localhost', requireUserVerification: true, supportedAlgorithmIDs: [-7] });
    } catch { throw failure('WEBAUTHN_INVALID', 'No se pudo verificar el registro. Revisa el origen y vuelve a intentarlo.'); }
    if (!result.verified) throw failure('WEBAUTHN_INVALID', 'El autenticador no verificó el registro.');
    const credential = result.registrationInfo.credential;
    await store.saveCredential({ id: credential.id, sessionId, publicKey: credential.publicKey, counter: credential.counter, transports: credential.transports || [] });
    registered.set(sessionId, credential.id);
    return { registered: true, verified: result.verified, id: credential.id, userVerified: result.registrationInfo.userVerified };
  }

  async function authenticationOptions(sessionId) {
    validateSession(sessionId);
    const available = await credentials(sessionId);
    if (!available.length) throw failure('CREDENTIAL_MISSING', 'Registra primero una credencial para esta sesión.');
    const options = await generateAuthenticationOptions({ rpID: 'localhost', userVerification: 'required', timeout: 120000,
      allowCredentials: available.map(credential => ({ id: credential.id, transports: credential.transports })) });
    challenges.set(sessionId, { type: 'authentication', challenge: options.challenge, createdAt: now() });
    return options;
  }

  async function authenticate(sessionId, response) {
    const expectedChallenge = consume(sessionId, 'authentication');
    const credential = await store.getCredential(response?.id);
    if (!credential || credential.sessionId !== sessionId) throw failure('CREDENTIAL_MISSING', 'La credencial no pertenece a esta sesión. Regístrala de nuevo.');
    let result;
    try {
      result = await verifyAuthenticationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: 'localhost', credential, requireUserVerification: true });
    } catch { throw failure('WEBAUTHN_INVALID', 'La firma de autenticación no es válida. Inicia un desafío nuevo.'); }
    if (!result.verified) throw failure('WEBAUTHN_INVALID', 'El autenticador no verificó la firma.');
    await store.updateCredential(credential.id, result.authenticationInfo.newCounter);
    return { authenticated: true, verified: result.verified, id: credential.id, counter: result.authenticationInfo.newCounter, userVerified: result.authenticationInfo.userVerified };
  }

  return { registrationOptions, register, authenticationOptions, authenticate };
}

module.exports = { createWebAuthnLab };
