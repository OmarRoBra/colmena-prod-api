import { Router } from 'express';
import * as encuestasController from './encuestas.controller';
import * as encuestasDto from './encuestas.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  encuestasDto.getEncuestasByCondominioValidation,
  encuestasController.getEncuestasByCondominio
);

router.get(
  '/:id/respuestas',
  authorize('admin', 'condoAdmin'),
  encuestasDto.getRespuestasValidation,
  encuestasController.getRespuestas
);

router.post(
  '/:id/respuestas',
  authorize('admin', 'condoAdmin'),
  encuestasDto.createRespuestaValidation,
  encuestasController.createRespuesta
);

router.get(
  '/:id',
  authorize('admin', 'condoAdmin'),
  encuestasDto.getEncuestaValidation,
  encuestasController.getEncuestaById
);

router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  encuestasDto.createEncuestaValidation,
  encuestasController.createEncuesta
);

router.delete(
  '/:id',
  authorize('admin', 'condoAdmin'),
  encuestasDto.deleteEncuestaValidation,
  encuestasController.deleteEncuesta
);

export default router;
