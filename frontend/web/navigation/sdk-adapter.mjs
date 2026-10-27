import { composeEvidence } from '../evidence/view.mjs';

export function mountGuideSdk({ window, root, main, modules, initialHash, initialPageId }) {
  const sdk = window.DevBrainSDK;
  if (!sdk?.createApp || !sdk.reader?.montarLector || !sdk.evidence?.montar) {
    throw new Error('No se pudo cargar el SDK de aprendizaje de la guía.');
  }
  root.classList.add('guide-reader');
  const baseUrl = new URL(window.location.href);
  if (baseUrl.hash !== '#' + initialPageId) {
    baseUrl.hash = initialPageId;
    window.history.replaceState(null, '', baseUrl.href);
  }
  const app = sdk.createApp({
    storagePrefix: 'aula-dinero-v2',
    routerContainer: main,
    sidebarContainer: window.document.createElement('nav'),
    modules: [
      { id: 'home', title: 'Inicio' },
      ...modules.map(module => ({ id: module.id, title: module.title })),
      { id: 'preparar', title: 'Prepara tu equipo' },
      { id: 'taller', title: 'Taller AgroPay' },
      { id: 'labs', title: 'Laboratorios' },
      { id: 'portfolio', title: 'Portafolio de Evidencias' },
      { id: 'publicar', title: 'Publica en tu VPS' }
    ]
  });
  const reader = sdk.reader.montarLector({ raiz: root, app, initialHash });
  return { sdk, app, reader };
}

export function seedLearnerProgress(app, progress, modules) {
  const saved = app.storage.get('completed');
  const completed = new Set([
    ...progress.read().completed,
    ...(Array.isArray(saved) ? saved : [])
  ]);
  for (const module of modules) {
    if (completed.has(module.id)) {
      progress.complete(module.id);
      app.navigation.markComplete(module.id);
    }
  }
  const targetXp = progress.read().xp;
  const missingXp = targetXp - app.gamification.getXP();
  if (missingXp > 0) app.gamification.addXP(missingXp, 'Progreso existente de la guía');
}

export async function mountGuideEvidence({ sdk, root, registry, progress, onChange = () => {} }) {
  const prefix = 'aula-dinero-v2';
  const legacyStore = new sdk.evidence.Store(prefix);
  for (const artifact of registry.artifacts) {
    const saved = String(legacyStore.leer(artifact.id).values?.evidencia || '');
    const legacy = progress.read().evidence[artifact.id];
    if (saved) progress.saveEvidence(artifact.id, saved);
    else if (legacy) legacyStore.guardar(artifact.id, { values: { evidencia: legacy }, status: 'borrador' });
  }
  const mounted = await sdk.evidence.montar({
    registro: registry,
    prefijo: prefix,
    raiz: root,
    dossierHref: '#portfolio'
  });
  // El texto anterior vive en el campo opcional «evidencia»; la ficha lo compone junto a los bloques.
  const byId = new Map(registry.artifacts.map(artifact => [artifact.id, artifact]));
  const unsubscribe = mounted.store.suscribir((id, record) => {
    if (!byId.has(id)) return;
    progress.saveEvidence(id, composeEvidence(byId.get(id), record.values));
    onChange(id);
  });
  for (const artifact of registry.artifacts) {
    const saved = composeEvidence(artifact, mounted.store.leer(artifact.id).values);
    if (saved) progress.saveEvidence(artifact.id, saved);
  }
  return { mounted, destroy: unsubscribe };
}
