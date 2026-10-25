import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, createMemoryStorage } from '../../frontend/web/learning/progress.mjs';
import { searchGuide, resolveRoute } from '../../frontend/web/navigation/model.mjs';
import { modules, learningStages } from '../../frontend/web/learning/catalog.mjs';
import { labs } from '../../frontend/web/labs/catalog.mjs';
import { simulateLab, createSimulationState } from '../../frontend/web/labs/simulation.mjs';

test('migra módulos existentes y conserva evidencia sin conceder juicio del instructor', () => {
  const storage = createMemoryStorage({ guia_crypto_completed: '["m1","m3","invalid"]', guia_crypto_xp: '99999' });
  const progress = createProgress(storage);
  assert.deepEqual(progress.read().completed, ['m1', 'm3']);
  assert.equal(progress.read().xp, 300);
  assert.equal(progress.read().instructorJudgment, 'Pendiente');
  progress.complete('m1');
  assert.equal(progress.read().xp, 300);
  progress.complete('m2');
  assert.equal(progress.read().xp, 450);
  assert.equal(progress.read().completed.length, 3);
  assert.throws(() => progress.complete('bad'), /Módulo/);
});

test('tolera almacenamiento dañado y restaura la última lección y evidencias', () => {
  const storage = createMemoryStorage({ 'aula-dinero-v2': '{bad' });
  const progress = createProgress(storage);
  assert.equal(progress.read().xp, 0);
  progress.visit('m4/2');
  progress.saveEvidence('MG-A01', 'Una decisión razonada con sus límites.');
  progress.verifyLab('pharma', 'real');
  progress.verifyLab('pharma', 'real');
  progress.verifyLab('pharma', 'simulation');
  const restored = createProgress(storage).read();
  assert.equal(restored.lastRoute, 'm4/2');
  assert.equal(restored.evidence['MG-A01'], 'Una decisión razonada con sus límites.');
  assert.equal(restored.verified.length, 1);
  assert.equal(restored.xp, 50);
  assert.throws(() => progress.saveEvidence('unknown', 'texto'), /Evidencia/);
  assert.throws(() => progress.verifyLab('unknown', 'real'), /Laboratorio/);
  assert.throws(() => progress.visit('m99'), /Ruta/);
  assert.equal(createProgress(createMemoryStorage()).read().persistenceError, true);
});

test('busca explicación, comandos y acentos con fragmentos y rutas válidas', () => {
  assert.ok(searchGuide('REENTRADA').some(item => item.route.startsWith('m3')));
  assert.ok(searchGuide('oraculo').some(item => item.title.includes('Oráculo')));
  assert.ok(searchGuide('npx hardhat test').length > 0);
  assert.equal(searchGuide('xyz-no-existe').length, 0);
  assert.equal(searchGuide('  ').length, 0);
  assert.ok(searchGuide('garantia').every(item => item.snippet.length > 0));
  assert.equal(resolveRoute('#m3/2').page, 'm3');
  assert.equal(resolveRoute('#m1/99').step, 0);
  assert.equal(resolveRoute('#lab/pharma').labId, 'pharma');
  assert.equal(resolveRoute('#multi-sim').page, 'labs');
  assert.equal(resolveRoute('#portafolio').page, 'portfolio');
  assert.equal(resolveRoute('#unknown').page, 'home');
});

test('conserva seis módulos, cuatro pasos y doce laboratorios con objetivos y evidencia', () => {
  assert.equal(modules.length, 6);
  assert.ok(modules.every(module => module.steps.length === 4 && module.steps.every(step => step.body.length > 50)));
  assert.deepEqual(learningStages.map(stage => stage.modules.map(module => module.id)), [['m1', 'm2'], ['m3', 'm4'], ['m5', 'm6']]);
  assert.deepEqual(learningStages.flatMap(stage => stage.modules.map(module => module.id)), modules.map(module => module.id));
  assert.equal(new Set(labs.map(lab => lab.id)).size, 12);
  assert.ok(labs.every(lab => lab.goal && lab.evidence && lab.requirements));
});

test('la votación simulada aplica prueba requerida y rechaza doble voto sin inventar transacción', () => {
  const state = createSimulationState();
  const result = simulateLab('elections', { candidate: 1, scenario: 'valid' }, state);
  assert.equal(result.mode, 'simulation');
  assert.equal(result.result.accepted, true);
  assert.equal(result.result.count, 1);
  assert.equal(result.result.receipt, undefined);
  assert.equal(simulateLab('elections', { candidate: 1, scenario: 'replay' }, state).status, 'failed');
  assert.equal(simulateLab('elections', { candidate: 1, scenario: 'invalid' }, createSimulationState()).status, 'failed');
});

test('la cuarentena persiste y las reglas de miel rechazan valores fuera del ejercicio', () => {
  const state = createSimulationState();
  assert.equal(simulateLab('pharma', { batchId: 'A', temperature: 2 }, state).result.quarantined, false);
  assert.equal(simulateLab('pharma', { batchId: 'A', temperature: 9 }, state).result.quarantined, true);
  assert.equal(simulateLab('pharma', { batchId: 'A', temperature: 4 }, state).result.quarantined, true);
  assert.equal(simulateLab('honey', { humidity: 17, hmf: 14, deltaC13: -26 }, state).result.accepted, true);
  assert.equal(simulateLab('honey', { humidity: 21, hmf: 45, deltaC13: -12 }, state).result.accepted, false);
  assert.equal(simulateLab('pharma', { temperature: 'texto' }, state).status, 'failed');
});

test('los doce laboratorios simulan reglas observables y mantienen cantidades como cadenas', () => {
  for (const lab of labs) {
    const result = simulateLab(lab.id, lab.defaults, createSimulationState());
    assert.equal(result.labId, lab.id);
    assert.equal(result.mode, 'simulation');
    assert.ok(result.result || result.error);
  }
  const state = createSimulationState();
  assert.equal(simulateLab('pipeline', { temperature: 8, acidity: 16 }, state).result.accepted, false);
  assert.equal(simulateLab('myths', { temperature: 3, acidity: 16, prediction: 'approved' }, state).result.predictionCorrect, true);
  assert.equal(simulateLab('signatures', { reading: 4, tamper: true }, state).result.accepted, false);
  assert.equal(simulateLab('signatures', { reading: 4, replay: true }, state).result.accepted, false);
  assert.equal(simulateLab('evm', { action: 'deposit', amountEth: '0.01' }, state).result.balanceEth, '1.01');
  assert.equal(simulateLab('evm', { action: 'withdraw', amountEth: '0' }, state).status, 'failed');
  assert.equal(simulateLab('evm', { action: 'authorize', amountEth: '0.1' }, state).result.pendingEth, '0.1');
  assert.equal(simulateLab('evm', { action: 'withdraw' }, state).result.pendingEth, '0');
  assert.equal(simulateLab('evm', { action: 'balance' }, state).result.balanceEth, '0.91');
  assert.equal(simulateLab('evm', { action: 'authorize', amountEth: '999' }, state).status, 'failed');
  assert.equal(simulateLab('evm', { action: 'unknown' }, state).status, 'failed');
  assert.equal(simulateLab('database', { action: 'rebuild' }, state).result.duplicates, 0);
  assert.equal(simulateLab('no-existe', {}, state).status, 'failed');
});
