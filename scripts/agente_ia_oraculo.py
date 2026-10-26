"""
============================================================================
AGENTE AUTÓNOMO DE IA (ORÁCULO EN PYTHON)
Tecnólogo ADSO SENA — Dinero Programable & Smart Contracts
============================================================================

Demuestra cómo un servicio en Python (FastAPI, Flask o script de inferencia)
conecta un modelo de Inteligencia Artificial con la red blockchain para
autorizar pagos condicionales en el contrato DineroProgramableBase.
============================================================================
"""

import json
import os
import sys
from typing import Dict, Any, Tuple

# Garantizar codificación UTF-8 en stdout/stderr para consolas Windows y CI
for stream_name in ("stdout", "stderr"):
    stream = getattr(sys, stream_name, None)
    if stream is not None and not getattr(stream, "closed", False):
        if hasattr(stream, "reconfigure") and callable(getattr(stream, "reconfigure")):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
                continue
            except Exception:
                pass
        if hasattr(stream, "buffer"):
            try:
                import io
                buffer = None
                if hasattr(stream, "detach") and callable(getattr(stream, "detach")):
                    try:
                        buffer = stream.detach()
                    except Exception:
                        buffer = None
                if buffer is None:
                    buffer = getattr(stream, "buffer", None)
                if buffer is not None:
                    new_wrapper = io.TextIOWrapper(buffer, encoding="utf-8", errors="replace", line_buffering=True)
                    setattr(sys, stream_name, new_wrapper)
                    if getattr(sys, f"__{stream_name}__", None) is stream:
                        setattr(sys, f"__{stream_name}__", new_wrapper)
            except Exception:
                pass

# Constantes del contrato inteligente
CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Selector de función de Solidity: autorizarPagoCondicional(uint256,address,uint256,uint256)
# keccak256("autorizarPagoCondicional(uint256,address,uint256,uint256)")[0:4] = 0x56a65ffc (ejemplo)

def evaluar_calidad_con_ia_python(lote_datos: Dict[str, Any]) -> Tuple[int, bool]:
    """
    Simula la inferencia de un modelo de IA en Python.
    Evalúa parámetros físico-químicos u objetivos de entrega.
    Retorna: (puntaje_0_a_100, es_aprobado)
    """
    print(f"🧠 [Python IA] Analizando lote #{lote_datos.get('id_lote', 1)}...")
    tipo = lote_datos.get("tipo", "AGRO")
    
    if tipo == "LECHE":
        temp = lote_datos.get("temperatura", 3.8)
        acidez = lote_datos.get("acidez", 16)
        puntaje = (60 if temp <= 4.0 else 20) + (38 if 14 <= acidez <= 18 else 10)
    elif tipo == "MIEL":
        humedad = lote_datos.get("humedad", 18.5)
        delta_c13 = lote_datos.get("delta_c13", -25.2)
        puntaje = (50 if humedad <= 20.0 else 15) + (48 if delta_c13 <= -24.5 else 10)
    else:
        puntaje = 95
        
    aprobado = puntaje >= 90
    print(f"📊 [Python IA] Puntaje obtenido: {puntaje}/100 -> {'APROBADO ✅' if aprobado else 'RECHAZADO ❌'}")
    return puntaje, aprobado


def construir_payload_transaccion(id_lote: int, beneficiario: str, monto_wei: int, puntaje: int) -> Dict[str, Any]:
    """
    Construye la estructura de la transacción para el nodo JSON-RPC.
    """
    return {
        "to": CONTRACT_ADDRESS,
        "function": "autorizarPagoCondicional",
        "params": {
            "idLote": id_lote,
            "beneficiario": beneficiario,
            "montoWei": monto_wei,
            "puntajeCalidadIA": puntaje
        }
    }


def ejecutar_oraculo_ia_demo():
    """
    Demostración de ejecución del flujo de oráculo desde Python.
    """
    print("============================================================")
    print("🤖 EJEMPLO EN PYTHON: AGENTE DE IA & DINERO PROGRAMABLE")
    print("============================================================")

    # Caso 1: Lote de miel pura que cumple todos los estándares
    lote_optimo = {
        "id_lote": 201,
        "tipo": "MIEL",
        "humedad": 17.8,
        "delta_c13": -26.1,
        "beneficiario": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    }

    puntaje, aprobado = evaluar_calidad_con_ia_python(lote_optimo)
    if aprobado:
        tx_data = construir_payload_transaccion(
            id_lote=lote_optimo["id_lote"],
            beneficiario=lote_optimo["beneficiario"],
            monto_wei=1_500_000_000_000_000_000, # 1.5 ETH en Wei
            puntaje=puntaje
        )
        print("🚀 Payload de transacción preparado para la blockchain:")
        print(json.dumps(tx_data, indent=2))
        print("✅ La transacción se firma con la clave privada del oráculo y se envía al RPC.")
    else:
        print("❌ Lote rechazado. Fondos protegidos en Escrow.")

if __name__ == "__main__":
    ejecutar_oraculo_ia_demo()
