import { Router } from 'express';
import * as usuariosController from './usuarios.controller';
import * as usuariosDto from './usuarios.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/usuarios
 * @desc    Get all users
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.MEDIUM }),
  usuariosController.getAllUsuarios
);

/**
 * @route   GET /api/v1/usuarios/:id
 * @desc    Get user by ID
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/:id',
  authorize('admin', 'condoAdmin'),
  usuariosDto.getUsuarioValidation,
  cache({ ttl: CacheTTL.MEDIUM }),
  usuariosController.getUsuarioById
);

/**
 * @route   POST /api/v1/usuarios
 * @desc    Create a new user
 * @access  Private (admin)
 */
router.post(
  '/',
  authorize('admin'),
  usuariosDto.createUsuarioValidation,
  invalidateCache(['*usuarios*']),
  usuariosController.createUsuario
);

/**
 * @route   PUT /api/v1/usuarios/:id
 * @desc    Update user
 * @access  Private (admin)
 */
router.put(
  '/:id',
  authorize('admin'),
  usuariosDto.updateUsuarioValidation,
  invalidateCache(['*usuarios*']),
  usuariosController.updateUsuario
);

/**
 * @route   DELETE /api/v1/usuarios/:id
 * @desc    Delete user (soft delete)
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  usuariosDto.getUsuarioValidation,
  invalidateCache(['*usuarios*']),
  usuariosController.deleteUsuario
);

export default router;
