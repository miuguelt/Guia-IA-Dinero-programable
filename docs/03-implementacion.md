# 03 · Implementación: inspecciona y comprende el Taller AgroPay

La implementación completa de referencia vive en el **Taller AgroPay** de la guía web (`#taller`). El taller trabaja en JavaScript, Solidity y SQL nativo, y viene 100 % implementado para que el aprendiz no tenga que escribir código sintáctico desde cero, sino concentrarse en comprender la arquitectura, dónde se guardan los datos y cómo funciona esta nueva capa de seguridad verificable.

## Qué inspeccionas en el contrato

| Etapa | Archivo | Qué analizas y compruebas |
|---|---|---|
| 0 · Prepara el proyecto | `package.json`, `hardhat.config.js` | El proyecto compila y la etapa 0 pasa directamente. |
| 2 · Almacenamiento en EVM | `contracts/GarantiaAgroPay.sol` | Variables de estado (`garantiaDisponible`), modificador `payable` y emisión de eventos. |
| 3 · Permisos y retiro seguro | `contracts/GarantiaAgroPay.sol` | Control de acceso (`SoloOraculo`), mappings y retiro con Checks–Effects–Interactions (CEI). |

## Cómo explorar el taller

1. Revisa la página **Prepara tu equipo** (`#preparar`) e instala Node.js 24 y VS Code.
2. Descarga `descargas/taller-agropay.zip` desde la guía y extráelo en Documentos.
3. En la carpeta `agropay-taller`, ejecuta:

```powershell
npm install
npm run verificar
npm run etapa:2
npm run etapa:3
```

Todas las pruebas pasan directamente, permitiéndote inspeccionar los archivos fuente y entender qué propiedades observables verifica cada prueba.

## Experimentos de seguridad guiados

Ejecuta el script dedicado de seguridad:

```powershell
npm run probar:seguridad
```

Observa cómo el sistema responde y neutraliza cuatro vectores de ataque comunes:
1. **Alteración de datos:** La firma ECDSA detecta cualquier cambio en la medición con `FIRMA_INVALIDA`.
2. **Ataque de repetición:** El control de `nonce` bloquea la reutilización de paquetes firmados con `LECTURA_REPETIDA`.
3. **Suplantación de permisos:** La EVM revierte llamadas no autorizadas con `SoloOraculo`.
4. **Ataque de reentrada:** El contrato atacante `AtacanteRetiro` es frustrado porque el saldo se reduce a cero antes de transferir dinero (patrón CEI).

Las pruebas que validan esta etapa están en [04-validacion.md](04-validacion.md).
