BEGIN;

CREATE TABLE crm.operations (
  id text PRIMARY KEY,
  source_reservation_id text NOT NULL,
  opportunity_id text NOT NULL,
  asset_id text NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'OPEN',
  reservation_snapshot jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT operations_source_reservation_unique
    UNIQUE (source_reservation_id),

  CONSTRAINT operations_source_reservation_fk
    FOREIGN KEY (source_reservation_id)
    REFERENCES crm.reservations(id)
    ON DELETE RESTRICT,

  CONSTRAINT operations_opportunity_fk
    FOREIGN KEY (opportunity_id)
    REFERENCES crm.opportunities(id)
    ON DELETE RESTRICT,

  CONSTRAINT operations_asset_fk
    FOREIGN KEY (asset_id)
    REFERENCES inventory.assets(id)
    ON DELETE RESTRICT
);

COMMIT;
