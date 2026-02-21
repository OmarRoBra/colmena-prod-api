import { Router } from 'express';
import * as documentosController from './documentos.controller';
import * as documentosDto from './documentos.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  documentosController.getAllDocumentos
);

router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  documentosDto.getDocumentosByCondominioValidation,
  documentosController.getDocumentosByCondominio
);

router.get(
  '/:id',
  authorize('admin', 'condoAdmin'),
  documentosDto.getDocumentoValidation,
  documentosController.getDocumentoById
);

router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  documentosDto.createDocumentoValidation,
  documentosController.createDocumento
);

router.delete(
  '/:id',
  authorize('admin'),
  documentosDto.getDocumentoValidation,
  documentosController.deleteDocumento
);

export default router;
