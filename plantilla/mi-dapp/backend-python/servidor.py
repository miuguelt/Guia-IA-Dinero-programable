"""Punto de entrada de la API en Python. Toda la configuración llega por variables de entorno:
  RPC_URL            URL del nodo (http://127.0.0.1:8545 en local)
  CLAVE_PRIVADA_API  clave de la cuenta con la que la API firma; nunca se escribe en el código
  DESPLIEGUE         opcional; ruta de despliegue.json

Se inicia con: uvicorn --app-dir backend-python servidor:app --port 3000
"""
import os
from pathlib import Path

from app import crear_app
from cadena import cargar_despliegue, conectar

RAIZ = Path(__file__).resolve().parent.parent


def crear_desde_entorno(entorno=os.environ):
    for nombre in ("RPC_URL", "CLAVE_PRIVADA_API"):
        if not entorno.get(nombre):
            raise RuntimeError(f"Define la variable {nombre} antes de iniciar la API.")
    despliegue = cargar_despliegue(entorno.get("DESPLIEGUE") or RAIZ / "despliegue.json")
    w3, contrato = conectar(despliegue, entorno["RPC_URL"], entorno["CLAVE_PRIVADA_API"])
    return crear_app(w3, contrato, despliegue, RAIZ / "frontend")


def __getattr__(nombre):
    """uvicorn pide `servidor.app`: la aplicación se arma en ese momento, con el entorno ya cargado."""
    if nombre == "app":
        return crear_desde_entorno()
    raise AttributeError(nombre)
