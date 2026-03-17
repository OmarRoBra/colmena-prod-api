import { Router } from 'express';
import * as ctrl from './conciliacion.controller';
import * as dto from './conciliacion.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'condoAdmin'));

router.post('/generar-automatica', dto.generarAutomaticaValidation, ctrl.generarConciliacionAutomatica);
router.post('/upload', dto.uploadValidation, ctrl.uploadEstadoBancario);
router.get('/condominio/:condominioId', ctrl.getConciliacionesByCondominio);
router.get('/:id/movimientos', ctrl.getMovimientos);
router.get('/:id/reporte', ctrl.getReporte);
router.post('/:id/confirmar', dto.confirmarValidation, ctrl.confirmarConciliacion);
router.delete('/:id', ctrl.deleteConciliacion);

export default router;
