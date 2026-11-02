import { Request, Response } from "express";
import { KnowledgeQualityService } from "./knowledge-quality.service";
import { XeniaAggregatesService } from "./xenia-aggregates.service";

/**
 * Endpoints de la célula Alpha para XENIA (Fase 5).
 *
 * ALP5-009  GET /api/xenia/knowledge/quality
 * ALP5-010  GET /api/xenia/aggregates/inventory-by-zone   (PUBLIC)
 * ALP5-010  GET /api/xenia/aggregates/lead-demand         (INTERNAL)
 *
 * Pendiente (Security): la API aún no tiene autenticación/RBAC. Los endpoints
 * INTERNAL deben protegerse por rol antes de exponerse fuera de la red interna.
 */
export class XeniaController {
  private static handleError(res: Response, error: unknown) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error interno del servidor",
    });
  }

  static async knowledgeQuality(_req: Request, res: Response) {
    try {
      const report = await KnowledgeQualityService.runChecks();
      return res.json({ success: true, ...report });
    } catch (error) {
      return XeniaController.handleError(res, error);
    }
  }

  static async inventoryByZone(_req: Request, res: Response) {
    try {
      const result = await XeniaAggregatesService.getInventoryByZone();
      return res.json({ success: true, ...result });
    } catch (error) {
      return XeniaController.handleError(res, error);
    }
  }

  static async leadDemand(_req: Request, res: Response) {
    try {
      const result = await XeniaAggregatesService.getLeadDemand();
      return res.json({ success: true, ...result });
    } catch (error) {
      return XeniaController.handleError(res, error);
    }
  }
}
