import { Request, Response } from "express";
import {
  IngestionContractError,
  isIngestionStatus,
  normalizeDatasetName,
  normalizePermissionMetadata,
} from "./ingestion.contract";
import { requireIngestionAuth } from "./ingestion.auth";
import { IngestionService } from "./ingestion.service";

export class IngestionController {
  private static handleError(res: Response, error: unknown) {
    if (error instanceof IngestionContractError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    console.error("Error en el contrato de ingesta:", error);
    return res.status(500).json({
      success: false,
      error: "No se pudo completar la operación de ingesta.",
      code: "INGESTION_INTERNAL_ERROR",
    });
  }

  static async register(req: Request, res: Response) {
    try {
      const result = await IngestionService.registerRun(req.body);
      return res.status(result.created ? 201 : 200).json({
        success: true,
        created: result.created,
        data: result.run,
      });
    } catch (error: unknown) {
      return IngestionController.handleError(res, error);
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (typeof id !== "string" || !id.trim()) {
        return res.status(400).json({
          success: false,
          error: "El ID de ejecución es obligatorio.",
          code: "INVALID_INGESTION_RUN_ID",
        });
      }
      const principal = requireIngestionAuth(res.locals.auth);
      const result = await IngestionService.getRun(id, principal);
      return res.json({ success: true, data: result });
    } catch (error: unknown) {
      return IngestionController.handleError(res, error);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const principal = requireIngestionAuth(res.locals.auth);
      const datasetName = req.query.datasetName;
      const classification = req.query.classification;
      const tags = req.query.tags;
      if (
        (datasetName !== undefined && typeof datasetName !== "string") ||
        (classification !== undefined && typeof classification !== "string") ||
        (tags !== undefined && typeof tags !== "string")
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Los filtros datasetName, classification y tags deben ser texto.",
          code: "INVALID_INGESTION_FILTER",
        });
      }

      const metadata = normalizePermissionMetadata({
        classification:
          typeof classification === "string"
            ? classification.trim().toUpperCase()
            : undefined,
        tags: tags ? tags.split(",") : [],
      });
      const runs = await IngestionService.listRuns(principal, {
        datasetName: datasetName
          ? normalizeDatasetName(datasetName)
          : undefined,
        classification: classification ? metadata.classification : undefined,
        tags: metadata.tags,
      });
      return res.json({ success: true, data: runs });
    } catch (error: unknown) {
      return IngestionController.handleError(res, error);
    }
  }

  static async transition(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const status = req.body?.status;
      if (typeof id !== "string" || !id.trim()) {
        return res.status(400).json({
          success: false,
          error: "El ID de ejecución es obligatorio.",
          code: "INVALID_INGESTION_RUN_ID",
        });
      }
      if (!isIngestionStatus(status)) {
        return res.status(400).json({
          success: false,
          error: "El estado solicitado no pertenece al contrato de ingesta.",
          code: "INVALID_INGESTION_STATUS",
        });
      }

      const run = await IngestionService.transitionRun(
        id,
        status,
        req.body.error,
      );
      return res.json({ success: true, data: run });
    } catch (error: unknown) {
      return IngestionController.handleError(res, error);
    }
  }
}
