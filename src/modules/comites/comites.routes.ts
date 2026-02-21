import { Router } from 'express';
import * as comitesController from './comites.controller';
import * as comitesDto from './comites.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/comites/condominio/:condominioId
 * @desc    Get all comites for a condominium
 * @access  Private (authenticated users)
 */
router.get('/condominio/:condominioId', comitesController.getComitesByCondominio);

/**
 * @route   GET /api/v1/comites/:id
 * @desc    Get comite by ID with members
 * @access  Private (authenticated users)
 */
router.get('/:id', comitesDto.getComiteValidation, comitesController.getComiteById);

/**
 * @route   POST /api/v1/comites
 * @desc    Create a new comite
 * @access  Private (admin, condoAdmin)
 */
router.post('/', authorize('admin', 'condoAdmin'), comitesDto.createComiteValidation, comitesController.createComite);

/**
 * @route   PUT /api/v1/comites/:id
 * @desc    Update comite
 * @access  Private (admin, condoAdmin)
 */
router.put('/:id', authorize('admin', 'condoAdmin'), comitesDto.updateComiteValidation, comitesController.updateComite);

/**
 * @route   DELETE /api/v1/comites/:id
 * @desc    Delete comite
 * @access  Private (admin)
 */
router.delete('/:id', authorize('admin'), comitesDto.getComiteValidation, comitesController.deleteComite);

/**
 * @route   POST /api/v1/comites/:id/miembros
 * @desc    Add member to comite
 * @access  Private (admin, condoAdmin)
 */
router.post('/:id/miembros', authorize('admin', 'condoAdmin'), comitesDto.addMiembroValidation, comitesController.addMiembro);

/**
 * @route   PUT /api/v1/comites/:id/miembros/:miembroId
 * @desc    Update member role
 * @access  Private (admin, condoAdmin)
 */
router.put('/:id/miembros/:miembroId', authorize('admin', 'condoAdmin'), comitesDto.updateMiembroValidation, comitesController.updateMiembroRole);

/**
 * @route   DELETE /api/v1/comites/:id/miembros/:miembroId
 * @desc    Remove member from comite
 * @access  Private (admin, condoAdmin)
 */
router.delete('/:id/miembros/:miembroId', authorize('admin', 'condoAdmin'), comitesDto.removeMiembroValidation, comitesController.removeMiembro);

export default router;
