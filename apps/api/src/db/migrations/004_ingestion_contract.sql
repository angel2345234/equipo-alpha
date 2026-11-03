BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.ingestion_runs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_system varchar(100) NOT NULL,
  dataset_name varchar(100) NOT NULL,
  contract_version integer NOT NULL,
  payload_checksum char(64) NOT NULL,
  normalized_payload jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'RECEIVED',
  attempt_count integer NOT NULL DEFAULT 0,
  last_error_code varchar(100),
  last_error_message text,
  received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ingestion_runs_contract_version_check
    CHECK (contract_version > 0),
  CONSTRAINT ingestion_runs_checksum_check
    CHECK (payload_checksum ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ingestion_runs_status_check
    CHECK (status IN (
      'RECEIVED',
      'VALIDATING',
      'PROCESSING',
      'SUCCEEDED',
      'FAILED'
    )),
  CONSTRAINT ingestion_runs_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT ingestion_runs_idempotency_unique
    UNIQUE (source_system, dataset_name, contract_version, payload_checksum)
);

CREATE INDEX IF NOT EXISTS ingestion_runs_status_received_idx
  ON analytics.ingestion_runs (status, received_at DESC);

CREATE TABLE IF NOT EXISTS analytics.ingestion_errors (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ingestion_run_id text NOT NULL,
  phase varchar(50) NOT NULL,
  error_code varchar(100) NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  retryable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT ingestion_errors_run_fk
    FOREIGN KEY (ingestion_run_id)
    REFERENCES analytics.ingestion_runs(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ingestion_errors_run_created_idx
  ON analytics.ingestion_errors (ingestion_run_id, created_at DESC);

COMMIT;
