import { Router } from 'express';
import * as auditController from './audit-logs.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'condoAdmin'));

router.get('/', auditController.getAuditLogs);
router.get('/:id', auditController.getAuditLogById);

export default router;
