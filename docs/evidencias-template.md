# Plantilla del Portafolio de Evidencias

Material de aprendizaje: los casos y archivos de práctica no contienen registros reales. Completa cada sección en su módulo de la guía web; esta plantilla sirve para revisar la entrega completa antes de exportarla.

Entrega: `EV-GUIA-IA-DINERO-PROGRAMABLE-<ficha>-<apellido><nombre>.zip`. Repositorio Git con evidencias y pruebas. Medio: actividad definida por el instructor.

En cada evidencia, identifica la modalidad (Simulación, Real local o Taller AgroPay), la entrada, el procedimiento, el resultado y sus límites.

## MG-A01 · Decisión de arquitectura

**Módulo:** 1. **Tipo de evidencia:** conocimiento.

Compara un registro relacional y un contrato inteligente para el proceso de tu proyecto. Identifica actores, dato compartido, autoridad y costo.

**Ejemplo:** El inventario interno queda en PostgreSQL; la garantía entre organizaciones se explora en un contrato con un oráculo definido.

**Lista de chequeo:**

- [ ] Justifica la alternativa elegida
- [ ] Distingue fuente de datos y estado compartido
- [ ] Reconoce un costo y un límite

**Mi registro:**

_Procedimiento, resultado y límites._

## MG-A02 · Diseño razonado

**Módulo:** 2. **Tipo de evidencia:** producto.

Describe tres actores y el recorrido desde la captura hasta el resultado consultable. Incluye aprobación, rechazo y recuperación.

**Ejemplo:** El proveedor identifica el lote; el servicio verifica la firma; el contrato aplica permisos y PostgreSQL conserva la proyección.

**Lista de chequeo:**

- [ ] Asigna responsabilidades sin solaparlas
- [ ] Incluye un flujo rechazado y recuperación
- [ ] Explica qué datos quedan fuera de la cadena

**Mi registro:**

_Procedimiento, resultado y límites._

## MG-A03 · Implementación comprobada

**Módulo:** 3. **Tipo de evidencia:** desempeño.

Presenta una regla del contrato con código, prueba y efecto observable. Comprueba autorización y rechazo por permisos. Puedes usar la etapa 3 del Taller AgroPay o el contrato del aula.

**Ejemplo:** La cuenta observadora recibe NoAutorizado y no obtiene saldo; el oráculo autorizado produce el evento y reserva el monto.

**Lista de chequeo:**

- [ ] Verifica permisos en el contrato
- [ ] Incluye aserciones sobre estado y eventos
- [ ] Distingue envío, confirmación y resultado

**Mi registro:**

_Procedimiento, resultado y límites._

## MG-A04 · Validación del oráculo

**Módulo:** 4. **Tipo de evidencia:** desempeño.

Compara firma válida, contenido alterado y repetición. Separa dictamen por reglas y autorización del pago.

**Ejemplo:** La firma válida no autoriza un lote que obtiene 58 puntos. Un paquete alterado se rechaza antes de la evaluación.

**Lista de chequeo:**

- [ ] Comprueba integridad y protección contra repetición
- [ ] Explica los umbrales y el puntaje
- [ ] Identifica modalidad, recibo e indexación cuando existan

**Mi registro:**

_Procedimiento, resultado y límites._

## MG-A05 · Cierre técnico reproducible

**Módulo:** 5. **Tipo de evidencia:** producto.

Consolida pruebas, cobertura y resultados de sincronización. Incluye un fallo corregido y pasos para reproducir la entrega. Puedes usar las etapas 5 y 6 del Taller AgroPay, con la salida de npm test y evidencia-taller.md.

**Ejemplo:** Reindexar conserva el conteo; reconstruir devuelve los mismos registros para el mismo despliegue, sin duplicados.

**Lista de chequeo:**

- [ ] Adjunta resultados reales de pruebas y cobertura
- [ ] Comprueba idempotencia y recuperación
- [ ] Relaciona resultados con criterios y límites

**Mi registro:**

_Procedimiento, resultado y límites._

## Juicio del instructor

Aprobado / No Aprobado: lo registra el instructor. Los puntos de la guía y las prácticas verificadas no reemplazan este juicio.
