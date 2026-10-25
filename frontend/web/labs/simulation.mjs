import { evaluateMilk, evaluateHoney, numeric, parseEtherInput, formatEtherValue } from './rules.mjs';

// Mismas tareas que ejecuta backend/audit/runner.cjs en la modalidad real.
export const PC_COMMANDS = {
  compile: ['npx hardhat compile'],
  test: ['npx hardhat test'],
  audit: ['npx hardhat compile', 'npx hardhat test --no-compile test/WithdrawalSecurity.test.js', 'Slither mediante backend/audit/slither_driver.py'],
};

export function createSimulationState() {
  return { voted: false, votes: [0, 0, 0], quarantine: {}, balance: 10n ** 18n, pending: 0n, events: [] };
}
function simulateElection(input, state) {
  const candidate = numeric(input.candidate, 1);
  if (![1, 2, 3].includes(candidate)) throw new Error('Selecciona una opción de voto válida.');
  if (input.scenario === 'invalid') throw new Error('La prueba propuesta es inválida; no se cuenta el voto.');
  if (input.scenario === 'replay' || state.voted) throw new Error('La identidad ya participó en este proceso; se rechaza la repetición.');
  state.voted = true;
  state.votes[candidate - 1]++;
  return { accepted: true, count: state.votes.reduce((sum, count) => sum + count, 0), votes: [...state.votes], explanation: 'Se aplicó el modelo de pertenencia y voto único. En simulación no se genera una prueba criptográfica.' };
}
function simulatePharma(input, state) {
  const temperature = numeric(input.temperature, 4.2);
  const batchId = String(input.batchId || 'LOTE-01');
  state.quarantine[batchId] = Boolean(state.quarantine[batchId]) || temperature < 2 || temperature > 8;
  return { batchId, temperature, quarantined: state.quarantine[batchId], explanation: 'Rango del ejercicio: de 2 a 8 °C, ambos incluidos. La cuarentena permanece para este lote.' };
}
function simulateEvm(input, state) {
  const action = input.action || 'deposit';
  if (action === 'deposit') state.balance += parseEtherInput(input.amountEth);
  else if (action === 'authorize') {
    const amount = parseEtherInput(input.amountEth);
    if (amount > state.balance) throw new Error('La garantía disponible es insuficiente.');
    state.balance -= amount;
    state.pending += amount;
  } else if (action === 'withdraw') {
    if (!state.pending) throw new Error('No hay saldo pendiente de retiro. Autoriza un pago primero.');
    state.pending = 0n;
  } else if (action !== 'balance') throw new Error('Operación desconocida.');
  return { action, balanceEth: formatEtherValue(state.balance), pendingEth: formatEtherValue(state.pending), explanation: 'Modelo de saldos del ejercicio. No se envió una transacción.' };
}
function simulateActivity(id, input, state) {
  switch (id) {
    case 'elections': return simulateElection(input, state);
    case 'signatures': return { accepted: !input.tamper && !input.replay, reading: numeric(input.reading, 4.2), explanation: input.tamper ? 'El cambio de contenido invalida la autorización.' : input.replay ? 'El paquete ya fue utilizado.' : 'El modelo acepta un paquete sin alteración. La firma real se ejecuta en la otra modalidad.' };
    case 'pipeline': return { ...evaluateMilk(input), steps: ['Captura de parámetros', 'Modelo de firma', 'Comprobación de integridad', 'Evaluación por reglas', 'Modelo de autorización', 'Modelo de indexación'], explanation: 'Este recorrido explica las etapas sin enviar transacciones ni escribir en PostgreSQL.' };
    case 'pharma': return simulatePharma(input, state);
    case 'honey': return evaluateHoney(input);
    case 'audit': return { checks: ['Permisos del oráculo', 'Estado antes de llamadas externas', 'Lote de un solo uso', 'Retiro sin saldo'], explanation: 'Lista de revisión didáctica. Slither y las pruebas se ejecutan en la modalidad real.' };
    case 'evm': return simulateEvm(input, state);
    case 'myths': {
      const result = evaluateMilk(input);
      return { ...result, predictionCorrect: (input.prediction === 'approved') === result.accepted };
    }
    case 'comparison': return { scenarios: [{ name: 'Depósito', effect: 'Aumenta la garantía' }, { name: 'Autorización', effect: 'Reserva un saldo pendiente' }, { name: 'Retiro', effect: 'Transfiere al beneficiario' }], explanation: 'El gas se mide al ejecutar transacciones reales; no se asignan cifras inventadas.' };
    case 'pc': return { task: input.task || 'compile', commands: PC_COMMANDS[input.task] || PC_COMMANDS.compile, explanation: 'Comandos que ejecuta la modalidad real. La simulación no ejecuta procesos ni informa que las pruebas pasaron.' };
    case 'architecture': return { layers: ['Navegador', 'API', 'Evaluador', 'Contrato', 'Indexador', 'PostgreSQL'], explanation: 'Cada capa tiene una responsabilidad. La práctica WebAuthn requiere modalidad real y un navegador compatible.' };
    case 'database': return { action: input.action || 'sync', rows: state.events.length, duplicates: 0, explanation: 'Modelo de proyección con identidad única por evento; no se abrió una conexión PostgreSQL.' };
    default: throw new Error('Laboratorio desconocido.');
  }
}
export function simulateLab(labId, input = {}, state = createSimulationState()) {
  try {
    return { labId, mode: 'simulation', status: 'completed', result: simulateActivity(labId, input, state), evidenceRefs: [] };
  } catch (error) {
    return { labId, mode: 'simulation', status: 'failed', error: { code: 'EXERCISE_REJECTED', message: error.message, retryable: true }, evidenceRefs: [] };
  }
}
