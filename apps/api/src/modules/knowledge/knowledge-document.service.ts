import { query } from '../../db';

export interface CreateDocumentDTO {
  sourceId: number;
  title: string;
  author?: string;
  version?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface CreateChunkDTO {
  documentId: number;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
}

export class KnowledgeDocumentService {
  static async createDocument(data: CreateDocumentDTO) {
    const queryString = `
      INSERT INTO knowledge_documents (source_id, title, author, version, content, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      data.sourceId,
      data.title,
      data.author || null,
      data.version || '1.0',
      data.content,
      data.metadata ? JSON.stringify(data.metadata) : null
    ];
    const result = await query(queryString, values);
    return result.rows[0];
  }

  static async createChunk(data: CreateChunkDTO) {
    const queryString = `
      INSERT INTO knowledge_chunks (document_id, chunk_index, content, token_count)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [
      data.documentId, 
      data.chunkIndex, 
      data.content, 
      data.tokenCount || null
    ];
    const result = await query(queryString, values);
    return result.rows[0];
  }

  static async getDocumentWithChunks(documentId: number) {
    // Obtener el documento
    const docQuery = `SELECT * FROM knowledge_documents WHERE id = $1;`;
    const docResult = await query(docQuery, [documentId]);
    const document = docResult.rows[0];

    if (!document) return null;

    // Obtener los chunks asociados ordenados por su índice
    const chunksQuery = `SELECT * FROM knowledge_chunks WHERE document_id = $1 ORDER BY chunk_index ASC;`;
    const chunksResult = await query(chunksQuery, [documentId]);

    return {
      ...document,
      chunks: chunksResult.rows
    };
  }
}