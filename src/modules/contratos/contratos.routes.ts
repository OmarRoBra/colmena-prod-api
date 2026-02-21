import { Router } from 'express';
import * as contratosController from './contratos.controller';
import * as contratosDto from './contratos.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  contratosController.getAllContratos
);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  contratosDto.getContratosByCondominioValidation,
  contratosController.getContratosByCondominio
);

router.get(
  '/:id',
  authorize('admin', 'condoAdmin'),
  contratosDto.getContratoValidation,
  contratosController.getContratoById
);

router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  contratosDto.createContratoValidation,
  contratosController.createContrato
);

router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  contratosDto.updateContratoValidation,
  contratosController.updateContrato
);

router.delete(
  '/:id',
  authorize('admin'),
  contratosDto.getContratoValidation,
  contratosController.deleteContrato
);

export default router;
