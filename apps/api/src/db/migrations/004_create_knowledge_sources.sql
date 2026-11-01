-- Migration: 004_create_knowledge_sources.sql
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id SERIAL PRIMARY KEY,
  source_name VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  sensitivity VARCHAR(50) NOT NULL,
  validity_date TIMESTAMP,
  permissions TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  origin_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para optimizar búsquedas por estado y sensibilidad
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status_sensitivity 
ON knowledge_sources(status, sensitivity);