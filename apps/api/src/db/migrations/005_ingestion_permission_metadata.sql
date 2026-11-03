BEGIN;

ALTER TABLE analytics.ingestion_runs
  ADD COLUMN IF NOT EXISTS classification varchar(20) NOT NULL DEFAULT 'RESTRICTED',
  ADD COLUMN IF NOT EXISTS allowed_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS data_scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE analytics.ingestion_runs
  DROP CONSTRAINT IF EXISTS ingestion_runs_classification_check,
  ADD CONSTRAINT ingestion_runs_classification_check
    CHECK (classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'));

CREATE INDEX IF NOT EXISTS ingestion_runs_allowed_roles_idx
  ON analytics.ingestion_runs USING GIN (allowed_roles);

CREATE INDEX IF NOT EXISTS ingestion_runs_data_scopes_idx
  ON analytics.ingestion_runs USING GIN (data_scopes);

CREATE INDEX IF NOT EXISTS ingestion_runs_tags_idx
  ON analytics.ingestion_runs USING GIN (tags);

COMMIT;
