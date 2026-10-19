BEGIN;

CREATE TABLE IF NOT EXISTS crm.operation_status_history (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  operation_id text NOT NULL,
  previous_status varchar(40),
  new_status varchar(40) NOT NULL,
  changed_by text NOT NULL,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT operation_status_history_operation_fk
    FOREIGN KEY (operation_id)
    REFERENCES crm.operations(id)
    ON DELETE RESTRICT,

  CONSTRAINT operation_status_history_new_status_check
    CHECK (length(trim(new_status)) > 0)
);

CREATE INDEX IF NOT EXISTS operation_status_history_operation_created_idx
  ON crm.operation_status_history (operation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm.operation_participants (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  operation_id text NOT NULL,
  party_id text NOT NULL,
  role varchar(40) NOT NULL,
  added_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT operation_participants_operation_fk
    FOREIGN KEY (operation_id)
    REFERENCES crm.operations(id)
    ON DELETE RESTRICT,

  CONSTRAINT operation_participants_party_fk
    FOREIGN KEY (party_id)
    REFERENCES core.parties(id)
    ON DELETE RESTRICT,

  CONSTRAINT operation_participants_role_check
    CHECK (role IN (
      'CUSTOMER',
      'ADVISOR',
      'CO_BUYER',
      'GUARANTOR',
      'OTHER'
    )),

  CONSTRAINT operation_participants_unique_role
    UNIQUE (operation_id, party_id, role)
);

CREATE INDEX IF NOT EXISTS operation_participants_operation_idx
  ON crm.operation_participants (operation_id);

CREATE INDEX IF NOT EXISTS operation_participants_party_idx
  ON crm.operation_participants (party_id);

COMMIT;
