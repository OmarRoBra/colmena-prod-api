import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import {
  getStatus,
  getQRCode,
  sendMensaje,
  enviarAvisoCondominio,
  enviarRecordatorioPagos,
} from './whatsapp.controller';

const router = Router();

// ── Conexión (sin auth — solo lectura, solo disponible en desarrollo) ──────────

/** GET /whatsapp/status — Estado del cliente */
router.get('/status', getStatus);

/** GET /whatsapp/qr — QR code en base64 para escanear */
router.get('/qr', getQRCode);

// ── Envío individual ──────────────────────────────────────────────────────────

/** POST /whatsapp/send — Enviar mensaje a un número específico */
router.post(
  '/send',
  authenticate,
  authorize('admin', 'condoAdmin'),
  [
    body('telefono').notEmpty().withMessage('telefono es requerido'),
    body('mensaje').notEmpty().withMessage('mensaje es requerido'),
  ],
  sendMensaje
);

// ── Envíos masivos ────────────────────────────────────────────────────────────

/** POST /whatsapp/avisos/condominio/:condominioId — Aviso a todos los residentes */
router.post(
  '/avisos/condominio/:condominioId',
  authenticate,
  authorize('admin', 'condoAdmin'),
  [
    param('condominioId').isUUID().withMessage('condominioId debe ser UUID válido'),
    body('mensaje').notEmpty().withMessage('mensaje es requerido'),
    body('asunto').optional().isString(),
  ],
  enviarAvisoCondominio
);

/** POST /whatsapp/pagos/recordatorio/:condominioId — Recordatorio de pagos pendientes */
router.post(
  '/pagos/recordatorio/:condominioId',
  authenticate,
  authorize('admin', 'condoAdmin'),
  [
    param('condominioId').isUUID().withMessage('condominioId debe ser UUID válido'),
    body('mensaje').optional().isString(),
  ],
  enviarRecordatorioPagos
);

export default router;
