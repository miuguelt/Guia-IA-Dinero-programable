import m1 from './module-1.json' with { type: 'json' };
import m2 from './module-2.json' with { type: 'json' };
import m3 from './module-3.json' with { type: 'json' };
import m4 from './module-4.json' with { type: 'json' };
import m5 from './module-5.json' with { type: 'json' };
import m6 from './module-6.json' with { type: 'json' };

export const modules = [m1, m2, m3, m4, m5, m6];
export const learningStages = [
  { id: 'fundamentos', title: 'Comprender y decidir', modules: [m1, m2] },
  { id: 'construccion', title: 'Construir y conectar', modules: [m3, m4] },
  { id: 'verificacion', title: 'Verificar y entregar', modules: [m5, m6] }
];
export const stepTitles = ['Comprende', 'Revisa el ejemplo', 'Practica', 'Aplica'];
