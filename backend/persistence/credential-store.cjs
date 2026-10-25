function invalid() {
  return Object.assign(new Error('La credencial debe incluir únicamente su identificador, sesión, clave pública y contador válido.'), { code: 'CREDENTIAL_INVALID' });
}

function createCredentialStore(pool) {
  async function saveCredential(credential) {
    if (!credential.id || !credential.sessionId || !(credential.publicKey instanceof Uint8Array) || !Number.isSafeInteger(credential.counter) || credential.counter < 0 || credential.privateKey) throw invalid();
    await pool.query('INSERT INTO guide_credentials(id,session_id,public_key,counter,transports) VALUES($1,$2,$3,$4,$5)',
      [credential.id, credential.sessionId, Buffer.from(credential.publicKey), credential.counter, JSON.stringify(credential.transports || [])]);
    return { id: credential.id, stored: true };
  }
  async function getCredential(id) {
    const { rows } = await pool.query('SELECT id,session_id,public_key,counter,transports FROM guide_credentials WHERE id=$1', [id]);
    const row = rows[0];
    return row ? { id: row.id, sessionId: row.session_id, publicKey: new Uint8Array(row.public_key), counter: Number(row.counter), transports: row.transports } : null;
  }
  async function updateCredential(id, counter) {
    if (!id || !Number.isSafeInteger(counter) || counter < 0) throw invalid();
    await pool.query('UPDATE guide_credentials SET counter=$2 WHERE id=$1 AND counter<=$2', [id, counter]);
    return { id, counter };
  }
  async function listCredentials(sessionId) {
    const { rows } = await pool.query('SELECT id,session_id,public_key,counter,transports FROM guide_credentials WHERE session_id=$1', [sessionId]);
    return rows.map(row => ({ id: row.id, sessionId: row.session_id, publicKey: new Uint8Array(row.public_key), counter: Number(row.counter), transports: row.transports }));
  }
  return { saveCredential, getCredential, updateCredential, listCredentials };
}
module.exports = { createCredentialStore };
