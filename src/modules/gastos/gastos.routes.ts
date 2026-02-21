import { Router } from 'express';
import * as gastosController from './gastos.controller';
import * as gastosDto from './gastos.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  gastosDto.getGastosByCondominioValidation,
  gastosController.getGastosByCondominio
);

router.get(
  '/:id',
  authorize('admin', 'condoAdmin'),
  gastosDto.getGastoValidation,
  gastosController.getGastoById
);

router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  gastosDto.createGastoValidation,
  gastosController.createGasto
);

router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  gastosDto.updateGastoValidation,
  gastosController.updateGasto
);

router.delete(
  '/:id',
  authorize('admin'),
  gastosDto.getGastoValidation,
  gastosController.deleteGasto
);

export default router;
