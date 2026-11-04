BEGIN;

CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
    id BIGSERIAL PRIMARY KEY,

    chunk_id INTEGER NOT NULL
        REFERENCES public.knowledge_chunks(id)
        ON DELETE CASCADE,

    provider VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,

    dimensions INTEGER NOT NULL
        CHECK (dimensions > 0),

    content_hash CHAR(64) NOT NULL,

    embedding public.vector,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'ACTIVE',
                'SUPERSEDED',
                'FAILED'
            )
        ),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT knowledge_embeddings_identity_check
        CHECK (
            LENGTH(TRIM(provider)) > 0
            AND LENGTH(TRIM(model)) > 0
        ),

    CONSTRAINT knowledge_embeddings_vector_dimensions_check
        CHECK (
            embedding IS NULL
            OR public.vector_dims(embedding) = dimensions
        ),

    CONSTRAINT knowledge_embeddings_active_vector_check
        CHECK (
            status <> 'ACTIVE'
            OR embedding IS NOT NULL
        )
);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_chunk_idx
    ON public.knowledge_embeddings (chunk_id);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_model_idx
    ON public.knowledge_embeddings (provider, model, dimensions);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_status_idx
    ON public.knowledge_embeddings (status);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_embeddings_active_unique_idx
    ON public.knowledge_embeddings (chunk_id, provider, model)
    WHERE status = 'ACTIVE';

COMMIT;
