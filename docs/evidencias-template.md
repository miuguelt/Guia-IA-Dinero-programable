# Plantilla del Portafolio de Evidencias

Material de aprendizaje: los casos y archivos de práctica no contienen registros reales. Completa cada sección en su módulo de la guía web; esta plantilla sirve para revisar la entrega completa antes de exportarla.

Entrega: `EV-GUIA-IA-DINERO-PROGRAMABLE-<ficha>-<apellido><nombre>.zip`. Repositorio Git con evidencias y pruebas. Medio: actividad definida por el instructor.

Cada evidencia sigue la misma ficha de tres bloques: **Observa** un resultado de AgroPay, **Explica** lo que significa y llévalo a **Tu proyecto**. En el bloque Observa, identifica la modalidad (Simulación, Real local o Taller AgroPay).

## MG-A01 · Decisión de arquitectura

**Módulo:** 1. **Tipo de evidencia:** conocimiento. **Tiempo orientativo:** 20 min.

Decide con argumentos si un proceso necesita una cadena de bloques o le basta una base de datos.

**Necesitas:**

- Semáforo ADSO del paso Comprende.
- Resultado del laboratorio IA y redes.
- Un proceso de tu proyecto formativo.

**Cómo se construye:** Clasifica tres procesos de AgroPay con el Semáforo ADSO, explica un costo y un límite del contrato y aplica la misma decisión a un proceso de tu proyecto.

**Ejemplo:** Observa: «Inventario de la cooperativa · Verde · lo administra una sola organización». Explica: «Cada escritura en el contrato cuesta gas y un error confirmado no se puede editar; se corrige con una nueva transacción». Tu proyecto: «Las reservas de mi aplicación quedan en PostgreSQL porque las administra una sola sede».

**Mi registro:**

**1 · Observa: clasifica tres procesos de AgroPay**

_Agrega una fila por proceso. Usa los colores del Semáforo ADSO del paso Comprende._

| Proceso | Color del Semáforo | Motivo |
|---|---|---|
|   |   |   |

**2 · Explica: un costo y un límite del contrato**

_Nombra un costo concreto, como gas, tiempo o mantenimiento, y algo que el contrato no puede comprobar o corregir por sí solo._

**3 · Tu proyecto: el proceso que eliges y su color**

_Elige un proceso de tu proyecto formativo. Lo retomarás en los siguientes módulos._

**Notas adicionales (opcional)**

_Agrega fuentes, dudas o registros anteriores. Este campo no es obligatorio._

**Lista de chequeo:**

- [ ] Observa: clasifica tres procesos con un motivo cada uno
- [ ] Explica: nombra un costo y un límite concretos
- [ ] Tu proyecto: justifica el color elegido para tu proceso

## MG-A02 · Diseño razonado

**Módulo:** 2. **Tipo de evidencia:** producto. **Tiempo orientativo:** 25 min.

Reparte responsabilidades entre componentes y prevé qué pasa cuando algo falla.

**Necesitas:**

- Salida de npm run etapa:1 del Taller AgroPay.
- Laboratorio Cadena de frío.
- El proceso que elegiste en MG-A01.

**Cómo se construye:** Registra un dictamen aprobado y uno rechazado, asigna una responsabilidad a cada componente de AgroPay, explica cómo se recupera ante una falla y nombra tres actores de tu proceso.

**Ejemplo:** Observa: «3,5 °C y acidez 16: aprobada. 9 °C: rechazada, la temperatura supera el máximo de 4 °C». Explica: «El oráculo firma la lectura; el contrato custodia y paga; PostgreSQL guarda la proyección fuera de la cadena». Tu proyecto: «Cliente, administrador y pasarela de pagos; solo el administrador cambia el estado de una reserva».

**Mi registro:**

**1 · Observa: un dictamen aprobado y uno rechazado**

_Copia los dos resultados de npm run etapa:1 o del laboratorio Cadena de frío, con sus motivos._

**2 · Explica: qué hace cada componente**

