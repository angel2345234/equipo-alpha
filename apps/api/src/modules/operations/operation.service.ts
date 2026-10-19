import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { pool } from "../../db";

export interface ConvertReservationInput {
  reservationId: string;
  createdBy: string;
}

export class OperationService {
  static async convertReservation(
    input: ConvertReservationInput,
    dbpool: Pick<Pool, "connect"> = pool,
  ) {
    const reservationId = input.reservationId?.trim();
    const createdBy = input.createdBy?.trim();

    if (!reservationId || !createdBy) {
      throw new Error(
        "VALIDATION_ERROR: reservationId y createdBy son obligatorios",
      );
    }

    const client = await dbpool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      // Bloquea la reserva para serializar las conversiones concurrentes.
      const reservationResult = await client.query(
        `SELECT
           r.*,
           (r.expires_at > CURRENT_TIMESTAMP) AS is_unexpired
         FROM crm.reservations r
         WHERE r.id = $1
         FOR UPDATE`,
        [reservationId],
      );

      if (reservationResult.rows.length === 0) {
        throw new Error("NOT_FOUND: La reserva no existe");
      }

      const reservation = reservationResult.rows[0];

      // Un reintento devuelve la operación existente sin generar eventos.
      const existingResult = await client.query(
        `SELECT *
         FROM crm.operations
         WHERE source_reservation_id = $1
         LIMIT 1`,
        [reservationId],
      );

      if (existingResult.rows.length > 0) {
        await client.query("COMMIT");
        transactionStarted = false;

        return {
          operation: existingResult.rows[0],
          created: false,
        };
      }

      if (reservation.status !== "ACTIVE") {
        throw new Error(
          "CONFLICT: Solo se pueden convertir reservas ACTIVE",
        );
      }

      if (!reservation.is_unexpired) {
        throw new Error(
          "CONFLICT: La reserva ha vencido y no puede convertirse",
        );
      }

      const operationId = randomUUID();

      const operationResult = await client.query(
        `INSERT INTO crm.operations (
           id,
           source_reservation_id,
           opportunity_id,
           asset_id,
           status,
           reservation_snapshot,
           created_by,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, 'OPEN', $5, $6,
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          operationId,
          reservation.id,
          reservation.opportunity_id,
          reservation.asset_id,
          reservation,
          createdBy,
        ],
      );

      // Registra el estado inicial dentro de la misma transacción.
      await client.query(
        `INSERT INTO crm.operation_status_history (
           operation_id,
           previous_status,
           new_status,
           changed_by,
           reason,
           details
         )
         VALUES ($1, NULL, 'OPEN', $2, $3, $4::jsonb)`,
        [
          operationId,
          createdBy,
          "Operación creada por conversión de reserva",
          JSON.stringify({
            sourceReservationId: reservationId,
          }),
        ],
      );

      // Obtiene la persona asociada al lead de la oportunidad.
      const partyResult = await client.query(
        `SELECT l.party_id
         FROM crm.opportunities o
         JOIN crm.leads l ON l.id = o.lead_id
         WHERE o.id = $1
         LIMIT 1`,
        [reservation.opportunity_id],
      );

      const partyId = partyResult.rows[0]?.party_id;

      // El participante CUSTOMER solo se crea si existe party_id.
      if (typeof partyId === "string" && partyId.trim()) {
        await client.query(
          `INSERT INTO crm.operation_participants (
             operation_id,
             party_id,
             role,
             added_by
           )
           VALUES ($1, $2, 'CUSTOMER', $3)
           ON CONFLICT (operation_id, party_id, role) DO NOTHING`,
          [operationId, partyId, createdBy],
        );
      }

      await client.query(
        `UPDATE crm.reservations
         SET status = 'CONVERTED',
             converted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reservationId],
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        operation: operationResult.rows[0],
        created: true,
      };
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query("ROLLBACK");
      }

      const dbError = error as { code?: string };

      if (dbError.code === "23505") {
        throw new Error(
          "CONFLICT: La reserva ya está asociada a una operación",
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }
}
