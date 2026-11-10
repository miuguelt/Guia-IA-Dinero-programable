# 06 · Tu propia aplicación con un contrato

Este documento acompaña la evidencia MG-A06 y el módulo 7. Resume cómo se conecta un contrato con una aplicación que ya sabes construir y qué debes comprobar antes de publicarla. Los productos, cuentas y saldos de la plantilla se prepararon para aprender y no representan registros ni dinero reales.

## La plantilla mi-dapp

La plantilla vive en [`plantilla/mi-dapp`](../plantilla/mi-dapp/README.md) y se descarga desde el módulo 7 de la guía web. Es un registro de productos con cinco piezas:

| Pieza | Carpeta | Responsabilidad |
|---|---|---|
| Contrato | `contracts/` | Guarda los productos y decide quién puede cambiarlos. |
| API en Node.js | `backend-node/` | Express y ethers: valida, firma transacciones y mantiene la proyección en PostgreSQL. |
| API en Python | `backend-python/` | FastAPI y web3.py: las mismas rutas y los mismos mensajes. |
| Proyección | `sql/` | Copia de los eventos para consultar con SQL. |
| Interfaz | `frontend/` | HTML y JavaScript: lista, formulario y firma con billetera. |

## Del CRUD al contrato

| Operación | En una API con SQL | En el contrato | Qué cambia |
|---|---|---|---|
| Crear | `INSERT` | `crear(nombre, precio)` | Es una transacción firmada, cuesta gas y emite `ProductoCreado`. |
| Leer | `SELECT` | `obtener(id)` o la proyección | Leer no cuesta gas; las listas se consultan en la proyección. |
| Actualizar | `UPDATE` | `actualizarPrecio(id, precio)` | El valor anterior queda en el evento `PrecioActualizado`. |
| Eliminar | `DELETE` | `desactivar(id)` | No se borra nada: el producto queda inactivo y conserva su historia. |

## Qué necesita cualquier lenguaje

Tres datos bastan para hablar con un contrato desde Node.js, Python, Java o cualquier otro lenguaje:

1. **La URL del nodo (RPC).** En local, `http://127.0.0.1:8545`.
2. **La dirección del contrato.** La entrega el despliegue.
3. **El ABI.** La lista de funciones y eventos, parecida a un documento OpenAPI.

Para escribir hace falta además una cuenta que firme. Su clave privada es un secreto: llega por una variable de entorno y no se escribe en el código ni se sube al repositorio.

| Lenguaje | Biblioteca | Dónde verlo |
|---|---|---|
| Node.js | ethers | `backend-node/contrato.js` y `backend-node/app.js` |
| Python | web3.py | `backend-python/cadena.py` y `backend-python/app.py` |
| Java | web3j | Fragmento comparativo del módulo 7; la guía no lo ejecuta |

## Quién firma

| | Firma la API | Firma el usuario |
|---|---|---|
| Quién paga el gas | La cuenta de la API | La cuenta del usuario |
| Qué necesita el usuario | Nada | Una billetera con saldo en esa red |
| Quién figura como responsable | La cuenta de la API | La cuenta del usuario |

El permiso lo decide el contrato. Si una persona crea un producto con su billetera, la API no puede modificarlo y responde 403.

## Publicación

Los pasos están en el módulo 7, paso Aplica, y en el README de la plantilla. En resumen: un nodo accesible desde el servidor, el contrato desplegado desde tu equipo con `npm run desplegar:remota`, el repositorio sin claves y un recurso Docker Compose en Coolify con sus variables de entorno. En tu equipo no se usa Docker.

El despliegue real en un VPS depende de tu servidor y de tu dominio. Si no dispones de ellos, registra la aplicación en tu equipo y anota la publicación como pendiente.

## Para tu evidencia MG-A06

Este documento respalda la ficha del módulo 7, paso Aplica (`#m7/3`).

- **Observa:** copia las respuestas reales de crear, actualizar y desactivar un producto, la lista de `/api/eventos` y la respuesta de `/api/salud`.
- **Explica:** indica quién firmó cada operación, qué respondió la API ante un producto creado con tu billetera y qué quedó en el contrato, en los eventos y en la proyección.
- **Tu proyecto:** separa lo que irá en el contrato de lo que irá en tu base de datos, y escribe la dirección publicada o por qué queda pendiente.

En el Portafolio (`#portfolio`), comprueba que este bloque «Tu proyecto» sea coherente con los de MG-A01 a MG-A05.
