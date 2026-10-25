import { modules } from './catalog.mjs';
import { labs } from '../labs/catalog.mjs';

const KEY = 'aula-dinero-v2';
const EVIDENCE_IDS = ['MG-A01', 'MG-A02', 'MG-A03', 'MG-A04', 'MG-A05'];
const ROUTE_PATTERN = /^(home|m[1-6]\/[0-3]|labs|lab\/[a-z]+|portfolio|preparar|taller|taller\/[0-6]|publicar)$/;
export const XP_CATALOG = { module: 150, verifiedLab: 50 };
export const XP_TOTAL = modules.length * XP_CATALOG.module + labs.length * XP_CATALOG.verifiedLab;

export function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { persistent: false, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function parse(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function migrate(storage) {
  const completed = parse(storage, 'guia_crypto_completed', []);
  const evidence = {};
  for (const id of EVIDENCE_IDS) {
    const previous = parse(storage, 'guia_ia_dinero_programable_evidencia_' + id, {});
    evidence[id] = previous.values?.evidencia || '';
  }
  return { completed, verified: [], evidence, lastRoute: 'home', legacyXp: String(parse(storage, 'guia_crypto_xp', 0)) };
}
export function createProgress(storage) {
  const original = parse(storage, KEY, null) || migrate(storage);
  const moduleIds = modules.map(module => module.id);
  const labIds = labs.map(lab => lab.id);
  const state = {
    version: 2, completed: [...new Set(Array.isArray(original.completed) ? original.completed : [])].filter(id => moduleIds.includes(id)),
    verified: [...new Set(Array.isArray(original.verified) ? original.verified : [])].filter(id => labIds.includes(id)),
    evidence: Object.fromEntries(EVIDENCE_IDS.map(id => [id, String(original.evidence?.[id] || '')])),
    lastRoute: ROUTE_PATTERN.test(original.lastRoute) ? original.lastRoute : 'home',
    legacyXp: original.legacyXp || '0', instructorJudgment: 'Pendiente', persistenceError: storage.persistent === false
  };
  function save() {
    try { storage.setItem(KEY, JSON.stringify(state)); } catch { state.persistenceError = true; }
    return read();
  }
  function read() {
    return { ...structuredClone(state), xp: state.completed.length * XP_CATALOG.module + state.verified.length * XP_CATALOG.verifiedLab };
  }
  function complete(id) {
    if (!moduleIds.includes(id)) throw new Error('Módulo desconocido.');
    if (!state.completed.includes(id)) state.completed.push(id);
    return save();
  }
  function verifyLab(id, mode) {
    if (!labIds.includes(id)) throw new Error('Laboratorio desconocido.');
    if (mode === 'real' && !state.verified.includes(id)) state.verified.push(id);
    return save();
  }
  function saveEvidence(id, value) {
    if (!EVIDENCE_IDS.includes(id)) throw new Error('Evidencia desconocida.');
    state.evidence[id] = String(value).slice(0, 50000);
    return save();
  }
  function visit(route) {
    if (!ROUTE_PATTERN.test(route)) throw new Error('Ruta desconocida.');
    state.lastRoute = route;
    return save();
  }
  save();
  return { read, complete, verifyLab, saveEvidence, visit };
}
