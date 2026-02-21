import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import * as familiaresController from './familiares.controller';
import * as familiaresDto from './familiares.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/residente/:residenteId',
  authorize('admin', 'condoAdmin', 'resident'),
  familiaresDto.getByResidenteValidation,
  familiaresController.getFamiliaresByResidente
);

router.post(
  '/',
  authorize('admin', 'condoAdmin', 'resident'),
  familiaresDto.createFamiliarValidation,
  familiaresController.createFamiliar
);

router.delete(
  '/:id',
  authorize('admin', 'condoAdmin', 'resident'),
  familiaresDto.deleteFamiliarValidation,
  familiaresController.deleteFamiliar
);

export default router;
