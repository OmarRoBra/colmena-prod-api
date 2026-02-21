import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import * as visitasController from './visitas.controller';
import * as visitasDto from './visitas.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin', 'securityWorker'),
  visitasDto.getByCondominioValidation,
  visitasController.getVisitasByCondominio
);

router.get(
  '/residente/:residenteId',
  authorize('admin', 'condoAdmin', 'resident'),
  visitasDto.getByResidenteValidation,
  visitasController.getVisitasByResidente
);

router.post(
  '/',
  authorize('admin', 'condoAdmin', 'resident'),
  visitasDto.createVisitaValidation,
  visitasController.createVisita
);

router.patch(
  '/scan/:qrToken',
  authorize('admin', 'condoAdmin', 'securityWorker'),
  visitasDto.scanQrValidation,
  visitasController.scanQr
);

router.get(
  '/:id',
  authorize('admin', 'condoAdmin', 'resident', 'securityWorker'),
  visitasDto.getVisitaValidation,
  visitasController.getVisitaById
);

export default router;
