# 01 · Fundamentos y Decisión: El Dinero Programable

El dinero programable es la evolución financiera impulsada por la tecnología blockchain y los contratos inteligentes (smart contracts). Como desarrollador de software, esto te permite crear aplicaciones donde el valor y la lógica de negocio se ejecutan sin intermediarios, de forma determinista e inmutable.

## ¿Qué es el dinero programable?
A diferencia de las pasarelas de pago tradicionales (como Stripe o PayPal) donde dependes de una API controlada por un tercero, el dinero programable vive en redes descentralizadas. Tú escribes el código que dicta exactamente cómo, cuándo y bajo qué condiciones se mueve el dinero.

### Redes principales para desarrolladores:
1. **Bitcoin:** Fue el pionero. Su lenguaje de programación (`Script`) es intencionalmente limitado (no Turing-completo) por seguridad. Se usa principalmente como reserva de valor, aunque tecnologías como *Lightning Network* o *Stacks* permiten programabilidad adicional.
2. **Ethereum:** Es la plataforma reina para los desarrolladores. Su máquina virtual (EVM) y su lenguaje **Solidity** (similar a JavaScript/C++) son Turing-completos. Aquí puedes programar desde tokens (ERC-20), NFTs (ERC-721), hasta organizaciones autónomas (DAOs) y finanzas descentralizadas (DeFi).
3. **IOTA:** Nació para el Internet de las Cosas con un grafo acíclico dirigido (Tangle). La red actual usa contratos en Move en su capa principal, ofrece un entorno EVM separado y cobra tarifas de gas. La descripción histórica de «micropagos sin comisiones» no describe la plataforma vigente; consulta su documentación oficial antes de decidir.
4. **Solana / Polkadot / Cardano:** Alternativas de alta velocidad o arquitecturas modulares, utilizando lenguajes como Rust o Haskell.

## Inteligencia Artificial + Dinero Programable
Unir la IA con blockchain te abre las puertas a aplicaciones de próxima generación:
- **Agentes económicos autónomos:** Un modelo de IA que gestiona un presupuesto en cripto. Puede decidir comprar poder de cómputo, pagar a APIs externas o invertir, firmando transacciones por su cuenta.
- **Oráculos Inteligentes:** Los contratos inteligentes están aislados de internet. Para que tu contrato sepa si un vuelo se retrasó o cuál es el análisis de sentimiento de una noticia (hecho por un LLM), utilizas oráculos (como Chainlink) para inyectar decisiones de IA on-chain.
- **Mercados de datos y modelos:** Pagar fracciones de centavo automáticamente cada vez que alguien consulta tu modelo de IA.

## La Arquitectura Híbrida: Blockchain + PostgreSQL (Patrón CQRS)
En el desarrollo de software real (ADSO), la blockchain no reemplaza a tu base de datos relacional:
* **Blockchain (EVM):** Es la máquina de verdad inmutable (Write Model). Se encarga de la custodia neutral de fondos, reglas de liquidación condicional y sellos criptográficos.
* **PostgreSQL:** Es el motor de lectura y reportes (Read Model). Se alimenta de los eventos emitidos por los contratos a través de un indexador idempotente (`UNIQUE(tx_hash, log_index)` con `ON CONFLICT DO NOTHING`). Resuelve búsquedas y vistas en menos de 5 ms.

> 📖 Consulta la guía de ingeniería completa: [`docs/ARQUITECTURA_BLOCKCHAIN_Y_POSTGRES_ADSO.md`](ARQUITECTURA_BLOCKCHAIN_Y_POSTGRES_ADSO.md).

## Marco de Decisión: El Semáforo ADSO
¿Cómo saber si tu proyecto formativo debe usar blockchain o una base de datos tradicional? Aplica el filtro de tres preguntas:

1. **¿Hay múltiples organizaciones o actores con intereses contrapuestos que no confían en un único administrador?**
2. **¿Existe custodia de fondos económicos, pagos condicionados o necesidad de que ni el programador pueda alterar el registro?**
3. **¿Las condiciones de desembolso pueden definirse matemáticamente en código?**

* **🟢 Verde (Solo PostgreSQL):** Inventarios, catálogos, perfiles de usuario, facturación interna (95 % de los sistemas comunes).
* **🟡 Amarillo (PostgreSQL + Criptografía):** Auditorías con sellos de tiempo y hashes SHA-256 en bases de datos relacionales.
* **🟣 Púrpura (Arquitectura Híbrida):** Garantías de pago entre desconocidos, liquidaciones agrícolas automáticas, trazabilidad internacional y certificados de grado infalsificables.
