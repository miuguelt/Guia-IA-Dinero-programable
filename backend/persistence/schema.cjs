const schema = `
CREATE TABLE IF NOT EXISTS guide_events (
  deployment_id TEXT NOT NULL, tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL CHECK(log_index >= 0),
  block_number BIGINT NOT NULL, name TEXT NOT NULL, args JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(deployment_id,tx_hash,log_index)
);
CREATE TABLE IF NOT EXISTS guide_projections (
  deployment_id TEXT NOT NULL, tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL,
  block_number BIGINT NOT NULL, name TEXT NOT NULL, args JSONB NOT NULL,
  PRIMARY KEY(deployment_id,tx_hash,log_index)
);
CREATE TABLE IF NOT EXISTS guide_credentials (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL CHECK(counter >= 0), transports JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;
module.exports = { schema };
