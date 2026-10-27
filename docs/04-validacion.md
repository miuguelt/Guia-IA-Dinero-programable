# 04 · Validación: pruebas que guían cada etapa

En el Taller AgroPay, cada etapa trae pruebas de aceptación escritas con Mocha, Chai y Hardhat en JavaScript. Las pruebas definen qué significa «terminado»: una etapa está completa cuando su comando termina sin fallos.

## Ciclo de trabajo

1. Ejecuta `npm run etapa:N` y confirma que todas las pruebas pasan: el taller viene construido.
2. Lee cada prueba junto al código que comprueba y explica qué comportamiento garantiza.
3. Cambia una regla o un valor a propósito, vuelve a ejecutar la etapa y observa qué prueba falla y por qué; luego restaura el cambio.
4. Escribe una prueba propia en `test/mis-pruebas.test.js` y ejecútala con `npm run mis-pruebas`.
5. Antes de entregar, ejecuta `npm test` para correr todas las etapas juntas.

## Ejemplo: una prueba de permisos

```javascript
it('solo el oráculo puede autorizar', async () => {
  const { contrato, otro, productor } = await loadFixture(conGarantia);
  await expect(contrato.connect(otro).autorizarPago(1, productor.address, UN_ETH))
    .to.be.revertedWithCustomError(contrato, 'SoloOraculo').withArgs(otro.address);
});
```

La prueba comprueba un resultado observable: la cuenta sin permiso recibe el error `SoloOraculo` y el estado no cambia.

## Cobertura y calidad

La cobertura indica qué funciones se ejecutaron durante las pruebas; no demuestra que las aserciones sean suficientes ni que el contrato sea seguro. La solución de referencia del taller alcanza el 100 % de funciones en JavaScript y en Solidity; el repositorio de la guía lo verifica con `npm run test:taller`.

| Comando | Para qué sirve |
|---|---|
| `npm run etapa:N` | Prueba una etapa. |
| `npm test` | Prueba todas las etapas. |
| `npm run cobertura` | Mide la cobertura de funciones JavaScript. La etapa 5 completa requiere PostgreSQL (nivel completo). |
| `npm run cobertura:contrato` | Mide la cobertura del contrato Solidity. |

## Para tu evidencia MG-A04

Este documento respalda la ficha del módulo 4, paso Aplica (`#m4/3`).

- **Observa:** ejecuta `npm run etapa:4` y registra en la tabla los tres escenarios: paquete íntegro, lectura alterada y paquete repetido.
- **Explica:** lee las pruebas de la etapa 4 junto a `src/oraculo.js` para separar lo que demuestra la firma de lo que decide la regla de calidad, e indica quién custodia la clave del oráculo.
- **Tu proyecto:** nombra un dato que tu sistema no puede comprobar por sí solo y quién lo firmaría.

El paso 3 del ciclo de trabajo, que consiste en cambiar un valor, observar la prueba que falla y restaurarlo, es el mismo experimento que pide el bloque Explica de MG-A05.
