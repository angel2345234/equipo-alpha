import { query } from '../../db';

export interface CreateKnowledgeSourceDTO {
  sourceName: string;
  owner: string;
  type: string;
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  validityDate?: Date;
  permissions: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  originUrl: string;
}

export class KnowledgeSourceService {
  static async createSource(data: CreateKnowledgeSourceDTO) {
    const queryString = `
      INSERT INTO knowledge_sources 
        (source_name, owner, type, sensitivity, validity_date, permissions, status, origin_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      data.sourceName,
      data.owner,
      data.type,
      data.sensitivity,
      data.validityDate || null,
      data.permissions,
      data.status,
      data.originUrl
    ];
    
    // Usamos la función query directamente
    const result = await query(queryString, values);
    return result.rows[0];
  }

  static async getSourceById(id: number) {
    const queryString = `SELECT * FROM knowledge_sources WHERE id = $1;`;
    const result = await query(queryString, [id]);
    return result.rows[0];
  }
}