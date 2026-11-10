# Imagen de la aplicación con API en Python. La construye Coolify en el servidor;
# en tu equipo no necesitas Docker. Contexto de build: la raíz del proyecto.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=America/Bogota \
    DESPLIEGUE=/app/despliegue.remota.json

WORKDIR /app

# Dependencias antes del código para aprovechar la caché de capas.
COPY backend-python/requirements.txt ./backend-python/
RUN pip install --no-cache-dir -r backend-python/requirements.txt

COPY backend-python/ ./backend-python/
COPY frontend/ ./frontend/
# Dirección y ABI del contrato en tu red remota: lo escribe `npm run desplegar:remota`.
COPY despliegue.remota.json ./

RUN useradd --system --no-create-home aplicacion
USER aplicacion
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3000/api/salud')" || exit 1

CMD ["uvicorn", "--app-dir", "backend-python", "servidor:app", "--host", "0.0.0.0", "--port", "3000"]
