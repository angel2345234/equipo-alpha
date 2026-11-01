import { Request, Response } from 'express';
import { CommercialService } from './commercial.service';
import { AnalyticsValidationError } from './analytics.validation';

export class CommercialController {
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

  static async createLead(req: Request, res: Response) {
    try {
      const result = await CommercialService.insertLeadFact(req.body);

      return res.status(201).json({
        success: true,
        message: 'Lead comercial registrado exitosamente',
        data: result
      });
    } catch (error: unknown) {
      return CommercialController.handleError(res, error);
    }
  }

  static async createVisit(req: Request, res: Response) {
    try {
      const result = await CommercialService.insertVisitFact(req.body);

      return res.status(201).json({
        success: true,
        message: 'Visita comercial registrada exitosamente',
        data: result
      });
    } catch (error: unknown) {
      return CommercialController.handleError(res, error);
    }
  }

  static async createReservation(req: Request, res: Response) {
    try {
      const result = await CommercialService.insertReservationFact(req.body);

      return res.status(201).json({
        success: true,
        message: 'Reserva comercial registrada exitosamente',
        data: result
      });
    } catch (error: unknown) {
      return CommercialController.handleError(res, error);
    }
  }

  static async createOpportunity(req: Request, res: Response) {
    try {
      const result = await CommercialService.insertOpportunityFact(req.body);

      return res.status(201).json({
        success: true,
        message: 'Oportunidad comercial registrada exitosamente',
        data: result
      });
    } catch (error: unknown) {
      return CommercialController.handleError(res, error);
    }
  }
}