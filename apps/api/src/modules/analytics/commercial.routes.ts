import { Router } from 'express';
import { CommercialController } from './commercial.controller';

const router = Router();

// Rutas para el paquete ALP4-004 (Commercial facts)
router.post('/leads', CommercialController.createLead);
router.post('/visits', CommercialController.createVisit);
router.post('/reservations', CommercialController.createReservation);
router.post('/opportunities', CommercialController.createOpportunity);

export default router;