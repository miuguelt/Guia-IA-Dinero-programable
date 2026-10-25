-- Etapa 5 (CAPA 3: Proyección en Base de Datos Relacional):
-- Los contratos inteligentes en la cadena no están diseñados para consultas complejas,
-- filtros por fechas, agregaciones ni paginación rápida (sería extremadamente costoso en gas).
-- Por eso se utiliza el patrón CQRS: los eventos de la cadena se proyectan hacia una tabla SQL.
--
-- La restricción UNIQUE(tx_hash, log_index) garantiza IDEMPOTENCIA:
-- Aunque el indexador se reinicie y lea los mismos bloques múltiples veces,
-- la base de datos ignora los registros duplicados sin corromper el estado.

CREATE TABLE IF NOT EXISTS eventos_agropay (
  id         BIGSERIAL PRIMARY KEY,
  tx_hash    CHAR(66)       NOT NULL,
  log_index  INTEGER        NOT NULL,
  bloque     BIGINT         NOT NULL,
  tipo       TEXT           NOT NULL,
  id_lote    NUMERIC(78, 0),
  cuenta     CHAR(42)       NOT NULL,
  monto_wei  NUMERIC(78, 0) NOT NULL,
  UNIQUE (tx_hash, log_index)
);
