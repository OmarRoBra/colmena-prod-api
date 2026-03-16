import { Router } from 'express';
import * as notificacionesController from './notificaciones.controller';
import * as notificacionesDto from './notificaciones.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();
router.use(authenticate);

// Current user's notifications
router.get('/me', cache({ ttl: CacheTTL.SHORT }), notificacionesController.getMyNotificaciones);
router.get('/me/unread-count', cache({ ttl: CacheTTL.SHORT }), notificacionesController.getUnreadCount);
router.post('/me/mark-all-read', invalidateCache(['*notificaciones*']), notificacionesController.markAllRead);

// Single notification actions
router.patch(
  '/:id/read',
  notificacionesDto.getNotificacionValidation,
  invalidateCache(['*notificaciones*']),
  notificacionesController.markAsRead
);

router.delete(
  '/:id',
  notificacionesDto.getNotificacionValidation,
  invalidateCache(['*notificaciones*']),
  notificacionesController.deleteNotificacion
);

// Create (admin/condoAdmin use this to send notifications to users)
router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  notificacionesDto.createNotificacionValidation,
  invalidateCache(['*notificaciones*']),
  notificacionesController.createNotificacion
);

export default router;