_Agrega al menos cuatro filas: oráculo, contrato, indexador y PostgreSQL. Cada responsabilidad debe tener un solo componente a cargo._

| Componente | Responsabilidad | ¿Dentro o fuera de la cadena? |
|---|---|---|
|   |   |   |

**2 · Explica: recuperación ante una falla**

_Describe qué pasa si se cae la conexión con la red o con PostgreSQL y cómo vuelve el sistema a un estado consistente._

**3 · Tu proyecto: tres actores y quién escribe cada dato**

_Usa el proceso que elegiste en MG-A01._

**Notas adicionales (opcional)**

_Agrega fuentes, dudas o registros anteriores. Este campo no es obligatorio._

**Lista de chequeo:**

- [ ] Observa: incluye un caso aprobado y uno rechazado con sus motivos
- [ ] Explica: asigna cada responsabilidad a un solo componente y ubica sus datos
- [ ] Explica: describe una falla y su recuperación
- [ ] Tu proyecto: nombra tres actores y quién escribe cada dato

## MG-A03 · Implementación comprobada

**Módulo:** 3. **Tipo de evidencia:** desempeño. **Tiempo orientativo:** 25 min.

Demuestra con una prueba real que el contrato rechaza a quien no tiene permiso y protege el retiro.

**Necesitas:**

- Salida de npm run probar:seguridad o npm run etapa:3.
- Archivo contracts/GarantiaAgroPay.sol del taller.
- Laboratorio Taller EVM, si quieres comparar.

**Cómo se construye:** Pega la salida de la prueba de seguridad, explica el rechazo por permisos y el orden de retirar(), y define una regla de permiso para tu proceso.

**Ejemplo:** Observa: salida del experimento 3 con el error SoloOraculo. Explica: «La cuenta sin permiso intentó autorizar el lote y el contrato revirtió con SoloOraculo; el saldo pendiente siguió en 0. retirar() deja el saldo en cero antes de enviar los fondos». Tu proyecto: «Solo el administrador confirma una reserva; si el cliente lo intenta, la operación se rechaza».

**Mi registro:**

**1 · Observa: salida de la prueba de seguridad**

_Copia la salida de npm run probar:seguridad o npm run etapa:3 e indica la modalidad: Taller AgroPay, Real local o Simulación._

**2 · Explica: el rechazo por permisos**

_Usa el nombre exacto del error que aparece en tu salida: SoloOraculo en el taller o NoAutorizado en el laboratorio Taller EVM._

**2 · Explica: el orden de retirar()**

_Explica en qué orden se comprueba el saldo, se actualiza y se envían los fondos, y qué ataque evita ese orden._

**3 · Tu proyecto: una regla de permiso**

_Describe con palabras quién puede ejecutar qué acción en tu proceso. No necesitas escribir código._

**Notas adicionales (opcional)**

_Agrega fuentes, dudas o registros anteriores. Este campo no es obligatorio._

**Lista de chequeo:**

- [ ] Observa: identifica comando, modalidad y salida
- [ ] Explica: nombra el error exacto y el saldo que quedó
- [ ] Explica: describe el orden Checks-Effects-Interactions
- [ ] Tu proyecto: define quién ejecuta una acción y qué pasa si otra cuenta lo intenta

## MG-A04 · Validación del oráculo

**Módulo:** 4. **Tipo de evidencia:** desempeño. **Tiempo orientativo:** 25 min.

Separa tres preguntas distintas: quién firmó, si el dato cambió y si la regla autoriza el pago.

**Necesitas:**

- Salida de npm run etapa:4 del Taller AgroPay.
- Laboratorio Firma de datos.
- Laboratorio Flujo de seis pasos, si quieres ver el recorrido completo.

**Cómo se construye:** Completa la tabla con los tres escenarios del oráculo, explica por qué la firma no basta y quién custodia la clave, y nombra el dato externo de tu proceso.

