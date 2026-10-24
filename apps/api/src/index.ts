import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { InventoryController } from "./modules/inventory/inventory.controller";
import { CrmService } from "./modules/crm/crm.service";
import { FinanceController } from "./modules/finance/finance.controller";
import { ReservationController } from "./modules/reservations/reservation.controller";
import { OperationController } from "./modules/operations/operation.controller";
import commercialRoutes from "./modules/analytics/commercial.routes";
import transactionRoutes from "./modules/analytics/transaction.routes"; 
import { startReservationExpirationScheduler } from "./modules/reservations/reservation-expiration.scheduler";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "zenplus-api", timestamp: new Date().toISOString() });
});

// --- INVENTORY MODULE (INV-001, INV-002, INV-010) ---

// INV-010: Listar activos con filtros (type, status, maxPrice)
app.get("/api/assets", InventoryController.list);

// INV-010: Detalle de un activo por ID
app.get("/api/assets/:id", InventoryController.getById);

// INV-001: Crear activo en DRAFT
app.post("/api/assets", InventoryController.createDraft);
app.post(
  "/api/reservations/expire-due",
  ReservationController.expireDue,
);

// INV-002: Máquina de estados (AVAILABLE -> RESERVED, etc.)
app.patch("/api/assets/:id/status", InventoryController.updateStatus);

// --- CRM MODULE (CRM-001, CRM-004) ---

// CRM-001: Captura de prospectos
app.post("/api/leads", async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, assetId, message, source } = req.body;
    if (!fullName || !email || !phone) {
      return res.status(400).json({ error: "Faltan campos obligatorios de contacto (fullName, email, phone)" });
    }

    const lead = await CrmService.captureLead({
      fullName,
      email,
      phone,
      assetId,
      message,
      source,
    });

    res.status(201).json(lead);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Listar prospectos
app.get("/api/leads", async (_req: Request, res: Response) => {
  try {
    const leads = await CrmService.listLeads();
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- RESERVATIONS MODULE ---

app.post("/api/reservations", ReservationController.create);
app.post("/api/reservations/:id/convert", OperationController.convertReservation);

// --- FINANCE MODULE (FIN-001: Amortización Francesa) ---

app.post("/api/quotes/simulate", FinanceController.simulateQuote);

// --- ANALYTICS MODULE (ALP4-004 & ALP4-005) ---

app.use("/api/analytics", commercialRoutes);
app.use("/api/analytics", transactionRoutes);

const PORT = process.env.PORT || 8082;

app.listen(PORT, () => {
  console.log(`ZenPlus OS API corriendo en http://localhost:${PORT}`);
  startReservationExpirationScheduler();
});
