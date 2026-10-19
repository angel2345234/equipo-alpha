import { Request, Response } from "express";
import { InventoryService } from "./inventory.service";

export class InventoryController {
  // Listar activos
  static async list(req: Request, res: Response) {
    try {
      const assets = await InventoryService.list(req.query);
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Detalle por ID
  static async getById(req: Request, res: Response) {
    try {
      const asset = await InventoryService.getById(req.params.id as string);
      if (!asset) {
        return res.status(404).json({ error: "Activo no encontrado" });
      }
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Crear borrador DRAFT
  static async createDraft(req: Request, res: Response) {
    try {
      const { code, title, type, price, currency, area, projectId, details } = req.body;
      if (!code || !title || !type || !price || !area) {
        return res.status(400).json({ error: "Faltan campos obligatorios (code, title, type, price, area)" });
      }

      const newAsset = await InventoryService.createDraft({
        code,
        title,
        type,
        price: Number(price),
        currency,
        area: Number(area),
        projectId,
        details,
      });

      res.status(201).json(newAsset);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Máquina de estados: transición de estado
  static async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { status, leadId, notes } = req.body;

      if (!status) {
        return res.status(400).json({ error: "El campo 'status' es obligatorio." });
      }

      const updated = await InventoryService.updateStatus(id, { status, leadId, notes });
      res.json(updated);
    } catch (error: any) {
      console.error("Error al actualizar estado:", error.message);
      if (error.message.startsWith("NOT_FOUND")) {
        return res.status(404).json({ error: error.message.replace("NOT_FOUND: ", "") });
      }
      if (error.message.startsWith("INVALID_TRANSITION")) {
        return res.status(409).json({ error: error.message.replace("INVALID_TRANSITION: ", "") });
      }
      res.status(500).json({ error: error.message || "Error interno del servidor" });
    }
  }
}