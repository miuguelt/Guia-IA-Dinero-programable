# Paradigma Computacional: Programación Orientada a Objetos (POO) vs. Smart Contracts en la EVM

> **Guía para Aprendices de Análisis y Desarrollo de Software (ADSO)**  
> **Propósito:** Comprender la ruptura de paradigma entre la programación tradicional orientada a objetos (Java, C#, TypeScript, Python) y el desarrollo de contratos inteligentes en Solidity sobre la Ethereum Virtual Machine (EVM).

---

## 1. El Espejismo Inicial: «Solidity se parece a Java, pero no es POO»

Cuando un aprendiz que domina Java, C# o TypeScript abre por primera vez un archivo de Solidity (`.sol`), su primera reacción suele ser de alivio:

```solidity
// Solidity parece Programación Orientada a Objetos...
contract CuentaBancaria is Administrable {
    address public titular;
    uint256 public saldo;

    constructor(address _titular) {
        titular = _titular;
    }

    function depositar() public payable {
        saldo += msg.value;
    }
}
```

A nivel superficial, el código utiliza:
* La palabra reservada `contract` (que parece una `class`).
* Variables de estado arriba (que parecen atributos de instancia).
* Un `constructor` para inicializar.
* Métodos (`functions`) con modificadores de acceso (`public`, `private`).
* Herencia mediante la palabra clave `is` (equivalente a `extends` en Java).
* Interfaces (`interface IERC20`) y polimorfismo.

**Este parecido sintáctico es intencional**, diseñado por los creadores de Solidity en 2014 para reducir la curva de aprendizaje de los programadores. **Sin embargo, asumir que un Smart Contract funciona como un objeto de POO es el error más costoso y peligroso que puede cometer un desarrollador de software.**

---

## 2. ¿Qué Paradigma es en Realidad un Smart Contract?

### Definición Formal: Máquina de Estados Finitos Criptográfica y Replicada
Un contrato inteligente **NO es un objeto en memoria RAM**. 

En ciencias de la computación, un Smart Contract se clasifica bajo el paradigma de **Máquina de Estados Finitos Determinista Replicada** (*Deterministic Replicated State Machine*) combinada con el **Modelo de Actores Criptográficos**:

$$\Upsilon(S, T) \longrightarrow S'$$

Donde:
* $S$: El Estado Global Actual de la red (*World State*).
* $T$: La Transacción emitida por un usuario o por otro contrato, firmada con su clave privada criptográfica.
* $\Upsilon$: La función de transición determinista ejecutada por la Ethereum Virtual Machine (EVM).
* $S'$: El Nuevo Estado Global acordado por consenso universal.

### Las Implicaciones de este Paradigma:
1. **Un Contrato es una Cuenta Autónoma:** En la EVM, un contrato inteligente es una cuenta (*Smart Contract Account*) con una dirección hexadecimal única de 20 bytes (`0x...`), su propio balance en criptomoneda nativa o tokens, y su propio espacio de memoria persistente (*Storage Slots*).
2. **Determinismo Absoluto:** Cada instrucción debe producir exactamente el mismo resultado en los miles de nodos validadores del planeta, sin importar su procesador, sistema operativo o arquitectura física. Por esta razón, **en Solidity no existe aleatoriedad nativa (`Math.random()`), ni temporizadores (`setTimeout`), ni consultas HTTP (`fetch`)**.
3. **Paso de Mensajes Transaccionales (Actor Model):** Cuando interactúas con un contrato, no estás "invocando un método en memoria local"; le estás enviando un mensaje transaccional con datos binarios codificados (*ABI payload*) y fondos financieros adjuntos.

---

## 3. Matriz de Comparación Profunda: POO Tradicional vs. Smart Contracts

| Dimensión Técnica | Programación Orientada a Objetos (POO) | Smart Contracts (EVM / Solidity) |
| :--- | :--- | :--- |
| **Entidad Fundamental** | `class` / `object` instanciado en el Heap de la memoria RAM. | `contract` / Cuenta soberana desplegada en el registro de bloques. |
| **Paradigma Real** | Orientado a Objetos / Imperativo / Event-Driven. | Máquina de Estados Criptográfica Replicada / Modelo de Actores. |
| **Instanciación (`new`)** | `new Cuenta()` reserva milisegundos en RAM local; mueren al reiniciar el proceso. | El despliegue graba el bytecode en la cadena permanentemente; vive para siempre. |
| **Costo de Cómputo** | "Gratis" (la CPU y la RAM son del servidor donde corre). | **Medición de Gas (Gas Metering):** cada opcode cuesta una tarifa exacta. |
| **Problema de la Parada** | Bucles infinitos `while(true)` generan bloqueos o timeouts del SO. | El gas se agota (*Out of Gas*); la EVM detiene la ejecución y revierte el estado. |
| **Persistencia de Datos** | Explícita: Requiere bases de datos (`db.save()`, SQL, ORM). | Implícita: Las variables de estado (`storage`) se guardan automáticamente en disco. |
| **Manejo de Memoria** | Heap y Stack gestionados por Garbage Collector. | Tres áreas disjuntas: `storage` (disco costoso), `memory` (RAM barata), `calldata` (inmutable). |
| **Manejo de Errores** | `try / catch`: las mutaciones de memoria previas al error se conservan. | `revert` / `require`: atomicidad estricta; se deshace el 100% de los cambios globales. |
| **Autenticación** | Headers HTTP, tokens JWT, sesiones en Redis o cookies. | Criptografía asimétrica nativa de curva elíptica: `msg.sender` (firma ECDSA infalsificable). |
| **Transferencia de Valor** | Pasiva: llamar a una API bancaria externa (Stripe, PSE, PayPal). | Nativa: `msg.value` transfiere dinero físico programable en la misma instrucción. |
| **Llamadas a Otros Códigos**| Seguras: llamar a `otroObjeto.metodo()` ocurre en memoria de confianza. | Peligrosas: llamar a `otroContrato.call()` cede el control del CPU a un código ajeno (Reentrancy). |
| **Mantenibilidad / Bugs** | Despliegue de parches en caliente (*hotfixes*), `git push` y reinicio. | **Código Inmutable:** una vez desplegado, la lógica no puede alterarse jamás. |

---

## 4. Análisis Detallado de las 6 Rupturas de Paradigma

### 1. La Persistencia Implícita (`storage` vs. `memory` vs. Base de Datos)
En POO tradicional (Java/Spring):
```java
// Java: Si no llamas al repositorio, los datos se pierden al apagar el servidor
public class ServicioUsuarios {
    public void registrar(Usuario u) {
        u.setActivo(true); // Solo cambió en la RAM
        repositorio.save(u); // Persistencia EXPLÍCITA en PostgreSQL
    }
}
```

En Solidity:
```solidity
// Solidity: Cualquier asignación a una variable de estado es PERSISTENCIA DIRECTA
contract RegistroUsuarios {
    // Esta variable vive en 'storage' (permanente en todos los nodos de la red)
    mapping(address => bool) public usuariosActivos;

    function registrar() public {
        usuariosActivos[msg.sender] = true; 
        // ¡No existe db.save()! El estado ya quedó grabado de forma inmutable
    }
}
```

#### Los 3 Tipos de Memoria en Solidity:
* **`storage` (Disco Permanente):** Es el disco duro del contrato. Modificar una ranura (*slot*) de 32 bytes cuesta hasta **20,000 unidades de gas**. Debe usarse únicamente para el estado esencial.
* **`memory` (RAM Temporal):** Espacio de memoria que se crea al iniciar la transacción y se destruye por completo cuando la función retorna. Es económica y se usa para cálculos intermedios.
* **`calldata` (Búfer de Entrada):** Búfer de solo lectura e inmutable donde viajan los parámetros enviados por el usuario externo. No se puede modificar y es la opción más eficiente en gas.

---

### 2. El Modelo de Costo: Gas Metering y la Parada de Turing
En Java o Python, si un aprendiz escribe un bucle `for` de 10,000 elementos, el servidor tarda un par de milisegundos más y nadie paga nada extra.

En una red EVM, **los nodos ejecutan las instrucciones del contrato y verifican sus cambios de estado**. El número de nodos depende de la red; en esta guía se usa un nodo local. El gas mide el trabajo de ejecución y limita los recursos que puede consumir una transacción:

* `ADD` (Sumar dos números): 3 gas.
* `MUL` (Multiplicar): 5 gas.
* `SLOAD` (Leer de `storage`): 2,100 gas.
* `SSTORE` (Escribir en `storage`): hasta 22,100 gas.

```
Usuario envía Transacción:
Límite de Gas: 50,000 | Precio: 20 GWEI

Instrucción 1: PUSH  (-3 gas)
Instrucción 2: SLOAD (-2100 gas)
Instrucción 3: SSTORE (-20000 gas)
...
¿Gas restante < 0? ─── SÍ ───> OUT OF GAS: Se cancela todo, el estado revierte a cero
                                y el usuario PIERDE el costo del gas consumido.
```

---

### 3. Atomicidad Total vs. Manejo de Excepciones
En POO tradicional:
```csharp
// C#: Si falla el paso 2, el paso 1 ya modificó la memoria
public void Transferir(Usuario destino, decimal monto) {
    this.saldo -= monto; // Paso 1: Saldo modificado en RAM
    
    // Paso 2: Si aquí salta una excepción...
    if (destino.Bloqueado) {
        throw new Exception("Destino bloqueado");
        // ¡Peligro! this.saldo quedó restado a menos que manejes un try/catch manual
    }
}
```

En Solidity:
```solidity
function transferir(address destino, uint256 monto) public {
    require(balances[msg.sender] >= monto, "Saldo insuficiente");
    
    balances[msg.sender] -= monto; // Paso 1
    
    // Paso 2: Validación
    require(!cuentasBloqueadas[destino], "Destino bloqueado"); 
    // Si esta aserción falla, TODO EL ESTADO SE REVIERTE.
    // El balance de msg.sender regresa a su valor original como si nada hubiera ocurrido.
    
    balances[destino] += monto;
}
```
En Smart Contracts, **toda transacción es atómica (todo o nada)**. No existen estados a medias ni datos corruptos tras un fallo.

---

### 4. Identidad Criptográfica Nativa (`msg.sender` & `msg.value`)
En el desarrollo Web2 tradicional, la identidad del usuario viaja en un encabezado HTTP:
1. El usuario envía un usuario y contraseña.
2. El servidor valida y genera un JSON Web Token (JWT).
3. El frontend envía `Authorization: Bearer eyJhbGciOi...`.
4. El backend decodifica el token y confía en el `userId`.

En la EVM, **la identidad no requiere servidores ni tokens de sesión**. Está inscrita a nivel de protocolo criptográfico mediante curvas elípticas (ECDSA secp256k1):
* `msg.sender`: Es la dirección de quien firmó la transacción con su clave privada. Es matemáticamente imposible de falsificar.
* `msg.value`: Es el monto exacto de dinero (en Wei) que viaja físicamente dentro del mensaje de la transacción.

---

### 5. La Ilusión de la Invocación Segura de Métodos (El Peligro de Reentrancia)
En POO tradicional:
```typescript
// TypeScript / Java
class Banco {
    transferir(otroBanco: Banco, monto: number) {
        otroBanco.recibir(monto); // Invocación segura dentro del mismo proceso
        this.saldo -= monto;
    }
}
```
En POO, llamar a `otroBanco.recibir()` es una operación interna de confianza.

En Solidity:
```solidity
// Solidity: ¡PELIGRO CRÍTICO!
function retirar() public {
    uint256 saldo = balances[msg.sender];
    require(saldo > 0);

    // Ceder el control del CPU a un contrato externo desconocido
    (bool exito, ) = msg.sender.call{value: saldo}("");
    require(exito);

    balances[msg.sender] = 0; // ¡Demasiado tarde!
}
```
Cuando un contrato en Solidity invoca a otro mediante `.call{value: ...}()`, **la EVM suspende la ejecución del contrato actual y le transfiere el hilo de ejecución al contrato externo receptor**. Si ese contrato externo es un atacante, puede volver a invocar `retirar()` de forma recursiva antes de que su balance se actualice a cero, vaciando todos los fondos de la tesorería (Ataque de Reentrancia de "The DAO").

Por esta razón, en contratos inteligentes se utiliza obligatoriamente el patrón **Check-Effects-Interactions (CEI)** o el **Patrón de Retiro (Pull over Push)**.

---

### 6. Inmutabilidad Absoluta del Código
* **En POO / Web2:** Si encuentras un error tipográfico o un fallo lógico en producción, haces un commit en Git, disparas el pipeline de CI/CD, despliegas el nuevo contenedor en Coolify o AWS, y el problema queda resuelto en 5 minutos.
* **En Smart Contracts:** Una vez que el bytecode se despliega en una dirección de la blockchain (`0x1a2b...`), **ese bytecode no se puede parchear en su sitio**, ni siquiera por su autor. Si el contrato se diseñó con un patrón de actualización (proxy), quien controle ese mecanismo puede cambiar la lógica que se ejecuta; por eso hay que revisar quién tiene ese permiso.

Esta inmutabilidad es la fuente de la confianza para el usuario (nadie puede cambiar las reglas del juego a traición), pero exige una disciplina de ingeniería extrema: **el código debe someterse a pruebas rigurosas (TDD con 100% de cobertura), análisis estático de vulnerabilidades (Slither) y modelado de amenazas antes de su despliegue**.

---

## 5. El Decálogo Mental para el Desarrollador de POO en Web3

1. **No pienses en objetos en RAM; piensa en una máquina de estados global con cuentas autónomas.**
2. **Las variables de estado son escrituras permanentes en disco (`storage`); mide cada byte que guardas.**
3. **No uses bucles de longitud variable; el gas los convertirá en un ataque de denegación de servicio (DoS).**
4. **No confíes en llamadas externas; aplica siempre el patrón Check-Effects-Interactions (CEI).**
5. **No intentes generar números aleatorios dentro de Solidity; requiere oráculos criptográficos (VRF).**
6. **No guardes archivos pesados ni información personal sensible en variables de estado.**
7. **La identidad del usuario no es un JWT; es una dirección criptográfica autenticada con `msg.sender`.**
8. **Los errores revierten toda la transacción de manera atómica; aprovecha `require` para blindar invariantes.**
9. **El código desplegado es definitivo; audita y prueba exhaustivamente antes de publicar.**
10. **Complementa con bases de datos relacionales tradicionales (PostgreSQL) bajo el patrón CQRS para lecturas rápidas y visualización.**
