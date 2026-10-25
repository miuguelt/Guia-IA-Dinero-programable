import { etapa0, etapa1 } from './etapas-base.mjs';
import { etapa2, etapa3 } from './etapas-contrato.mjs';
import { etapa4, etapa5, etapa6 } from './etapas-integracion.mjs';

export const etapas = [etapa0, etapa1, etapa2, etapa3, etapa4, etapa5, etapa6];
export const MINUTOS_TALLER = etapas.reduce((total, etapa) => total + etapa.minutos, 0);

export function etapasDelModulo(moduleId) {
  return etapas.filter(etapa => etapa.modulo === moduleId);
}
