"""Analiza la compilación Hardhat existente sin abrir una consola interactiva."""
import json
import logging
import sys
from pathlib import Path

from crytic_compile import CryticCompile
from crytic_compile.platform.hardhat import Hardhat
from slither.__main__ import get_detectors_and_printers
from slither.slither import Slither


class PreparedHardhat(Hardhat):
    def _get_hardhat_paths(self, _base_cmd, _args):
        root = Path(self.target).resolve()
        return {"root": root, "artifacts": root / "artifacts" / "hardhat"}


def analyze(root):
    logging.disable(logging.CRITICAL)
    try:
        compilation = CryticCompile(PreparedHardhat(str(Path(root).resolve())), hardhat_ignore_compile=True)
        slither = Slither(compilation, filter_paths=["node_modules", "contracts/testing"])
        detectors, _ = get_detectors_and_printers()
        for detector in detectors:
            slither.register_detector(detector)
        results = [finding for group in slither.run_detectors() for finding in group]
        return {"success": True, "error": None, "contractsAnalyzed": len(slither.contracts), "results": {"detectors": results}}
    except Exception as error:
        return {"success": False, "error": "No se pudo analizar la compilación. Ejecuta la compilación y revisa sus artefactos.", "errorType": type(error).__name__, "results": {"detectors": []}}


if __name__ == "__main__":
    report = analyze(sys.argv[1])
    print(json.dumps(report))
    sys.exit(0 if report["success"] else 1)
