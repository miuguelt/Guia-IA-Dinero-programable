"""Pruebas de la API en Python: las mismas rutas y los mismos resultados que la API de Node,
contra el contrato real en un nodo Hardhat."""
import json
import re

import pytest
from web3 import Web3

import servidor
from app import ErrorEntrada, leer_id, leer_nombre, leer_precio, traducir_error
from cadena import cargar_despliegue, conectar, nombre_error, proyectar_productos

HASH = re.compile(r"^0x[0-9a-f]{64}$")


def test_salud_informa_red_contrato_y_cuenta(cliente, cadena):
    respuesta = cliente.get("/api/salud")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"contrato": cadena["despliegue"]["direccion"], "chainId": 31337, "cuentaApi": cadena["cuenta_api"]}


def test_post_crea_espera_el_recibo_y_aparece_en_la_lista(cliente, cadena):
    creado = cliente.post("/api/productos", json={"nombre": "  Café  ", "precio": 12000})
    assert creado.status_code == 201
    assert creado.json()["id"] == "1"
    assert HASH.match(creado.json()["txHash"])
    assert creado.json()["bloque"] > cadena["despliegue"]["bloque"]
    assert cliente.get("/api/productos").json() == [
        {"id": "1", "nombre": "Café", "precio": "12000", "responsable": cadena["cuenta_api"], "activo": True, "cambios": 1}
    ]


def test_get_por_id_lee_el_contrato_y_responde_404_si_no_existe(cliente, cadena):
    cliente.post("/api/productos", json={"nombre": "Panela", "precio": "4500"})
    assert cliente.get("/api/productos/1").json() == {
        "id": "1", "nombre": "Panela", "precio": "4500", "responsable": cadena["cuenta_api"], "activo": True
    }
    ausente = cliente.get("/api/productos/9")
    assert (ausente.status_code, ausente.json()) == (404, {"error": "Ese producto no existe."})


def test_patch_actualiza_y_el_historial_conserva_el_evento_anterior(cliente):
    cliente.post("/api/productos", json={"nombre": "Café", "precio": 12000})
    assert cliente.patch("/api/productos/1", json={"precio": 13500}).status_code == 200
    producto = cliente.get("/api/productos").json()[0]
    assert (producto["precio"], producto["cambios"]) == ("13500", 2)
    eventos = cliente.get("/api/eventos").json()
    assert [(evento["tipo"], evento["precio"]) for evento in eventos] == [("ProductoCreado", "12000"), ("PrecioActualizado", "13500")]
    assert eventos[1]["cuenta"] is None and HASH.match(eventos[0]["txHash"])


def test_delete_desactiva_sin_borrar_y_despues_rechaza_cambios(cliente):
    cliente.post("/api/productos", json={"nombre": "Café", "precio": 12000})
    assert cliente.delete("/api/productos/1").status_code == 200
    producto = cliente.get("/api/productos").json()[0]
    assert (producto["nombre"], producto["activo"], producto["cambios"]) == ("Café", False, 2)
    assert cliente.get("/api/eventos").json()[1]["precio"] is None
    cambio = cliente.patch("/api/productos/1", json={"precio": 1})
    assert (cambio.status_code, cambio.json()) == (409, {"error": "El producto está desactivado y ya no se modifica."})


def test_prepara_la_transaccion_para_una_billetera_y_no_modifica_lo_ajeno(cliente, cadena):
    preparada = cliente.post("/api/transacciones/crear", json={"nombre": "Miel", "precio": 20000}).json()
    assert preparada["to"] == cadena["despliegue"]["direccion"] and preparada["chainId"] == 31337
    w3 = cadena["w3"]
    w3.eth.wait_for_transaction_receipt(w3.eth.send_transaction({"from": cadena["usuaria"], "to": preparada["to"], "data": preparada["data"]}))
    producto = cliente.get("/api/productos").json()[0]
    assert (producto["nombre"], producto["responsable"]) == ("Miel", cadena["usuaria"])
    ajeno = cliente.patch("/api/productos/1", json={"precio": 1})
    assert (ajeno.status_code, ajeno.json()) == (403, {"error": "Solo la cuenta que creó el producto puede modificarlo."})
    assert cliente.delete("/api/productos/1").status_code == 403


@pytest.mark.parametrize("metodo, ruta, cuerpo, mensaje", [
    ("post", "/api/productos", {"nombre": "", "precio": 1}, "nombre es obligatorio"),
    ("post", "/api/productos", {"precio": 1}, "nombre es obligatorio"),
    ("post", "/api/productos", {"nombre": "x" * 81, "precio": 1}, "80 caracteres"),
    ("post", "/api/productos", {"nombre": "Café", "precio": -1}, "precio debe ser un entero"),
    ("post", "/api/productos", {"nombre": "Café", "precio": "12.5"}, "precio debe ser un entero"),
    ("post", "/api/productos", {"nombre": "Café", "precio": True}, "precio debe ser un entero"),
    ("post", "/api/productos", ["Café", 1], "nombre es obligatorio"),
    ("post", "/api/transacciones/crear", {"nombre": "Café", "precio": 1.5}, "precio debe ser un entero"),
    ("patch", "/api/productos/0", {"precio": 1}, "id debe ser un entero positivo"),
    ("delete", "/api/productos/abc", None, "id debe ser un entero positivo"),
])
def test_rechaza_entradas_invalidas_antes_de_gastar_gas(cliente, cadena, metodo, ruta, cuerpo, mensaje):
    bloque_antes = cadena["w3"].eth.block_number
    respuesta = cliente.request(metodo, ruta, json=cuerpo)
    assert respuesta.status_code == 400
    assert mensaje in respuesta.json()["error"]
    assert cadena["w3"].eth.block_number == bloque_antes


