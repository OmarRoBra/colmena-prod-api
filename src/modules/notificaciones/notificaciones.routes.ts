import { Router } from 'express';
import * as notificacionesController from './notificaciones.controller';
import * as notificacionesDto from './notificaciones.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

// Current user's notifications
router.get('/me', notificacionesController.getMyNotificaciones);
router.get('/me/unread-count', notificacionesController.getUnreadCount);
router.post('/me/mark-all-read', notificacionesController.markAllRead);

// Single notification actions
router.patch(
  '/:id/read',
  notificacionesDto.getNotificacionValidation,
  notificacionesController.markAsRead
);

router.delete(
  '/:id',
  notificacionesDto.getNotificacionValidation,
  notificacionesController.deleteNotificacion
);

// Create (admin/condoAdmin use this to send notifications to users)
router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  notificacionesDto.createNotificacionValidation,
  notificacionesController.createNotificacion
);

export default router;
