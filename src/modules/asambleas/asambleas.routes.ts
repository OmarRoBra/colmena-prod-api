import { Router } from 'express';
import * as asambleasController from './asambleas.controller';
import * as asambleasDto from './asambleas.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/asambleas
 * @desc    Get all asambleas
 * @access  Private (admin, condoAdmin)
 */
router.get('/', authorize('admin', 'condoAdmin'), asambleasController.getAllAsambleas);

/**
 * @route   GET /api/v1/asambleas/condominio/:condominioId
 * @desc    Get asambleas by condominium
 * @access  Private (all authenticated users)
 */
router.get('/condominio/:condominioId', asambleasController.getAsambleasByCondominio);

/**
 * @route   GET /api/v1/asambleas/:id
 * @desc    Get asamblea by ID
 * @access  Private (all authenticated users - filtered in controller)
 */
router.get('/:id', asambleasDto.getAsambleaValidation, asambleasController.getAsambleaById);

/**
 * @route   POST /api/v1/asambleas
 * @desc    Create a new asamblea
 * @access  Private (admin, condoAdmin)
 */
router.post('/', authorize('admin', 'condoAdmin'), asambleasDto.createAsambleaValidation, asambleasController.createAsamblea);

/**
 * @route   PUT /api/v1/asambleas/:id
 * @desc    Update asamblea
 * @access  Private (admin, condoAdmin)
 */
router.put('/:id', authorize('admin', 'condoAdmin'), asambleasDto.updateAsambleaValidation, asambleasController.updateAsamblea);

/**
 * @route   DELETE /api/v1/asambleas/:id
 * @desc    Delete asamblea
 * @access  Private (admin)
 */
router.delete('/:id', authorize('admin'), asambleasDto.getAsambleaValidation, asambleasController.deleteAsamblea);

export default router;
