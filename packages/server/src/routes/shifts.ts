import { Router } from 'express';
import { closeShift } from '../controllers/shiftsController.js';

const router = Router();

router.post('/:id/close', closeShift as any);

export default router;
