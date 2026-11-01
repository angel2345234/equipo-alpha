import { Request, Response } from 'express';
import { TransactionService } from './transaction.service';
import { AnalyticsValidationError } from './analytics.validation';

export class TransactionController {
  private static handleError(res: Response, error: unknown) {
    if (error instanceof AnalyticsValidationError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      });
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Error interno del servidor'
    });
  }

  static async createOperation(req: Request, res: Response) {
    try {
      const result = await TransactionService.insertOperationFact(req.body);

      return res.status(201).json({
        success: true,
        message: 'Operación transaccional registrada exitosamente',
        data: result
      });
    } catch (error: unknown) {
      return TransactionController.handleError(res, error);
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
    } catch (error: unknown) {
      return TransactionController.handleError(res, error);
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
    } catch (error: unknown) {
      return TransactionController.handleError(res, error);
    }
  }
}