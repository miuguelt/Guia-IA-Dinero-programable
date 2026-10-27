import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256, blockHash, buildChain, tamperChain, verifyChain, GENESIS_PREVIOUS, PRACTICE_DATA } from '../../frontend/web/labs/chain-model.mjs';
import { simulateLab } from '../../frontend/web/labs/simulation.mjs';

const nodeSha = text => createHash('sha256').update(text, 'utf8').digest('hex');

test('sha256 coincide con los vectores estándar y con node:crypto, incluidos textos con tildes y varios bloques', () => {
  assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  for (const text of ['Garantía depositada: 0,01 ETH', 'ñ'.repeat(40), 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(200)]) {
    assert.equal(sha256(text), nodeSha(text), text.slice(0, 20));
  }
});

test('buildChain enlaza cada bloque con el hash del anterior desde un génesis de ceros', () => {
  const chain = buildChain();
  assert.equal(chain.length, PRACTICE_DATA.length);
  assert.equal(chain[0].previousHash, GENESIS_PREVIOUS);
  for (let index = 1; index < chain.length; index++) assert.equal(chain[index].previousHash, chain[index - 1].hash);
  assert.equal(chain[2].hash, blockHash({ number: 2, previousHash: chain[1].hash, data: chain[2].data }));
  assert.ok(verifyChain(chain).every(block => block.valid));
  assert.throws(() => buildChain([]), /al menos un bloque/);
});

test('alterar un bloque sin recalcular su hash lo delata a él; recalcularlo rompe el enlace del siguiente', () => {
  const chain = buildChain();
  const altered = tamperChain(chain, 1, 'Depósito de garantía: 9,00 ETH', { rehash: false });
  assert.notEqual(altered, chain);
  assert.equal(chain[1].data, PRACTICE_DATA[1], 'la cadena original no cambia');
  assert.deepEqual(verifyChain(altered).map(block => block.status), ['intact', 'content-changed', 'intact', 'intact']);

  const rehashed = tamperChain(chain, 1, 'Depósito de garantía: 9,00 ETH', { rehash: true });
  assert.deepEqual(verifyChain(rehashed).map(block => block.status), ['intact', 'intact', 'link-broken', 'intact']);

  const last = tamperChain(chain, 3, 'Retiro a otra cuenta', { rehash: true });
  assert.ok(verifyChain(last).every(block => block.valid));
  assert.throws(() => tamperChain(chain, 9, 'x'), /bloque válido/);
});

test('el laboratorio de bloques explica cada caso con la tabla de la cadena', () => {
  const intact = simulateLab('blocks', { block: '1', data: '', rehash: false });
  assert.equal(intact.status, 'completed');
  assert.equal(intact.result.intact, true);
  assert.equal(intact.result.blocks.length, 4);
  assert.deepEqual(Object.keys(intact.result.blocks[0]), ['blockNumber', 'data', 'previousHash', 'hash', 'status']);
  assert.equal(intact.result.blocks[0].status, 'Íntegro');
  assert.match(intact.result.explanation, /íntegra/);

  const changed = simulateLab('blocks', { block: '2', data: 'Evaluación del lote: rechazada', rehash: false });
  assert.equal(changed.result.intact, false);
  assert.equal(changed.result.blocks[2].status, 'Contenido alterado');
  assert.match(changed.result.explanation, /bloque 2/);

  const rehashed = simulateLab('blocks', { block: '1', data: 'Depósito de garantía: 9,00 ETH', rehash: true });
  assert.equal(rehashed.result.blocks[2].status, 'Enlace roto');
  assert.match(rehashed.result.explanation, /bloque 2 todavía guarda/);

  const tip = simulateLab('blocks', { block: '3', data: 'Retiro a otra cuenta', rehash: true });
  assert.equal(tip.result.intact, true);
  assert.match(tip.result.explanation, /otros nodos/);

  assert.equal(simulateLab('blocks', { block: '7', data: 'x' }).status, 'failed');
  assert.equal(simulateLab('blocks', { block: '1', data: 'x'.repeat(61) }).status, 'failed');
});
