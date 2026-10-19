
import { randomUUID } from "node:crypto";
import { pool } from "../../db";
import type { Pool } from "pg";
import { CreateReservationInput } from "./reservation.types";

export class ReservationService {
  static async create(input: CreateReservationInput, dbpool: Pick<Pool, "connect"> = pool,) {
    const opportunityId = input.opportunityId?.trim();
    const assetId = input.assetId?.trim();
    const createdBy = input.createdBy?.trim();
    const idempotencyKey = input.idempotencyKey?.trim();
    const offerThreadId = input.offerThreadId?.trim() || null;
    const expiresInMinutes = input.expiresInMinutes ?? 15;

    if (!opportunityId || !assetId || !createdBy || !idempotencyKey) {
      throw new Error(
        "VALIDATION_ERROR: opportunityId, assetId, createdBy e idempotencyKey son obligatorios",
      );
    }

    if (
      !Number.isInteger(expiresInMinutes) ||
      expiresInMinutes < 1 ||
      expiresInMinutes > 1440
    ) {
      throw new Error(
        "VALIDATION_ERROR: expiresInMinutes debe ser un entero entre 1 y 1440",
      );
    }

    const client = await dbpool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      // Serializa las peticiones que usan la misma clave.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [idempotencyKey],
      );

      const existingResult = await client.query(
        `SELECT *
         FROM crm.reservations
         WHERE idempotency_key = $1
         LIMIT 1`,
        [idempotencyKey],
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];

        // Una clave no puede reutilizarse para otra operación.
        if (
          existing.opportunity_id !== opportunityId ||
          existing.asset_id !== assetId ||
          existing.offer_thread_id !== offerThreadId ||
          existing.created_by !== createdBy
        ) {
          throw new Error(
            "CONFLICT: La clave de idempotencia ya se utilizó con otros datos",
          );
        }

        await client.query("COMMIT");
        transactionStarted = false;

