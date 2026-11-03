import { Router } from "express";
import { IngestionController } from "./ingestion.controller";

const router = Router();

router.post("/runs", IngestionController.register);
router.get("/runs", IngestionController.list);
router.get("/runs/:id", IngestionController.get);
router.patch("/runs/:id/status", IngestionController.transition);

export default router;