def test_un_cuerpo_que_no_es_json_responde_400(cliente):
    respuesta = cliente.post("/api/productos", content="{mal json", headers={"content-type": "application/json"})
    assert (respuesta.status_code, respuesta.json()) == (400, {"error": "El cuerpo de la petición debe ser JSON válido."})


def test_entrega_la_interfaz_web_desde_la_misma_api(cliente):
    respuesta = cliente.get("/")
    assert respuesta.status_code == 200
    assert "<h1>Registro de productos</h1>" in respuesta.text


def test_responde_502_si_la_red_deja_de_responder(cadena):
    from fastapi.testclient import TestClient

    from app import crear_app

    w3, contrato = conectar(cadena["despliegue"], cadena["entorno"]["RPC_URL"], cadena["entorno"]["CLAVE_PRIVADA_API"])
    apagada = Web3(Web3.HTTPProvider("http://127.0.0.1:9", request_kwargs={"timeout": 2}))
    contrato_apagado = apagada.eth.contract(address=contrato.address, abi=contrato.abi)
    with TestClient(crear_app(apagada, contrato_apagado, cadena["despliegue"], servidor.RAIZ / "frontend")) as cliente:
        respuesta = cliente.get("/api/productos")
    assert respuesta.status_code == 502
    assert "La red no respondió" in respuesta.json()["error"]


def test_validaciones_devuelven_valores_listos_para_el_contrato():
    assert leer_id("15") == 15
    assert leer_precio("123456789012345678901234567890") == 123456789012345678901234567890
    assert leer_precio(0) == 0
    assert leer_nombre(" Arepa ") == "Arepa"
    for invalido, valor in ((leer_id, "-1"), (leer_precio, 2**60), (leer_precio, None), (leer_nombre, 5)):
        with pytest.raises(ErrorEntrada):
            invalido(valor)


def test_nombre_error_reconoce_el_error_del_contrato(cadena):
    _, contrato = conectar(cadena["despliegue"], cadena["entorno"]["RPC_URL"], cadena["entorno"]["CLAVE_PRIVADA_API"])

    class Rechazo(Exception):
        def __init__(self, data):
            self.data = data

    selector = Web3.to_hex(Web3.keccak(text="ProductoInactivo(uint256)")[:4])
    assert nombre_error(contrato, Rechazo(selector + "00" * 32)) == "ProductoInactivo"
    assert nombre_error(contrato, Rechazo({"message": "revert", "data": selector})) == "ProductoInactivo"
    assert nombre_error(contrato, Rechazo("0x12345678")) is None
    assert nombre_error(contrato, Rechazo(None)) is None
    assert traducir_error(contrato, Rechazo(selector))[0] == 409
    assert traducir_error(contrato, ValueError("otro"))[0] == 502


def test_la_proyeccion_ignora_cambios_sin_creacion():
    huerfano = {"txHash": "0x1", "logIndex": 0, "bloque": 3, "tipo": "PrecioActualizado", "idProducto": "8", "cuenta": None, "nombre": None, "precio": "5"}
    assert proyectar_productos([huerfano]) == []


def test_cargar_despliegue_explica_que_hacer(tmp_path):
    with pytest.raises(RuntimeError, match="npm run desplegar"):
        cargar_despliegue(tmp_path / "nada.json")
    incompleto = tmp_path / "incompleto.json"
    incompleto.write_text(json.dumps({"direccion": "0x1", "chainId": 1}), encoding="utf-8")
    with pytest.raises(RuntimeError, match="no tiene «abi»"):
        cargar_despliegue(incompleto)


def test_la_api_no_arranca_sin_variables_ni_contra_otra_red_o_direccion(cadena):
    with pytest.raises(RuntimeError, match="Define la variable RPC_URL"):
        servidor.crear_desde_entorno({})
    with pytest.raises(RuntimeError, match="Define la variable CLAVE_PRIVADA_API"):
        servidor.crear_desde_entorno({"RPC_URL": "http://127.0.0.1:1"})
    url, clave = cadena["entorno"]["RPC_URL"], cadena["entorno"]["CLAVE_PRIVADA_API"]
    with pytest.raises(RuntimeError, match="red 31337 y el despliegue es de la red 5"):
        conectar({**cadena["despliegue"], "chainId": 5}, url, clave)
    with pytest.raises(RuntimeError, match="No hay contrato"):
        conectar({**cadena["despliegue"], "direccion": cadena["cuenta_api"]}, url, clave)


def test_uvicorn_obtiene_la_aplicacion_con_el_entorno_cargado(cadena, monkeypatch):
    for nombre, valor in cadena["entorno"].items():
        monkeypatch.setenv(nombre, valor)
    assert servidor.app.title == "Registro de productos"
    with pytest.raises(AttributeError):
        servidor.no_existe
