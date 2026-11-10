# Imagen de la aplicación con API en Node.js. La construye Coolify en el servidor;
# en tu equipo no necesitas Docker. Contexto de build: la raíz del proyecto.
FROM node:24-alpine

ENV NODE_ENV=production \
    TZ=America/Bogota \
    DESPLIEGUE=/app/despliegue.remota.json

RUN apk add --no-cache tzdata
WORKDIR /app

# Dependencias antes del código para aprovechar la caché de capas.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY backend-node/ ./backend-node/
COPY sql/ ./sql/
COPY frontend/ ./frontend/
# Dirección y ABI del contrato en tu red remota: lo escribe `npm run desplegar:remota`.
COPY despliegue.remota.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/salud || exit 1

CMD ["node", "backend-node/servidor.js"]
