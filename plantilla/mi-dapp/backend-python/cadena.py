"""Las tres piezas para hablar con un contrato desde Python: la URL del nodo (RPC),
la dirección del contrato y su ABI. Es el equivalente de backend-node/contrato.js e indexador.js."""
import json
from pathlib import Path

from eth_account import Account
from web3 import Web3
from web3.middleware import SignAndSendRawMiddlewareBuilder

TIPOS_EVENTO = ("ProductoCreado", "PrecioActualizado", "ProductoDesactivado")


def cargar_despliegue(ruta):
    """Lee despliegue.json, el archivo que escribe `npm run desplegar`."""
    ruta = Path(ruta)
    if not ruta.exists():
        raise RuntimeError("No existe despliegue.json. Enciende el nodo y ejecuta npm run desplegar.")
    despliegue = json.loads(ruta.read_text(encoding="utf-8"))
    for campo in ("direccion", "abi", "chainId"):
        if not despliegue.get(campo):
            raise RuntimeError(f"despliegue.json no tiene «{campo}». Vuelve a desplegar.")
    return despliegue


def conectar(despliegue, rpc_url, clave_privada):
    """Conecta con el nodo y comprueba que es la red y el contrato esperados.
    La cuenta de la API firma en este proceso: la clave nunca viaja al nodo."""
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    red = w3.eth.chain_id
    if red != despliegue["chainId"]:
        raise RuntimeError(
            f"El nodo respondió con la red {red} y el despliegue es de la red {despliegue['chainId']}. "
            "Revisa RPC_URL o vuelve a desplegar."
        )
    direccion = Web3.to_checksum_address(despliegue["direccion"])
    if len(w3.eth.get_code(direccion)) == 0:
        raise RuntimeError("No hay contrato en la dirección de despliegue.json. Si reiniciaste el nodo, vuelve a desplegar.")
    cuenta = Account.from_key(clave_privada)
    w3.middleware_onion.inject(SignAndSendRawMiddlewareBuilder.build(cuenta), layer=0)
    w3.eth.default_account = cuenta.address
    return w3, w3.eth.contract(address=direccion, abi=despliegue["abi"])


def nombre_error(contrato, error):
    """Busca el nombre del error personalizado con el que el contrato rechazó la operación.
    Los primeros cuatro bytes de la respuesta identifican el error, igual que identifican una función."""
    datos = getattr(error, "data", None)
    if isinstance(datos, dict):  # Hardhat envuelve la respuesta; Anvil y otros nodos la entregan directa
        datos = datos.get("data")
    if not isinstance(datos, str) or len(datos) < 10:
        return None
    selector = datos[2:10].lower()
    for parte in contrato.abi:
        if parte["type"] != "error":
            continue
        firma = f"{parte['name']}({','.join(entrada['type'] for entrada in parte['inputs'])})"
        if Web3.keccak(text=firma)[:4].hex().removeprefix("0x") == selector:
            return parte["name"]
    return None


def a_evento(log):
    """Convierte un log de la red en un registro plano. Los números viajan como texto."""
    tipo = log["event"]
    datos = log["args"]
    base = {
        "txHash": Web3.to_hex(log["transactionHash"]),
        "logIndex": log["logIndex"],
        "bloque": log["blockNumber"],
        "tipo": tipo,
        "idProducto": str(datos["id"]),
    }
    if tipo == "ProductoCreado":
        return {**base, "cuenta": datos["responsable"], "nombre": datos["nombre"], "precio": str(datos["precio"])}
    if tipo == "PrecioActualizado":
        return {**base, "cuenta": None, "nombre": None, "precio": str(datos["precioNuevo"])}
    return {**base, "cuenta": datos["responsable"], "nombre": None, "precio": None}


def en_orden(evento):
    return (evento["bloque"], evento["logIndex"])


def leer_eventos(contrato, desde_bloque=0):
    """Lee los eventos del contrato desde un bloque. La cadena es la fuente de verdad."""
    logs = []
    for tipo in TIPOS_EVENTO:
        logs.extend(contrato.events[tipo]().get_logs(from_block=desde_bloque))
    return sorted((a_evento(log) for log in logs), key=en_orden)


def proyectar_productos(eventos):
    """Arma la lista actual de productos recorriendo los eventos en orden."""
    productos = {}
    for evento in sorted(eventos, key=en_orden):
        if evento["tipo"] == "ProductoCreado":
            productos[evento["idProducto"]] = {
                "id": evento["idProducto"], "nombre": evento["nombre"], "precio": evento["precio"],
                "responsable": evento["cuenta"], "activo": True, "cambios": 1,
            }
            continue
        producto = productos.get(evento["idProducto"])
        if producto is None:
            continue
        if evento["tipo"] == "PrecioActualizado":
            producto["precio"] = evento["precio"]
        else:
            producto["activo"] = False
        producto["cambios"] += 1
    return list(productos.values())
