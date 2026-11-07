import { Router } from "express";
import { XeniaController } from "./xenia.controller";

const router = Router();

// ALP5-009: Knowledge Quality Checks
router.get("/knowledge/quality", XeniaController.knowledgeQuality);

// ALP5-010: XENIA Safe Aggregates
router.get("/aggregates/inventory-by-zone", XeniaController.inventoryByZone);
router.get("/aggregates/lead-demand", XeniaController.leadDemand);

export default router;
