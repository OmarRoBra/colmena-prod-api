import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import {
  emitirFactura,
  getFacturasEmitidas,
  getFacturaEmitidaById,
  downloadFacturaPdf,
  downloadFacturaXml,
  cancelarFactura,
  enviarFacturaPorEmail,
  registrarFacturaRecibida,
  getFacturasRecibidas,
  getFacturaRecibidaById,
  updateFacturaRecibida,
  deleteFacturaRecibida,
  getCatalogos,
} from './facturacion.controller';
import {
  emitirFacturaValidation,
  cancelarFacturaValidation,
  listarFacturasEmitidasValidation,
  registrarFacturaRecibidaValidation,
  updateFacturaRecibidaValidation,
  listarFacturasRecibidasValidation,
  getByIdValidation,
  enviarEmailValidation,
} from './facturacion.dto';

const router = Router();
router.use(authenticate);

// ── Catálogos SAT (referencia para el frontend) ───────────────────────────────
router.get('/catalogos', getCatalogos);

// ── Facturas Emitidas (CFDI de Ingreso hacia residentes/externos) ─────────────
router.post('/emitir', authorize('condoAdmin', 'superAdmin'), emitirFacturaValidation, emitirFactura);
router.get('/emitidas', listarFacturasEmitidasValidation, getFacturasEmitidas);
router.get('/emitidas/:id', getByIdValidation, getFacturaEmitidaById);
router.get('/emitidas/:id/pdf', getByIdValidation, downloadFacturaPdf);
router.get('/emitidas/:id/xml', getByIdValidation, downloadFacturaXml);
router.post('/emitidas/:id/cancelar', authorize('condoAdmin', 'superAdmin'), cancelarFacturaValidation, cancelarFactura);
router.post('/emitidas/:id/enviar-email', authorize('condoAdmin', 'superAdmin'), enviarEmailValidation, enviarFacturaPorEmail);

// ── Facturas Recibidas (CFDI de proveedores externos) ─────────────────────────
router.post('/recibidas', authorize('condoAdmin', 'superAdmin'), registrarFacturaRecibidaValidation, registrarFacturaRecibida);
router.get('/recibidas', listarFacturasRecibidasValidation, getFacturasRecibidas);
router.get('/recibidas/:id', getByIdValidation, getFacturaRecibidaById);
router.put('/recibidas/:id', authorize('condoAdmin', 'superAdmin'), updateFacturaRecibidaValidation, updateFacturaRecibida);
router.delete('/recibidas/:id', authorize('condoAdmin', 'superAdmin'), getByIdValidation, deleteFacturaRecibida);

export default router;
