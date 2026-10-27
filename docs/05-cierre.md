# 05 · Cierre técnico reproducible

Una entrega está cerrada cuando otra persona puede ejecutarla desde cero y obtener los mismos resultados. Este documento acompaña la evidencia MG-A05 y prepara la propuesta final del módulo 6.

## Qué demuestras

| Comprobación | Comando en el taller | Qué observas |
|---|---|---|
| Pruebas de todas las etapas | `npm test` | El resumen termina sin pruebas fallidas. |
| Cobertura de funciones JavaScript | `npm run cobertura` | El porcentaje de funciones ejecutadas por las pruebas. |
| Sincronización sin duplicados | `npm run etapa:5` | Repetir la sincronización conserva el número de registros y reconstruir la proyección recupera los mismos eventos. La versión con PostgreSQL pertenece al nivel completo. |
| Recorrido completo | `npm run demo` | El archivo `evidencia-taller.md` con el dictamen, la autorización, el retiro y los eventos leídos. |

La cobertura indica qué funciones se ejecutaron; no demuestra que las aserciones sean suficientes. Por eso la ficha también pide un fallo provocado.

## Un fallo provocado y su corrección

1. Abre `src/reglas.js` y cambia `temperaturaMaxima` de 4 a 3.
2. Ejecuta `npm run etapa:1` y copia el nombre de la prueba que falla y su mensaje.
3. Restaura el valor original y vuelve a ejecutar la etapa para comprobar que pasa.
4. Explica qué comportamiento detectó la prueba y por qué.

## Para tu evidencia MG-A05

Este documento respalda la ficha del módulo 5, paso Aplica (`#m5/3`).

- **Observa:** pega los resúmenes reales de `npm test` y `npm run cobertura` y, si tienes el nivel completo, la salida de `npm run etapa:5` con PostgreSQL.
- **Explica:** compara el número de registros antes y después de sincronizar dos veces, y describe el fallo provocado, su causa y la comprobación posterior.
- **Tu proyecto:** escribe los requisitos y comandos que otra persona necesita para ejecutar tu entrega desde cero.

En el módulo 6 (`#m6/3`) reúnes los bloques «Tu proyecto» de MG-A01 a MG-A05 en una sola propuesta: proceso y decisión, actores, regla de permiso, dato externo y pasos de reproducción.
