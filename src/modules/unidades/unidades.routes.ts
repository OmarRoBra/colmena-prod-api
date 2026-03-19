import { Router } from 'express';
import * as unidadesController from './unidades.controller';
import * as unidadesDto from './unidades.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/unidades
 * @desc    Get all unidades
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.MEDIUM }),
  unidadesController.getAllUnidades
);

/**
 * @route   GET /api/v1/unidades/condominio/:condominiumId
 * @desc    Get unidades by condominio ID
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/condominio/:condominiumId',
  authorize('admin', 'condoAdmin'),
  unidadesDto.getUnidadesByCondominioValidation,
  cache({ ttl: CacheTTL.MEDIUM }),
  unidadesController.getUnidadesByCondominio
);

/**
 * @route   GET /api/v1/unidades/:id
 * @desc    Get unidad by ID
 * @access  Private (admin, condoAdmin, owner, tenant)
 */
router.get(
  '/:id',
  authorize('admin', 'condoAdmin', 'owner', 'tenant', 'resident'),
  unidadesDto.getUnidadValidation,
  cache({ ttl: CacheTTL.MEDIUM }),
  unidadesController.getUnidadById
);

/**
 * @route   POST /api/v1/unidades
 * @desc    Create a new unidad
 * @access  Private (admin, condoAdmin)
 */
router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  unidadesDto.createUnidadValidation,
  invalidateCache(['*unidades*', '*condominios*']),
  unidadesController.createUnidad
);

/**
 * @route   PUT /api/v1/unidades/:id
 * @desc    Update unidad
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  unidadesDto.updateUnidadValidation,
  invalidateCache(['*unidades*', '*condominios*']),
  unidadesController.updateUnidad
);

/**
 * @route   POST /api/v1/unidades/:id/add-credit
 * @desc    Add credit (saldo a favor) to a unit for advance payments
 * @access  Private (admin, condoAdmin)
 */
router.post(
  '/:id/add-credit',
  authorize('admin', 'condoAdmin'),
  unidadesDto.addCreditValidation,
  invalidateCache(['*unidades*']),
  unidadesController.addCredit
);

/**
 * @route   DELETE /api/v1/unidades/:id
 * @desc    Delete unidad (soft delete)
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  unidadesDto.getUnidadValidation,
  invalidateCache(['*unidades*', '*condominios*']),
  unidadesController.deleteUnidad
);

export default router;
