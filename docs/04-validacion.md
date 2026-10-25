# 04 · Validación: pruebas que guían cada etapa

En el Taller AgroPay, cada etapa trae pruebas de aceptación escritas con Mocha, Chai y Hardhat en JavaScript. Las pruebas definen qué significa «terminado»: una etapa está completa cuando su comando termina sin fallos.

## Ciclo de trabajo

1. Ejecuta `npm run etapa:N` y confirma que las pruebas fallan por la razón esperada (`TODO etapa N`).
2. Completa el código indicado.
3. Vuelve a ejecutar la etapa hasta que todas las pruebas pasen.
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
