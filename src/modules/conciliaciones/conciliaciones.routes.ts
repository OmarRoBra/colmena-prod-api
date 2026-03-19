import { Router } from 'express';
import * as controller from './conciliaciones.controller';
import * as dto from './conciliaciones.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// All reconciliation routes require admin or condoAdmin
router.use(authorize('admin', 'condoAdmin'));

/**
 * @route   GET /api/v1/conciliaciones/condominio/:condominioId
 * @desc    Get all reconciliation sessions for a condominium
 */
router.get(
  '/condominio/:condominioId',
  dto.getConciliacionesByCondominioValidation,
  controller.getConciliaciones
);

/**
 * @route   GET /api/v1/conciliaciones/:id
 * @desc    Get a reconciliation session with movements
 */
router.get(
  '/:id',
  dto.getConciliacionValidation,
  controller.getConciliacionById
);

/**
 * @route   GET /api/v1/conciliaciones/:id/export
 * @desc    Export reconciliation as CSV
 */
router.get(
  '/:id/export',
  dto.getConciliacionValidation,
  controller.exportConciliacionCsv
);

/**
 * @route   POST /api/v1/conciliaciones
 * @desc    Create a new reconciliation session with movements
 */
router.post(
  '/',
  dto.createConciliacionValidation,
  controller.createConciliacion
);

/**
 * @route   POST /api/v1/conciliaciones/movimientos/:id/confirm
 * @desc    Confirm a movement match
 */
router.post(
  '/movimientos/:id/confirm',
  dto.confirmMovimientoValidation,
  controller.confirmMovimiento
);

/**
 * @route   POST /api/v1/conciliaciones/movimientos/:id/ignore
 * @desc    Ignore a movement
 */
router.post(
  '/movimientos/:id/ignore',
  dto.getConciliacionValidation,
  controller.ignoreMovimiento
);

/**
 * @route   POST /api/v1/conciliaciones/movimientos/bulk-confirm
 * @desc    Bulk confirm high-confidence matches
 */
router.post(
  '/movimientos/bulk-confirm',
  dto.bulkConfirmValidation,
  controller.bulkConfirmMovimientos
);

/**
 * @route   PUT /api/v1/conciliaciones/:id/review
 * @desc    Mark session as reviewed
 */
router.put(
  '/:id/review',
  dto.getConciliacionValidation,
  controller.reviewConciliacion
);

/**
 * @route   PUT /api/v1/conciliaciones/:id/close
 * @desc    Close a reconciliation session
 */
router.put(
  '/:id/close',
  dto.getConciliacionValidation,
  controller.closeConciliacion
);

/**
 * @route   DELETE /api/v1/conciliaciones/:id
 * @desc    Delete a draft reconciliation session
 */
router.delete(
  '/:id',
  dto.getConciliacionValidation,
  controller.deleteConciliacion
);

export default router;
