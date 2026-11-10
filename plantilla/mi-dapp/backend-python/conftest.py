"""Apoyo de las pruebas: enciende un nodo Hardhat real, despliega el contrato y levanta la API.
También comprueba que cada función de la API fue ejecutada por alguna prueba."""
import ast
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import pytest
from eth_account import Account
from fastapi.testclient import TestClient
from web3 import Web3

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
FUENTES = [AQUI / nombre for nombre in ("cadena.py", "app.py", "servidor.py")]
sys.path.insert(0, str(AQUI))

_ejecutadas = set()


def _registrar(marco, evento, _argumento):
    if evento == "call" and Path(marco.f_code.co_filename).parent == AQUI:
        _ejecutadas.add((Path(marco.f_code.co_filename).name, marco.f_code.co_name))


def pytest_sessionstart(session):
    threading.setprofile(_registrar)
    sys.setprofile(_registrar)


def pytest_sessionfinish(session, exitstatus):
    sys.setprofile(None)
    threading.setprofile(None)
    definidas = sorted(
        (fuente.name, nodo.name)
        for fuente in FUENTES
        for nodo in ast.walk(ast.parse(fuente.read_text(encoding="utf-8")))
        if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef))
    )
    sin_probar = [funcion for funcion in definidas if funcion not in _ejecutadas]
    informe = {
        "metric": "Funciones Python por AST y llamadas observadas con sys.setprofile",
        "total": len(definidas),
        "covered": len(definidas) - len(sin_probar),
        "missing": [f"{archivo}:{nombre}" for archivo, nombre in sin_probar],
    }
    destino = os.environ.get("COBERTURA_FUNCIONES_JSON")
    if destino:
        Path(destino).write_text(json.dumps(informe, indent=2), encoding="utf-8")
    if exitstatus == 0 and sin_probar:
        print(f"\nFunciones sin prueba: {', '.join(informe['missing'])}")
        session.exitstatus = 1


def _hardhat():
    for carpeta in (RAIZ, *RAIZ.parents):
        candidato = carpeta / "node_modules" / "hardhat" / "internal" / "cli" / "cli.js"
        if candidato.exists():
            return [shutil.which("node"), str(candidato)]
    raise RuntimeError("No se encontró Hardhat. Ejecuta npm install en la carpeta del proyecto.")


def _puerto_libre():
    with socket.socket() as enchufe:
        enchufe.bind(("127.0.0.1", 0))
        return enchufe.getsockname()[1]


@pytest.fixture(scope="session")
def nodo():
    """Compila el contrato y enciende `hardhat node` en un puerto libre durante toda la sesión."""
    hardhat = _hardhat()
    subprocess.run([*hardhat, "compile"], cwd=RAIZ, check=True, capture_output=True)
    puerto = _puerto_libre()
    proceso = subprocess.Popen([*hardhat, "node", "--port", str(puerto)], cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    url = f"http://127.0.0.1:{puerto}"
    w3 = Web3(Web3.HTTPProvider(url))
    try:
        for _ in range(120):
            if w3.is_connected():
                break
            time.sleep(0.25)
        else:
            raise RuntimeError("El nodo Hardhat no respondió en 30 s.")
        yield {"url": url, "w3": w3}
    finally:
        proceso.terminate()
        proceso.wait(timeout=30)


@pytest.fixture
def cadena(nodo, tmp_path):
    """Despliega un contrato nuevo y prepara una cuenta para la API con saldo de práctica.
    La cuenta se genera en cada prueba: ninguna clave queda escrita en el código."""
    w3 = nodo["w3"]
    artefacto = json.loads((RAIZ / "artifacts/contracts/RegistroProductos.sol/RegistroProductos.json").read_text(encoding="utf-8"))
    origen = w3.eth.accounts[0]
    envio = w3.eth.contract(abi=artefacto["abi"], bytecode=artefacto["bytecode"]).constructor().transact({"from": origen})
    recibo = w3.eth.wait_for_transaction_receipt(envio)
    despliegue = {"chainId": w3.eth.chain_id, "direccion": recibo["contractAddress"], "bloque": recibo["blockNumber"], "abi": artefacto["abi"]}
    archivo = tmp_path / "despliegue.json"
    archivo.write_text(json.dumps(despliegue), encoding="utf-8")
    cuenta = Account.create()
    w3.eth.wait_for_transaction_receipt(w3.eth.send_transaction({"from": origen, "to": cuenta.address, "value": 10**19}))
    return {
        "w3": w3, "despliegue": despliegue, "cuenta_api": cuenta.address, "usuaria": w3.eth.accounts[1],
        "entorno": {"RPC_URL": nodo["url"], "CLAVE_PRIVADA_API": cuenta.key.hex(), "DESPLIEGUE": str(archivo)},
    }


@pytest.fixture
def cliente(cadena):
    import servidor

    with TestClient(servidor.crear_desde_entorno(cadena["entorno"])) as cliente_http:
        yield cliente_http
