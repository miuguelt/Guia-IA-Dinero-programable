// Modelo didáctico de una cadena de bloques: cada bloque guarda el hash del anterior.
// Usa SHA-256 síncrono para calcular en el navegador sin dependencias; Ethereum usa Keccak-256.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

export function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const length = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(length);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(length - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(length - 4, (bytes.length * 8) >>> 0);
  const hash = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, h].forEach((value, i) => { hash[i] = hash[i] + value; });
  }
  return [...hash].map(value => value.toString(16).padStart(8, '0')).join('');
}

export const GENESIS_PREVIOUS = '0'.repeat(64);
export const PRACTICE_DATA = ['Génesis del aula', 'Depósito de garantía: 0,01 ETH', 'Evaluación del lote: aprobada', 'Retiro del pago al productor'];

export const blockHash = ({ number, previousHash, data }) => sha256(`${number}|${previousHash}|${data}`);

export function buildChain(data = PRACTICE_DATA) {
  if (!data.length) throw new Error('La cadena necesita al menos un bloque.');
  const chain = [];
  for (const [number, text] of data.entries()) {
    const previousHash = number ? chain[number - 1].hash : GENESIS_PREVIOUS;
    chain.push({ number, data: text, previousHash, hash: blockHash({ number, previousHash, data: text }) });
  }
  return chain;
}

// Cambia el contenido de un bloque; con `rehash` también recalcula solo el hash de ese bloque.
export function tamperChain(chain, index, data, { rehash = false } = {}) {
  if (!Number.isInteger(index) || !chain[index]) throw new Error('Elige un bloque válido de la cadena.');
  return chain.map(block => {
    if (block.number !== index) return { ...block };
    const altered = { ...block, data };
    return rehash ? { ...altered, hash: blockHash(altered) } : altered;
  });
}

export function verifyChain(chain) {
  return chain.map((block, index) => {
    const expectedPrevious = index ? chain[index - 1].hash : GENESIS_PREVIOUS;
    const status = blockHash(block) !== block.hash ? 'content-changed' : block.previousHash !== expectedPrevious ? 'link-broken' : 'intact';
    return { ...block, status, valid: status === 'intact' };
  });
}
