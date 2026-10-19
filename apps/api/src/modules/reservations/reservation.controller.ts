import { Request, Response } from "express";
import { ReservationService } from "./reservation.service";
import { timingSafeEqual } from "node:crypto";

export class ReservationController {
  static async create(req: Request, res: Response) {
    try {
      const {
        opportunityId,
        assetId,
        createdBy,
        offerThreadId,
        expiresInMinutes,
      } = req.body ?? {};

      const idempotencyKey =
        req.get("Idempotency-Key") || req.body?.idempotencyKey;

      if (
        typeof opportunityId !== "string" ||
        typeof assetId !== "string" ||
        typeof createdBy !== "string" ||
        typeof idempotencyKey !== "string"
      ) {
        return res.status(400).json({
          error:
            "Se requieren opportunityId, assetId, createdBy e idempotencyKey (o la cabecera Idempotency-Key).",
        });
      }

      if (
        offerThreadId !== undefined &&
        offerThreadId !== null &&
        typeof offerThreadId !== "string"
      ) {
        return res.status(400).json({
          error: "offerThreadId debe ser una cadena de texto.",
        });
      }

const result = await ReservationService.create({
  opportunityId,
  assetId,
  createdBy,
  idempotencyKey,
  offerThreadId,
  expiresInMinutes,
});

return res.status(result.created ? 201 : 200).json(result.reservation);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error interno del servidor";

      if (message.startsWith("VALIDATION_ERROR")) {
        return res.status(400).json({
          error: message.replace("VALIDATION_ERROR: ", ""),
        });
      }

      if (message.startsWith("NOT_FOUND")) {
        return res.status(404).json({
          error: message.replace("NOT_FOUND: ", ""),
        });
      }

      if (
        message.startsWith("ASSET_UNAVAILABLE") ||
        message.startsWith("ASSET_RESERVED") ||
        message.startsWith("CONFLICT")
      ) {
        return res.status(409).json({
          error: message.replace(/^[A-Z_]+:\s*/, ""),
        });
      }

      console.error("Error al crear reserva:", message);

      return res.status(500).json({
        error: "No se pudo crear la reserva.",
      });
    }
  }
  static async expireDue(req: Request, res: Response) {
    const configuredKey = process.env.RESERVATION_EXPIRATION_ADMIN_KEY;

    if (!configuredKey) {
      return res.status(503).json({
        error: "La operación administrativa no está configurada.",
      });
    }

    const authorization = req.get("Authorization") ?? "";
    const prefix = "Bearer ";

    if (!authorization.startsWith(prefix)) {
      return res.status(401).json({
        error: "Autorización requerida.",
      });
    }

    const providedKey = authorization.slice(prefix.length);
    const expectedBuffer = Buffer.from(configuredKey, "utf8");
    const providedBuffer = Buffer.from(providedKey, "utf8");

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({
        error: "Clave administrativa inválida.",
      });
    }

    try {
      const result = await ReservationService.expireDueReservations();

      return res.status(200).json({
        message: "Proceso manual de vencimiento completado.",
        ...result,
      });
    } catch (error: unknown) {
      console.error("Error al vencer reservas:", error);

      return res.status(500).json({
        error: "No se pudo completar el vencimiento de reservas.",
      });
    }
  }

}
