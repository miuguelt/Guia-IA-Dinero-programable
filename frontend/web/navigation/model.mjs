import { modules } from '../learning/catalog.mjs';
import { labs } from '../labs/catalog.mjs';
import { etapas } from '../taller/catalog.mjs';

export function normalize(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
export function plainText(value) {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
export function searchGuide(query) {
  const term = normalize(query);
  if (!term) return [];
  const lessons = modules.flatMap(module => module.steps.map((step, index) => ({
    title: module.title + ' · ' + step.title, route: module.id + '/' + index, text: plainText(step.body), kind: 'Lección'
  })));
  const activities = labs.map(lab => ({ title: lab.title, route: 'lab/' + lab.id, text: lab.goal + ' ' + lab.requirements + ' ' + lab.steps.join(' '), kind: 'Laboratorio' }));
  const workshop = etapas.map(etapa => ({ title: 'Etapa ' + etapa.numero + ' · ' + etapa.titulo, route: 'taller/' + etapa.numero, text: plainText([etapa.objetivo, etapa.conceptos, ...etapa.pasos, etapa.comprobar.comando, ...etapa.codigo.map(bloque => bloque.texto)].join(' ')), kind: 'Taller' }));
  const setup = [{ title: 'Prepara tu equipo', route: 'preparar', text: 'Instalación en dos niveles con winget: Node.js 24, VS Code, PowerShell 7, Git, PostgreSQL 18, uv y Slither. Lenguajes JavaScript, Solidity y SQL. Glosario y problemas frecuentes.', kind: 'Preparación' }, { title: 'Publica la guía en tu VPS', route: 'publicar', text: 'Docker Compose y Coolify para publicar la guía web y el servidor EVM propio con Foundry Anvil (docker-compose.anvil.yml), Traefik Basic Auth, conexión RPC desde local con Hardhat y sincronización híbrida hacia PostgreSQL 18.', kind: 'Anexo' }];
  return [...lessons, ...activities, ...workshop, ...setup].filter(item => normalize(item.title + ' ' + item.text).includes(term)).map(item => {
    const position = Math.max(0, normalize(item.text).indexOf(term));
    const start = Math.max(0, position - 55);
    return { ...item, snippet: (start ? '… ' : '') + item.text.slice(start, start + 180) + (item.text.length > start + 180 ? '…' : '') };
  }).slice(0, 16);
}
export function resolveRoute(hash) {
  const value = String(hash).replace(/^#\/?/, '');
  const aliases = { welcome: 'home', 'multi-sim': 'labs', simuladores: 'labs', portafolio: 'portfolio', instalacion: 'preparar', construye: 'taller' };
  const route = aliases[value] || value;
  const [page, segment] = route.split('/');
  if (/^m[1-6]$/.test(page)) return { page, step: /^[0-3]$/.test(segment) ? Number(segment) : 0, route: page + '/' + (/^[0-3]$/.test(segment) ? segment : '0') };
  if (page === 'lab' && labs.some(lab => lab.id === segment)) return { page, labId: segment, route: page + '/' + segment };
  if (page === 'taller' && /^[0-6]$/.test(segment || '')) return { page: 'etapa', etapa: Number(segment), route: 'taller/' + segment };
  if (['home', 'labs', 'portfolio', 'preparar', 'taller', 'publicar'].includes(page)) return { page, route: page };
  return { page: 'home', route: 'home' };
}
