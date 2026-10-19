import { pool } from "../../db";

export interface LeadIntakeInput {
  fullName: string;
  email: string;
  phone: string;
  assetId?: string;
  message?: string;
  source?: string;
}

export class CrmService {
  // CRM-001: Captura de Lead desde formulario web con Party Pattern
  static async captureLead(input: LeadIntakeInput) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Party Pattern: Buscar si la persona ya existe por su email
      const partyQuery = "SELECT id FROM core.parties WHERE email = $1 LIMIT 1;";
      const partyRes = await client.query(partyQuery, [input.email]);

      let partyId: string;

      if (partyRes.rows.length > 0) {
        partyId = partyRes.rows[0].id;
      } else {
        // Crear nueva entidad Party si es un contacto nuevo
        const createPartySql = `
          INSERT INTO core.parties (party_type, full_name, email, phone)
          VALUES ('PERSON', $1, $2, $3)
          RETURNING id;
        `;
        const newPartyRes = await client.query(createPartySql, [
          input.fullName,
          input.email,
          input.phone,
        ]);
        partyId = newPartyRes.rows[0].id;
      }

      // 2. CRM-004: Asignación inicial de asesor
      const assignedAdvisor = "advisor-1";

      // 3. Registrar el Lead enlazado al Party y al Activo
      const insertLeadSql = `
        INSERT INTO crm.leads (
          party_id, asset_id, full_name, email, phone, source, message, assigned_to, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NEW')
        RETURNING *;
      `;
      const leadRes = await client.query(insertLeadSql, [
        partyId,
        input.assetId || null,
        input.fullName,
        input.email,
        input.phone,
        input.source || "WEB_FORM",
        input.message || null,
        assignedAdvisor,
      ]);

      await client.query("COMMIT");
      return leadRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Listar leads para seguimiento comercial
  static async listLeads() {
    const sql = `
      SELECT 
        l.id, l.full_name, l.email, l.phone, l.source, l.message, 
        l.assigned_to, l.status, l.created_at,
        a.code AS asset_code, a.title AS asset_title,
        p.id AS party_id
      FROM crm.leads l
      LEFT JOIN inventory.assets a ON l.asset_id = a.id
      LEFT JOIN crm.parties p ON l.party_id = p.id
      ORDER BY l.created_at DESC;
    `;
    const { rows } = await pool.query(sql);
    return rows;
  }
}