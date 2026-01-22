import { Router } from 'express';
import * as reglamentosController from './reglamentos.controller';
import * as reglamentosDto from './reglamentos.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/reglamentos
 * @desc    Get all reglamentos
 * @access  Private (all authenticated users - filtered in controller)
 */
router.get(
  '/',
  cache({ ttl: CacheTTL.VERY_LONG }),
  reglamentosController.getAllReglamentos
);

/**
 * @route   GET /api/v1/reglamentos/:id
 * @desc    Get reglamento by ID
 * @access  Private (all authenticated users - filtered in controller)
 */
router.get(
  '/:id',
  reglamentosDto.getReglamentoValidation,
  cache({ ttl: CacheTTL.VERY_LONG }),
  reglamentosController.getReglamentoById
);

/**
 * @route   POST /api/v1/reglamentos
 * @desc    Create a new reglamento
 * @access  Private (admin, condoAdmin)
 */
router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  reglamentosDto.createReglamentoValidation,
  invalidateCache(['*reglamentos*']),
  reglamentosController.createReglamento
);

/**
 * @route   PUT /api/v1/reglamentos/:id
 * @desc    Update reglamento
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  reglamentosDto.updateReglamentoValidation,
  invalidateCache(['*reglamentos*']),
  reglamentosController.updateReglamento
);

/**
 * @route   DELETE /api/v1/reglamentos/:id
 * @desc    Delete reglamento
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  reglamentosDto.getReglamentoValidation,
  invalidateCache(['*reglamentos*']),
  reglamentosController.deleteReglamento
);

export default router;
