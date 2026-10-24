import { Request, Response } from 'express';
import { CommercialService } from './commercial.service';

export class CommercialController {
  static async createLead(req: Request, res: Response) {
    try {
      const result = await CommercialService.insertLeadFact(req.body);
      return res.status(201).json({
        success: true,
        message: 'Lead comercial registrado exitosamente',
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}