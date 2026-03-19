import { Router } from 'express';
import * as cargadoresController from './cargadores.controller';
import * as cargadoresDto from './cargadores.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'condoAdmin'), cargadoresController.getAllCargadores);

router.get(
  '/condominio/:condominioId',
  cargadoresDto.getCargadoresByCondominioValidation,
  cargadoresController.getCargadoresByCondominio
);

router.get(
  '/:id',
  cargadoresDto.getCargadorValidation,
  cargadoresController.getCargadorById
);

router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  cargadoresDto.createCargadorValidation,
  cargadoresController.createCargador
);

router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  cargadoresDto.updateCargadorValidation,
  cargadoresController.updateCargador
);

router.delete(
  '/:id',
  authorize('admin'),
  cargadoresDto.getCargadorValidation,
  cargadoresController.deleteCargador
);

export default router;
