# Imagen de publicación de la guía estática «Dinero programable» (§6.2).
# Se construye en CI o en Coolify, nunca en la PC local (Docker no es runtime local).
# Contexto de build: raíz del repositorio, porque `npm run build` empaqueta
# fuentes compartidas (scripts/, taller/inicio, js/vendor y css/vendor).

# ---------- Etapa 1: compilación de frontend/web en web/ ----------
FROM node:24-alpine AS web-build

WORKDIR /guide
# Dependencias antes del código para aprovechar la caché de capas.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY scripts/build-web.cjs scripts/package-taller.cjs ./scripts/
COPY frontend/web/ ./frontend/web/
# frontend/web/evidence/view.mjs importa el registro de entregables de la raíz.
COPY deliverables.registry.json ./
COPY taller/inicio/ ./taller/inicio/
COPY js/vendor/devbrain-learner-sdk.js ./js/vendor/
COPY css/vendor/devbrain-learner-sdk.css css/vendor/devbrain-reader.css ./css/vendor/
RUN npm run build

# ---------- Etapa 2: servidor estático Nginx sin privilegios ----------
FROM nginx:1.27-alpine

ENV TZ=America/Bogota

RUN apk add --no-cache tzdata \
 && cp /usr/share/zoneinfo/America/Bogota /etc/localtime \
 && echo "America/Bogota" > /etc/timezone \
 && sed -i '/^user /d; s#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
 && rm -f /var/log/nginx/access.log /var/log/nginx/error.log \
 && rm -rf /usr/share/nginx/html/* \
 && addgroup -S appuser && adduser -S -G appuser -H -s /sbin/nologin appuser \
 && chown -R appuser:appuser /var/cache/nginx /var/log/nginx /usr/share/nginx/html

COPY --chown=appuser:appuser index.html devbrain-prose.css devbrain-prose.js /usr/share/nginx/html/
COPY --from=web-build --chown=appuser:appuser /guide/web/ /usr/share/nginx/html/web/
# web/index.html enlaza devbrain-prose.* en su propia carpeta y build-web.cjs no los copia.
COPY --chown=appuser:appuser devbrain-prose.css devbrain-prose.js /usr/share/nginx/html/web/

USER appuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
