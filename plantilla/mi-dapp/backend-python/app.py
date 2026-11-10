"""API REST sobre el contrato, con las mismas rutas que backend-node/app.js:
  POST   /api/productos      → crear()            (transacción: cuesta gas, la firma la API)
  GET    /api/productos      → proyección         (lista armada con los eventos del contrato)
  GET    /api/productos/{id} → obtener()          (lectura directa del contrato, sin gas)
  PATCH  /api/productos/{id} → actualizarPrecio() (transacción)
  DELETE /api/productos/{id} → desactivar()       (transacción; no borra, marca inactivo)
"""
import re

from fastapi import Body, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from web3 import Web3
from web3.exceptions import Web3Exception

from cadena import leer_eventos, nombre_error, proyectar_productos

# Cada error del contrato se traduce a un código HTTP y a un mensaje que la interfaz puede mostrar.
ERRORES_CONTRATO = {
    "NombreVacio": (400, "El nombre no puede estar vacío."),
    "ProductoInexistente": (404, "Ese producto no existe."),
    "SoloResponsable": (403, "Solo la cuenta que creó el producto puede modificarlo."),
    "ProductoInactivo": (409, "El producto está desactivado y ya no se modifica."),
}


class ErrorEntrada(ValueError):
    pass


def leer_id(valor):
    if not re.fullmatch(r"[1-9]\d{0,29}", str(valor)):
        raise ErrorEntrada("El id debe ser un entero positivo.")
    return int(valor)


def leer_precio(valor):
    if isinstance(valor, bool):
        valido = False
    elif isinstance(valor, int):
        valido = 0 <= valor <= 2**53 - 1
    else:
        valido = isinstance(valor, str) and re.fullmatch(r"\d{1,30}", valor) is not None
    if not valido:
        raise ErrorEntrada("El precio debe ser un entero mayor o igual a cero, sin decimales.")
    return int(valor)


def leer_nombre(valor):
    if not isinstance(valor, str) or not valor.strip() or len(valor.strip()) > 80:
        raise ErrorEntrada("El nombre es obligatorio y admite hasta 80 caracteres.")
    return valor.strip()


def campo(cuerpo, nombre):
    return cuerpo.get(nombre) if isinstance(cuerpo, dict) else None


def traducir_error(contrato, error):
    conocido = ERRORES_CONTRATO.get(nombre_error(contrato, error))
    if conocido:
        return conocido
    return 502, "La red no respondió o rechazó la operación. Revisa el nodo y vuelve a intentar."


def crear_app(w3, contrato, despliegue, carpeta_web):
    app = FastAPI(title="Registro de productos")
    desde_bloque = despliegue.get("bloque", 0)

    def confirmar(llamada):
        """Una transacción no está hecha al enviarla: se responde solo cuando la red entrega el recibo."""
        return w3.eth.wait_for_transaction_receipt(llamada.transact())

    def resumen(recibo, id_producto):
        return {"id": str(id_producto), "txHash": Web3.to_hex(recibo["transactionHash"]), "bloque": recibo["blockNumber"]}

    @app.get("/api/salud")
    def salud():
        return {"contrato": despliegue["direccion"], "chainId": despliegue["chainId"], "cuentaApi": w3.eth.default_account}

    @app.get("/api/productos")
    def listar():
        return proyectar_productos(leer_eventos(contrato, desde_bloque))

    @app.get("/api/eventos")
    def eventos():
        return leer_eventos(contrato, desde_bloque)

    @app.get("/api/productos/{id_producto}")
    def obtener(id_producto: str):
        numero = leer_id(id_producto)
        nombre, precio, responsable, activo = contrato.functions.obtener(numero).call()
        return {"id": str(numero), "nombre": nombre, "precio": str(precio), "responsable": responsable, "activo": activo}

    @app.post("/api/productos", status_code=201)
    def crear(cuerpo=Body(default=None)):
        recibo = confirmar(contrato.functions.crear(leer_nombre(campo(cuerpo, "nombre")), leer_precio(campo(cuerpo, "precio"))))
        creado = contrato.events.ProductoCreado().process_receipt(recibo)[0]
        return resumen(recibo, creado["args"]["id"])

    @app.patch("/api/productos/{id_producto}")
    def actualizar_precio(id_producto: str, cuerpo=Body(default=None)):
        numero = leer_id(id_producto)
        return resumen(confirmar(contrato.functions.actualizarPrecio(numero, leer_precio(campo(cuerpo, "precio")))), numero)

    @app.delete("/api/productos/{id_producto}")
    def desactivar(id_producto: str):
        numero = leer_id(id_producto)
        return resumen(confirmar(contrato.functions.desactivar(numero)), numero)

    # Para que el usuario firme con su propia billetera, la API solo prepara la transacción:
    # a qué contrato va y qué función llama. No la firma ni la envía.
    @app.post("/api/transacciones/crear")
    def preparar_creacion(cuerpo=Body(default=None)):
        datos = contrato.encode_abi("crear", args=[leer_nombre(campo(cuerpo, "nombre")), leer_precio(campo(cuerpo, "precio"))])
        return {"to": despliegue["direccion"], "data": datos, "chainId": despliegue["chainId"]}

    @app.exception_handler(ErrorEntrada)
    def al_fallar_entrada(_peticion, error):
        return JSONResponse(status_code=400, content={"error": str(error)})

    @app.exception_handler(RequestValidationError)
    def al_fallar_json(_peticion, _error):
        return JSONResponse(status_code=400, content={"error": "El cuerpo de la petición debe ser JSON válido."})

    @app.exception_handler(Web3Exception)
    @app.exception_handler(OSError)
    def al_fallar_red(_peticion, error):
        estado, mensaje = traducir_error(contrato, error)
        return JSONResponse(status_code=estado, content={"error": mensaje})

    app.mount("/", StaticFiles(directory=carpeta_web, html=True), name="interfaz")
    return app
