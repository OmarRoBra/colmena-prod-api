import { Router } from 'express';
import * as mantenimientoController from './mantenimiento.controller';
import * as mantenimientoDto from './mantenimiento.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'condoAdmin'), mantenimientoController.getAllMantenimiento);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin', 'worker', 'securityWorker'),
  mantenimientoController.getMantenimientoByCondominio
);

router.get(
  '/residente/:residenteId',
  authorize('admin', 'condoAdmin', 'resident'),
  mantenimientoController.getMantenimientoByResidente
);

router.get('/:id', mantenimientoDto.getMantenimientoValidation, mantenimientoController.getMantenimientoById);

router.post(
  '/',
  authorize('admin', 'condoAdmin', 'resident', 'worker', 'serviceProvider'),
  mantenimientoDto.createMantenimientoValidation,
  mantenimientoController.createMantenimiento
);

router.put(
  '/:id',
  authorize('admin', 'condoAdmin', 'worker', 'serviceProvider'),
  mantenimientoDto.updateMantenimientoValidation,
  mantenimientoController.updateMantenimiento
);

router.delete('/:id', authorize('admin'), mantenimientoDto.getMantenimientoValidation, mantenimientoController.deleteMantenimiento);

export default router;