        return { reservation: existing, created: false };
      }

      // Bloquea el inmueble para evitar reservas concurrentes.
      const assetResult = await client.query(
        `SELECT id, status, commercial_status, publication_status
         FROM inventory.assets
         WHERE id = $1
         FOR UPDATE`,
        [assetId],
      );

      if (assetResult.rows.length === 0) {
        throw new Error("NOT_FOUND: El inmueble no existe");
      }

      const asset = assetResult.rows[0];

      if (
        asset.status !== "AVAILABLE" ||
        asset.commercial_status !== "AVAILABLE" ||
        asset.publication_status !== "PUBLISHED"
      ) {
        throw new Error(
          "ASSET_UNAVAILABLE: El inmueble debe estar disponible para reservar",
        );
      }

      const opportunityResult = await client.query(
        `SELECT id
         FROM crm.opportunities
         WHERE id = $1
         LIMIT 1`,
        [opportunityId],
      );

      if (opportunityResult.rows.length === 0) {
        throw new Error("NOT_FOUND: La oportunidad no existe");
      }

      if (offerThreadId) {
        const offerResult = await client.query(
          `SELECT id, opportunity_id, asset_id
           FROM crm.offer_threads
           WHERE id = $1
           FOR UPDATE`,
          [offerThreadId],
        );

        if (offerResult.rows.length === 0) {
          throw new Error("NOT_FOUND: El hilo de oferta no existe");
        }

        const offer = offerResult.rows[0];

        if (offer.opportunity_id !== opportunityId) {
          throw new Error(
            "VALIDATION_ERROR: El hilo de oferta no pertenece a la oportunidad indicada",
          );
        }

        if (offer.asset_id && offer.asset_id !== assetId) {
          throw new Error(
            "VALIDATION_ERROR: El inmueble no coincide con el hilo de oferta",
          );
        }
      }

      const activeResult = await client.query(
        `SELECT id
         FROM crm.reservations
         WHERE asset_id = $1
           AND status = 'ACTIVE'
           AND expires_at > CURRENT_TIMESTAMP
         LIMIT 1`,
        [assetId],
      );

      if (activeResult.rows.length > 0) {
        throw new Error(
          "ASSET_RESERVED: El inmueble ya tiene una reserva vigente",
        );
      }

      const reservationResult = await client.query(
        `INSERT INTO crm.reservations (
           id,
           opportunity_id,
           asset_id,
           offer_thread_id,
           idempotency_key,
           status,
           expires_at,
           created_by,
           created_at,
           updated_at
         )
         VALUES (
           $1, $2, $3, $4, $5, 'ACTIVE',
           CURRENT_TIMESTAMP + ($6 * INTERVAL '1 minute'),
           $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )
         RETURNING *`,
        [
          randomUUID(),
          opportunityId,
          assetId,
          offerThreadId,
          idempotencyKey,
          expiresInMinutes,
          createdBy,
        ],
      );

      await client.query(
        `UPDATE inventory.assets
         SET commercial_status = 'RESERVATION_HOLD',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [assetId],
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        reservation: reservationResult.rows[0],
        created: true,
      };
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query("ROLLBACK");
        transactionStarted = false;
      }

      const dbError = error as { code?: string };

      if (dbError.code === "23505") {
        throw new Error(
          "CONFLICT: El hilo de oferta o la clave de idempotencia ya están asociados a otra reserva",
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  static async expireDueReservations(
    dbpool: Pick<Pool, "connect"> = pool,
  ): Promise<{ expiredReservations: number; releasedAssets: number }> {
    const client = await dbpool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      // Bloquea primero los inmuebles para mantener el mismo
      // orden de bloqueo que el método create.
      const assetsResult = await client.query(`
        SELECT a.id
        FROM inventory.assets a
        WHERE EXISTS (
          SELECT 1
          FROM crm.reservations r
          WHERE r.asset_id = a.id
            AND r.status = 'ACTIVE'
            AND r.expires_at <= CURRENT_TIMESTAMP
        )
        ORDER BY a.id
        FOR UPDATE OF a SKIP LOCKED
      `);

      const assetIds = assetsResult.rows.map(
        (row: { id: string }) => row.id,
      );

      if (assetIds.length === 0) {
        await client.query("COMMIT");
        transactionStarted = false;

        return {
          expiredReservations: 0,
          releasedAssets: 0,
        };
      }

      // Marca como vencidas todas las reservas caducadas
      // de los inmuebles bloqueados.
      const expiredResult = await client.query(
        `UPDATE crm.reservations
         SET status = 'EXPIRED',
             updated_at = CURRENT_TIMESTAMP
         WHERE asset_id = ANY($1::text[])
           AND status = 'ACTIVE'
           AND expires_at <= CURRENT_TIMESTAMP
         RETURNING id`,
        [assetIds],
      );

      // Solo libera inmuebles que continúan siendo aptos
      // para la comercialización y no tienen otra reserva vigente.
      const releasedResult = await client.query(
        `UPDATE inventory.assets a
         SET commercial_status = 'AVAILABLE',
             updated_at = CURRENT_TIMESTAMP
         WHERE a.id = ANY($1::text[])
           AND a.status = 'AVAILABLE'
           AND a.commercial_status = 'RESERVATION_HOLD'
           AND a.publication_status = 'PUBLISHED'
           AND NOT EXISTS (
             SELECT 1
             FROM crm.reservations r
             WHERE r.asset_id = a.id
               AND r.status = 'ACTIVE'
               AND r.expires_at > CURRENT_TIMESTAMP
           )
         RETURNING a.id`,
        [assetIds],
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        expiredReservations: expiredResult.rowCount ?? 0,
        releasedAssets: releasedResult.rowCount ?? 0,
      };
    } catch (error) {
      if (transactionStarted) {
        await client.query("ROLLBACK");
      }

      throw error;
    } finally {
      client.release();
    }
  }
}