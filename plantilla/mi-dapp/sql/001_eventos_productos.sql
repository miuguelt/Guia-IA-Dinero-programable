-- Proyección de lectura: una fila por evento del contrato RegistroProductos.
-- UNIQUE (tx_hash, log_index) identifica cada evento de la cadena; por eso
-- sincronizar dos veces no duplica filas. La tabla puede vaciarse y reconstruirse.

CREATE TABLE IF NOT EXISTS eventos_productos (
  id           BIGSERIAL PRIMARY KEY,
  tx_hash      CHAR(66)       NOT NULL,
  log_index    INTEGER        NOT NULL,
  bloque       BIGINT         NOT NULL,
  tipo         TEXT           NOT NULL,
  id_producto  NUMERIC(78, 0) NOT NULL,
  cuenta       CHAR(42),
  nombre       TEXT,
  precio       NUMERIC(78, 0),
  UNIQUE (tx_hash, log_index)
);
