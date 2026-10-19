import { Request, Response } from "express";
import { FinanceService } from "./finance.service";

export class FinanceController {
  static simulateQuote(req: Request, res: Response) {
    try {
      const { assetId, totalPrice, downPayment, installments, annualInterestRate, startDate } = req.body;

      const result = FinanceService.calculateFrenchSchedule({
        assetId,
        totalPrice: Number(totalPrice),
        downPayment: Number(downPayment || 0),
        installments: Number(installments),
        annualInterestRate: Number(annualInterestRate || 0),
        startDate,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error al simular cotización:", error);
      res.status(400).json({ error: error.message || "Error al calcular el cronograma" });
    }
  }
}