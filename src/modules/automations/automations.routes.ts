import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import * as automationsController from './automations.controller';

const router = Router();

router.get('/cron', automationsController.runAutomationsFromCron);

router.use(authenticate);
router.use(authorize('admin', 'condoAdmin'));

router.get('/history', automationsController.getAutomationHistory);
router.post('/run', automationsController.runAutomations);

export default router;
