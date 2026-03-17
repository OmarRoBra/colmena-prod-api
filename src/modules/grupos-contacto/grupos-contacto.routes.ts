import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import * as controller from './grupos-contacto.controller';
import * as dto from './grupos-contacto.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  dto.getGruposByCondominioValidation,
  controller.getGruposByCondominio
);

router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  dto.createGrupoValidation,
  controller.createGrupo
);

router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  dto.updateGrupoValidation,
  controller.updateGrupo
);

router.patch(
  '/:id',
  authorize('admin', 'condoAdmin'),
  dto.updateGrupoValidation,
  controller.updateGrupo
);

router.delete(
  '/:id',
  authorize('admin', 'condoAdmin'),
  dto.grupoIdValidation,
  controller.deleteGrupo
);

export default router;
