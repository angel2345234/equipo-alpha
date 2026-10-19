import { randomUUID } from "node:crypto";
import { pool } from "../../db";
import {
  AssetStatus,
  VALID_STATUS_TRANSITIONS,
  UpdateAssetStatusInput,
  AssetFilterParams,
  CreateAssetDraftInput,
} from "./inventory.types";

export class InventoryService {
  // Listar activos con filtros opcionales
  static async list(filters?: AssetFilterParams) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.type) {
      params.push(filters.type);
      conditions.push(`type = $${params.length}`);
    }

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    if (filters?.minPrice !== undefined && filters.minPrice !== "") {
      params.push(Number(filters.minPrice));
      conditions.push(`price >= $${params.length}`);
    }

    if (filters?.maxPrice !== undefined && filters.maxPrice !== "") {
      params.push(Number(filters.maxPrice));
      conditions.push(`price <= $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT *
       FROM inventory.assets
       ${where}
       ORDER BY created_at DESC`,
      params,
    );

    return result.rows;
  }

  // Obtener activo por ID
  static async getById(id: string) {
    const result = await pool.query(
      `SELECT *
       FROM inventory.assets
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    return result.rows[0] ?? null;
  }

  // Crear borrador de activo
  static async createDraft(input: CreateAssetDraftInput) {
    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO inventory.assets (
         id,
         project_id,
         code,
         title,
         type,
         status,
         price,
         currency,
         area,
         details,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, 'DRAFT',
         $6, $7, $8, $9, CURRENT_TIMESTAMP
       )
       RETURNING *`,
      [
        id,
        input.projectId || null,
        input.code,
        input.title,
        input.type,
        input.price,
        input.currency || "USD",
        input.area ?? null,
        input.details ?? {},
      ],
    );

    return result.rows[0];
  }

  // Actualizar estado respetando las transiciones permitidas
  static async updateStatus(id: string, input: UpdateAssetStatusInput) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Bloquear la fila mientras se valida y actualiza el estado
      const currentResult = await client.query(
        `SELECT *
         FROM inventory.assets
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      if (currentResult.rows.length === 0) {
        throw new Error("NOT_FOUND: Activo inmobiliario no encontrado");
      }

      const currentAsset = currentResult.rows[0];
      const currentStatus = currentAsset.status as AssetStatus;
      const targetStatus = input.status;

      if (currentStatus === targetStatus) {
        await client.query("COMMIT");
        return currentAsset;
      }

      const allowedNextStates =
        VALID_STATUS_TRANSITIONS[currentStatus] || [];

      if (!allowedNextStates.includes(targetStatus)) {
        throw new Error(
          `INVALID_TRANSITION: No se permite cambiar de ${currentStatus} a ${targetStatus}. Transiciones válidas: [${allowedNextStates.join(", ")}]`,
        );
      }

      const updatedResult = await client.query(
        `UPDATE inventory.assets
         SET status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id, targetStatus],
      );

      await client.query("COMMIT");

      return updatedResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}