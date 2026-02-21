import { Router } from 'express';
import * as mensajesController from './mensajes.controller';
import * as mensajesDto from './mensajes.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  mensajesController.getAllMensajes
);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin', 'resident'),
  mensajesDto.getMensajesByCondominioValidation,
  mensajesController.getMensajesByCondominio
);

router.get(
  '/:id',
  authorize('admin', 'condoAdmin', 'resident'),
  mensajesDto.getMensajeValidation,
  mensajesController.getMensajeById
);

router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  mensajesDto.createMensajeValidation,
  mensajesController.createMensaje
);

router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  mensajesDto.updateMensajeValidation,
  mensajesController.updateMensaje
);

router.patch(
  '/:id',
  authorize('admin', 'condoAdmin'),
  mensajesDto.updateMensajeValidation,
  mensajesController.updateMensaje
);

router.delete(
  '/:id',
  authorize('admin'),
  mensajesDto.getMensajeValidation,
  mensajesController.deleteMensaje
);

export default router;
