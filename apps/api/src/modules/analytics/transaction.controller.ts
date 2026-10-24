import { Request, Response } from 'express';
import { TransactionService } from './transaction.service';

export class TransactionController {
  static async createOperation(req: Request, res: Response) {
    try {
      const result = await TransactionService.insertOperationFact(req.body);
      return res.status(201).json({
        success: true,
        message: 'Operación transaccional registrada exitosamente',
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createStageChange(req: Request, res: Response) {
    try {
      const result = await TransactionService.insertStageChangeFact(req.body);
      return res.status(201).json({
        success: true,
        message: 'Cambio de etapa registrado exitosamente',
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createClosing(req: Request, res: Response) {
    try {
      const result = await TransactionService.insertClosingFact(req.body);
      return res.status(201).json({
        success: true,
        message: 'Cierre transaccional registrado exitosamente',
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}