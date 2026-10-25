const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSignatureLab } = require('../../backend/security/signatures.cjs');

test('firma verificable, identidad registrada y nonce de un solo uso', () => {
  const lab = createSignatureLab();
  const reading = { batchId: 'LOTE-01', temperature: 4.2, readings: [2, 4], nested: { valid: true, note: null } };
  const envelope = lab.sign(reading);
  assert.match(envelope.signature, /^[A-Za-z0-9_-]+$/);
  assert.ok(envelope.publicKey.includes('PUBLIC KEY'));
  assert.equal('privateKey' in envelope, false);
  assert.deepEqual(lab.verify(envelope).payload, reading);
  assert.throws(() => lab.verify(envelope), { code: 'SIGNATURE_REPLAY' });
});

test('rechaza alteración de datos, firma, identidad y claves de otro firmante', () => {
  const lab = createSignatureLab();
  const envelope = lab.sign({ temperature: 4.2, batchId: 'L1' });
  assert.throws(() => lab.verify({ ...envelope, payload: { temperature: 12 } }), { code: 'SIGNATURE_INVALID' });
  assert.throws(() => lab.verify({ ...envelope, signature: 'invalid' }), { code: 'SIGNATURE_INVALID' });
  assert.throws(() => lab.verify({ ...envelope, deviceId: 'unknown' }), { code: 'DEVICE_UNKNOWN' });
  assert.throws(() => createSignatureLab().verify(envelope), { code: 'DEVICE_UNKNOWN' });
  assert.equal(lab.verify(envelope).verified, true);
});

test('canoniza claves sin aceptar valores inválidos, datos vacíos ni objetos no JSON', () => {
  const lab = createSignatureLab();
  const envelope = lab.sign({ z: 1, a: 'dato', list: [false, 'lectura'] });
  assert.equal(lab.verify({ ...envelope, payload: { list: [false, 'lectura'], a: 'dato', z: 1 } }).verified, true);
  for (const input of [null, [], '', {}, { t: NaN }, { t: Infinity }, { t: undefined }, { t: new Date() }]) {
    assert.throws(() => lab.sign(input), { code: 'READING_INVALID' });
  }
  assert.throws(() => lab.verify(null), { code: 'ENVELOPE_INVALID' });
  assert.throws(() => lab.verify({}), { code: 'ENVELOPE_INVALID' });
});

test('rechaza lecturas caducadas o futuras y conserva estado por firmante', () => {
  let time = 10000;
  const lab = createSignatureLab({ now: () => time });
  const old = lab.sign({ batchId: 'old' });
  time += 300001;
  assert.throws(() => lab.verify(old), { code: 'SIGNATURE_EXPIRED' });
  const future = lab.sign({ batchId: 'future' });
  time -= 30001;
  assert.throws(() => lab.verify(future), { code: 'SIGNATURE_EXPIRED' });
});
