# Ejercicio base: entorno y primer recorrido

> **Programa:** Tecnólogo en Análisis y Desarrollo de Software (ADSO), código 228118
> **Competencia:** 220501096 · Desarrollar la solución de software de acuerdo con el diseño y metodologías de desarrollo
> **Resultado de aprendizaje:** RAP-01 · Aplicar los fundamentos de dinero programable e IA con trazabilidad técnica y pedagógica

Los casos y archivos de esta guía se prepararon para aprender y no contienen registros reales. Los fondos de la red local no tienen valor monetario.

Este documento resume la ruta. Las instrucciones completas, con comandos, salidas esperadas y solución de problemas, están en la guía web.

## 1. ¿Por qué se habla de «dinero programable»?

En una aplicación tradicional, el dinero es un saldo en la base de datos de una entidad, y tu código **solicita** movimientos mediante una API que esa entidad puede aprobar, demorar o rechazar. En el dinero programable, las reglas de custodia y transferencia son código desplegado en una red: un contrato inteligente ejecuta la regla de la misma forma para todas las partes y deja un registro verificable.

Eso no elimina la confianza; la traslada. Las partes deben confiar en el código del contrato, en quien lo despliega o puede actualizarlo, en los datos que entrega un oráculo y en las reglas de la red. Por eso la guía insiste en permisos, pruebas y límites explícitos.

```solidity
// El pago solo se reserva si la cuenta autorizada lo solicita y hay fondos.
if (msg.sender != oraculo) revert SoloOraculo(msg.sender);
if (monto > garantiaDisponible) revert FondosInsuficientes(garantiaDisponible, monto);
```

## 2. La ruta en cuatro pasos

| Paso | Dónde | Resultado |
|---|---|---|
| 1. Prepara tu equipo | Guía web, `#preparar` | Node.js 24, VS Code y PowerShell 7 instalados y comprobados. |
| 2. Recorre los módulos | Guía web, `#m1/0` a `#m6/0` | Conceptos, ejemplos y evidencias MG-A01 a MG-A05. |
| 3. Explora el taller | Guía web, `#taller` | Proyecto AgroPay 100 % construido: ejecutas pruebas, inspeccionas persistencia en 3 capas y pruebas seguridad sin escribir código. |
| 4. Practica en los laboratorios | Guía web, `#labs` | Doce actividades en Simulación o Real local. |

## 3. Instalación en dos niveles

| Nivel | Instalas | Te permite |
|---|---|---|
| Mínimo | Node.js 24, VS Code y PowerShell 7 | Leer la guía, usar la Simulación y completar el taller con la etapa 5 en memoria. |
| Completo | Lo anterior y PostgreSQL 18; uv y Slither si tu instructor lo pide | Probar la etapa 5 con PostgreSQL y usar los laboratorios en Real local. |

Comandos del nivel mínimo:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Microsoft.VisualStudioCode -e
winget install --id Microsoft.PowerShell -e
```

Después descarga el paquete del taller desde la guía (`descargas/taller-agropay.zip`) y sigue la etapa 0:

```powershell
Expand-Archive "$HOME\Downloads\taller-agropay.zip" "$HOME\Documents"
cd "$HOME\Documents\agropay-taller"
npm install
npm run verificar
```

Salida esperada de la comprobación (tu versión de Node.js puede variar):

```text
OK    Node.js 24 o superior (v24.22.1)
OK    Paquete hardhat (instalado)
OK    Paquete ethers (instalado)
OK    Paquete solc (instalado)
Entorno listo. Continúa con la etapa 1.
```

## 4. Lenguajes y roles en el taller

| Lenguaje | Dónde | Tu rol como aprendiz |
|---|---|---|
| JavaScript (principal) | Reglas, pruebas, oráculo, indexador y recorrido | Inspeccionas la lógica y ejecutas pruebas y comandos de inspección |
| Solidity | Contrato `GarantiaAgroPay` | Analizas variables de almacenamiento EVM y permisos en bytecode |
| SQL | Tabla de consulta sin duplicados | Comprendes el patrón CQRS y la deduplicación con `ON CONFLICT DO NOTHING` |
| PowerShell | Ejecutar comandos | Ejecutas comandos guiados |
| Python | Slither, dentro del laboratorio Auditoría | No; es opcional |

## 5. ¿En qué red corre una aplicación?

| Entorno | Para qué sirve | Qué tener en cuenta |
|---|---|---|
| Red local de Hardhat (chainId 31337) | Desarrollo diario y pruebas; es la red de esta guía. | Las cuentas tienen fondos de práctica y los tiempos no representan una red pública. |
| Red de consorcio (por ejemplo, Hyperledger Besu) | Organizaciones identificadas que operan sus propios validadores. | La gobernanza y la operación recaen en esas organizaciones. Esta guía no la despliega. |
| Red de prueba pública (por ejemplo, Sepolia) | Probar con billeteras antes de producción. | Los fondos se obtienen de faucets y no tienen valor; la disponibilidad depende de terceros. |
| Red principal o capa 2 | Producción con valor real. | Cada transacción paga gas. Consulta costos y riesgos vigentes en la documentación oficial antes de decidir. |

Las claves privadas de una red pública nunca se escriben en el código ni en archivos del repositorio; se cargan desde un almacén seguro o variables de entorno.

## 6. Publicar la guía

El desarrollo y las pruebas se hacen en tu equipo con Node.js nativo. Para publicar la guía en un servidor se usa Docker Compose con Coolify, y solo se publica la guía web en modo Simulación. Los pasos están en el anexo **Publica la guía en tu VPS** (`#publicar`).
