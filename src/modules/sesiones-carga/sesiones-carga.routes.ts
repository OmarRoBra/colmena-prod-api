import { Router } from 'express';
import * as sesionesController from './sesiones-carga.controller';
import * as sesionesDto from './sesiones-carga.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  sesionesDto.getSesionesByCondominioValidation,
  sesionesController.getSesionesByCondominio
);

router.get(
  '/condominio/:condominioId/activas',
  sesionesDto.getSesionesByCondominioValidation,
  sesionesController.getSesionesActivas
);

router.get(
  '/residente/:residenteId',
  authorize('admin', 'condoAdmin', 'resident'),
  sesionesDto.getSesionesByResidenteValidation,
  sesionesController.getSesionesByResidente
);

router.get(
  '/:id',
  sesionesDto.getSesionValidation,
  sesionesController.getSesionById
);

router.post(
  '/',
  authorize('admin', 'condoAdmin', 'resident'),
  sesionesDto.createSesionValidation,
  sesionesController.createSesion
);

router.patch(
  '/:id',
  authorize('admin', 'condoAdmin', 'resident'),
  sesionesDto.updateSesionValidation,
  sesionesController.updateSesion
);

export default router;
