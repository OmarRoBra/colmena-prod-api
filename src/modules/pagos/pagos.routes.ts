import { Router } from 'express';
import * as pagosController from './pagos.controller';
import * as pagosDto from './pagos.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/pagos
 * @desc    Get all pagos
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.SHORT }),
  pagosController.getAllPagos
);

/**
 * @route   GET /api/v1/pagos/unidad/:unidadId
 * @desc    Get pagos by unidad ID
 * @access  Private (admin, condoAdmin, owner, tenant)
 */
router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  pagosDto.getPagosByCondominioValidation,
  cache({ ttl: CacheTTL.SHORT }),
  pagosController.getPagosByCondominium
);

router.get(
  '/reporte-antiguedad/:condominioId',
  authorize('admin', 'condoAdmin'),
  pagosDto.getPagosByCondominioValidation,
  cache({ ttl: CacheTTL.SHORT }),
  pagosController.getAgedReceivables
);

router.get(
  '/export/:condominioId',
  authorize('admin', 'condoAdmin'),
  pagosDto.getPagosByCondominioValidation,
  pagosController.exportPaymentsCsv
);

router.get(
  '/unidad/:unidadId',
  authorize('admin', 'condoAdmin', 'owner', 'tenant', 'resident'),
  pagosDto.getPagosByUnidadValidation,
  cache({ ttl: CacheTTL.SHORT }),
  pagosController.getPagosByUnidad
);

/**
 * @route   GET /api/v1/pagos/:id
 * @desc    Get pago by ID
 * @access  Private (admin, condoAdmin, owner, tenant, resident)
 */
router.get(
  '/:id',
  authorize('admin', 'condoAdmin', 'owner', 'tenant', 'resident'),
  pagosDto.getPagoValidation,
  cache({ ttl: CacheTTL.SHORT }),
  pagosController.getPagoById
);

/**
 * @route   POST /api/v1/pagos
 * @desc    Create a new pago
 * @access  Private (all authenticated users)
 */
router.post(
  '/',
  pagosDto.createPagoValidation,
  invalidateCache(['*pagos*', '*notificaciones*', '*unidades*']),
  pagosController.createPago
);

router.post(
  '/generate-maintenance',
  authorize('admin', 'condoAdmin'),
  pagosDto.generateMaintenanceFeesValidation,
  invalidateCache(['*pagos*', '*notificaciones*', '*unidades*']),
  pagosController.generateMaintenanceFees
);

/**
 * @route   POST /api/v1/pagos/bulk-approve
 * @desc    Bulk approve payments (por_verificar → completado)
 * @access  Private (admin, condoAdmin)
 */
router.post(
  '/bulk-approve',
  authorize('admin', 'condoAdmin'),
  pagosDto.bulkApproveValidation,
  invalidateCache(['*pagos*', '*notificaciones*', '*unidades*']),
  pagosController.bulkApprovePagos
);

/**
 * @route   POST /api/v1/pagos/:id/report-payment
 * @desc    Resident reports a payment (sets por_verificar status)
 * @access  Private (resident, owner, tenant)
 */
router.post(
  '/:id/report-payment',
  authorize('admin', 'condoAdmin', 'owner', 'tenant', 'resident'),
  pagosDto.reportPaymentValidation,
  invalidateCache(['*pagos*', '*notificaciones*']),
  pagosController.reportPayment
);

/**
 * @route   POST /api/v1/pagos/:id/request-clarification
 * @desc    Resident requests clarification on a payment
 * @access  Private (resident, owner, tenant)
 */
router.post(
  '/:id/request-clarification',
  authorize('admin', 'condoAdmin', 'owner', 'tenant', 'resident'),
  pagosDto.requestClarificationValidation,
  invalidateCache(['*pagos*', '*notificaciones*']),
  pagosController.requestClarification
);

/**
 * @route   PUT /api/v1/pagos/:id
 * @desc    Update pago
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  pagosDto.updatePagoValidation,
  invalidateCache(['*pagos*', '*notificaciones*', '*unidades*']),
  pagosController.updatePago
);

/**
 * @route   DELETE /api/v1/pagos/:id
 * @desc    Delete pago
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  pagosDto.getPagoValidation,
  invalidateCache(['*pagos*', '*notificaciones*', '*unidades*']),
  pagosController.deletePago
);

export default router;