**Ejemplo:** Observa: «Paquete íntegro · válida · aprobada · sí»; «Lectura alterada · inválida · no se evalúa · no»; «Paquete repetido · nonce usado · no se evalúa · no». Explica: «Una lectura firmada a 8 °C conserva su firma, pero la regla la rechaza y no se autoriza el pago». Tu proyecto: «La pasarela de pagos firma la confirmación del cobro».

**Mi registro:**

**1 · Observa: tres escenarios del oráculo**

_Agrega una fila por escenario: paquete íntegro, lectura alterada y paquete repetido._

| Escenario | Resultado de la firma | Dictamen de la regla | ¿Se autorizó el pago? |
|---|---|---|---|
|   |   |   |   |

**2 · Explica: por qué una firma válida no basta**

_Distingue lo que demuestra la firma de lo que decide la regla de calidad._

**2 · Explica: quién custodia la clave del oráculo**

_Indica quién administra la identidad autorizada y qué pasaría si la clave se filtra._

**3 · Tu proyecto: el dato externo y quién lo firma**

_Piensa en un dato que tu sistema no puede comprobar por sí solo._

**Notas adicionales (opcional)**

_Agrega fuentes, dudas o registros anteriores. Este campo no es obligatorio._

**Lista de chequeo:**

- [ ] Observa: registra los tres escenarios con firma, dictamen y pago
- [ ] Explica: separa firma, dictamen y autorización del pago
- [ ] Explica: identifica quién custodia la clave y el riesgo de filtrarla
- [ ] Tu proyecto: nombra un dato externo y quién lo firma

## MG-A05 · Cierre técnico reproducible

**Módulo:** 5. **Tipo de evidencia:** producto. **Tiempo orientativo:** 30 min.

Deja tu trabajo listo para que otra persona lo ejecute y obtenga los mismos resultados.

**Necesitas:**

- Salida de npm test y de npm run cobertura del Taller AgroPay.
- Archivo evidencia-taller.md que genera npm run demo.
- Laboratorio PostgreSQL, si tienes el nivel completo.

**Cómo se construye:** Pega los resultados de pruebas y cobertura, demuestra que sincronizar dos veces no duplica registros, provoca y corrige un fallo, y escribe los pasos para reproducir tu entrega.

**Ejemplo:** Observa: la salida de npm test termina sin pruebas fallidas y la cobertura de funciones muestra el porcentaje obtenido. Explica: «La segunda sincronización conservó el mismo número de registros. Cambié temperaturaMaxima a 3, npm run etapa:1 falló y, al restaurar el valor, volvió a pasar». Tu proyecto: «Instalar Node.js 24, ejecutar npm install, npm test y npm run demo».

**Mi registro:**

**1 · Observa: pruebas y cobertura**

_Copia el resumen final de npm test y de npm run cobertura. Si tienes el nivel completo, añade la salida de npm run etapa:5 con PostgreSQL._

**2 · Explica: sincronizar dos veces**

_Registra el número de registros antes y después de repetir la sincronización y el resultado de reconstruir la proyección._

**2 · Explica: un fallo provocado y su corrección**

_Cambia un valor de LIMITES en src/reglas.js, ejecuta npm run etapa:1, copia el fallo y restaura el valor original. Explica qué detectó la prueba._

**3 · Tu proyecto: pasos para reproducir**

_Lista los requisitos y comandos que otra persona necesita para ejecutar tu entrega desde cero._

**Notas adicionales (opcional)**

_Agrega fuentes, dudas o registros anteriores. Este campo no es obligatorio._

**Lista de chequeo:**

- [ ] Observa: adjunta los resúmenes reales de pruebas y cobertura
- [ ] Explica: compara el número de registros antes y después de sincronizar
- [ ] Explica: muestra un fallo, su causa y la comprobación posterior
- [ ] Tu proyecto: escribe pasos que otra persona pueda seguir

## Juicio del instructor

Aprobado / No Aprobado: lo registra el instructor. Los puntos de la guía y las prácticas verificadas no reemplazan este juicio.
