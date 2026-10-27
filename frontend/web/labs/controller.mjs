import { readLabInput, resultView } from './view.mjs';
import { createSimulationState, simulateLab } from './simulation.mjs';
import { labs } from './catalog.mjs';

export function createLabController({ window: win, document, state, progress, api, auth, sdk, notify, updateProgressUi }) {
  function updateResult(labId, record) {
    state.results[labId] = record;
    document.getElementById('run-result-' + labId).innerHTML = resultView(record, labId);
  }

  function setLabMode(lab, mode) {
    state.modes[lab.id] = mode;
    const detail = document.getElementById('lab/' + lab.id);
    const form = detail.querySelector('[data-lab-form]');
    state.inputs[lab.id] = readLabInput(form, lab);
    const controller = state.controllers[lab.id];
    if (controller) controller.abort();
    delete state.controllers[lab.id];
    delete state.results[lab.id];
    detail.querySelector('#mode-description-' + lab.id).textContent = mode === 'real'
      ? 'Se ejecutan operaciones en tu entorno local. No se reemplazarán por una simulación si hay un error.'
      : 'Exploras reglas del ejercicio. No se envían transacciones ni se ejecutan herramientas.';
    detail.querySelector('#run-mode-' + lab.id).textContent = mode === 'real' ? 'Real local' : 'Simulación';
    detail.querySelector('#run-lab-' + lab.id).innerHTML = `Ejecutar ${mode === 'real' ? 'en entorno local' : 'simulación'}`;
    updateResult(lab.id, null);
  }

  async function execute(form) {
    const lab = labs.find(item => item.id === form.dataset.lab);
    const input = readLabInput(form, lab);
    state.inputs[lab.id] = input;
    const button = document.getElementById('run-lab-' + lab.id);
    button.disabled = true;
    const controller = new AbortController();
    state.controllers[lab.id] = controller;
    const mode = state.modes[lab.id] || 'simulation';
    const observed = record => {
      if (state.controllers[lab.id] === controller && !controller.signal.aborted) updateResult(lab.id, record);
    };
    try {
      const simulation = state.simulations[lab.id] ||= createSimulationState();
      const result = mode === 'simulation' ? simulateLab(lab.id, input, simulation) : await api.run(lab.id, input, observed, controller.signal);
      if (controller.signal.aborted) return;
      observed(result);
      if (result.status === 'completed' && result.verificationComplete === false) {
        notify('La ejecución terminó y la indexación sigue pendiente. Revisa PostgreSQL y sincroniza los eventos en el laboratorio 12 antes de registrar la práctica.');
      } else if (result.status === 'completed' && mode === 'real') {
        const firstVerification = !progress.read().verified.includes(lab.id);
        progress.verifyLab(lab.id, 'real');
        if (firstVerification) sdk.app.gamification.addXP(50, 'Práctica real verificada: ' + lab.title);
        updateProgressUi();
        notify('Práctica real verificada. Conserva la referencia de ejecución.');
      } else if (result.status === 'completed') notify('Simulación terminada. Revisa el resultado del ejercicio.');
    } catch (error) {
      if (!controller.signal.aborted) observed({ labId: lab.id, mode, status: 'failed', error: { message: error.message } });
    } finally {
      if (state.controllers[lab.id] === controller) {
        delete state.controllers[lab.id];
        button.disabled = false;
      }
    }
  }

  async function authenticate(action) {
    const labId = state.route.labId;
    const status = document.getElementById('auth-status-' + labId);
    if (state.modes[labId] !== 'real') { status.textContent = 'Selecciona Real local para practicar con el autenticador.'; return; }
    status.textContent = 'Espera la solicitud del navegador y sigue sus instrucciones.';
    try { status.textContent = await auth(action, api, win.navigator); }
    catch (error) { status.textContent = 'No se completó la práctica: ' + error.message; }
  }

  function onSubmit(event) {
    if (!event.target.matches('[data-lab-form]')) return;
    event.preventDefault();
    void execute(event.target);
  }

  function onChange(event) {
    if (event.target.name !== 'mode' || state.route.page !== 'lab') return;
    const lab = labs.find(item => item.id === state.route.labId);
    setLabMode(lab, event.target.value);
  }

  function resetLab(labId) {
    const detail = document.getElementById('lab/' + labId);
    detail.querySelector('[data-lab-form]').reset();
    delete state.simulations[labId];
    delete state.results[labId];
    delete state.inputs[labId];
    setLabMode(labs.find(lab => lab.id === labId), 'simulation');
    notify('Se reinició el modelo de la simulación. La red local conserva su estado.');
  }

  async function copyCode(button) {
    try {
      await win.navigator.clipboard.writeText(document.getElementById(button.dataset.copyCode).textContent);
      button.textContent = 'Copiado';
      notify('Código copiado. Revisa el contexto antes de ejecutarlo.');
    } catch { notify('No se pudo copiar. Selecciona el código y cópialo con el teclado.'); }
  }

  return { updateResult, setLabMode, execute, authenticate, onSubmit, onChange, resetLab, copyCode };
}
