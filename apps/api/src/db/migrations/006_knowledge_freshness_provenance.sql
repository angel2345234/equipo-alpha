BEGIN;

ALTER TABLE public.knowledge_sources
  ADD COLUMN IF NOT EXISTS source_priority varchar(20) NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS provenance_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS content_hash char(64),
  ADD COLUMN IF NOT EXISTS provenance_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS content_hash char(64),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'knowledge_sources_priority_check'
      AND conrelid = 'public.knowledge_sources'::regclass
  ) THEN
    ALTER TABLE public.knowledge_sources
      ADD CONSTRAINT knowledge_sources_priority_check
      CHECK (source_priority IN ('PRIMARY', 'SECONDARY', 'UNSPECIFIED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'knowledge_documents_validity_check'
      AND conrelid = 'public.knowledge_documents'::regclass
  ) THEN
    ALTER TABLE public.knowledge_documents
      ADD CONSTRAINT knowledge_documents_validity_check
      CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS knowledge_sources_sync_idx
  ON public.knowledge_sources (last_synced_at);

CREATE INDEX IF NOT EXISTS knowledge_documents_validity_idx
  ON public.knowledge_documents (valid_from, valid_until);

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
  ON public.knowledge_chunks (document_id, chunk_index);

COMMIT;
