import { Router } from 'express';
import { TransactionController } from './transaction.controller';

const router = Router();

// Rutas para el paquete ALP4-005 (Transaction facts)
router.post('/operations', TransactionController.createOperation);
router.post('/stage-changes', TransactionController.createStageChange);
router.post('/closings', TransactionController.createClosing);

export default router;