import { Request, Response } from "express";
import { OperationService } from "./operation.service";

export class OperationController {
  static async convertReservation(req: Request, res: Response) {
    try {
      const reservationId = req.params.id;
      const { createdBy } = req.body ?? {};

      if (
        typeof reservationId !== "string" ||
        !reservationId.trim() ||
        typeof createdBy !== "string" ||
        !createdBy.trim()
      ) {
        return res.status(400).json({
          error: "Se requieren el ID de la reserva y el campo createdBy.",
        });
      }

      const result = await OperationService.convertReservation({
        reservationId,
        createdBy,
      });

      return res
        .status(result.created ? 201 : 200)
        .json({
          operation: result.operation,
          created: result.created,
        });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error interno del servidor";

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

      if (message.startsWith("CONFLICT")) {
        return res.status(409).json({
          error: message.replace("CONFLICT: ", ""),
        });
      }

      console.error("Error al convertir reserva en operación:", error);

      return res.status(500).json({
        error: "No se pudo convertir la reserva en una operación.",
      });
    }
  }
}
