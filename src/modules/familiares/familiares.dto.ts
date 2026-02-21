import { body, param } from 'express-validator';

export const getByResidenteValidation = [
  param('residenteId').isUUID().withMessage('residenteId debe ser un UUID válido'),
];

export const createFamiliarValidation = [
  body('residenteId').notEmpty().isUUID().withMessage('residenteId es requerido y debe ser UUID'),
  body('condominioId').notEmpty().isUUID().withMessage('condominioId es requerido y debe ser UUID'),
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido').isLength({ max: 200 }),
  body('relacion').trim().notEmpty().withMessage('La relación es requerida').isLength({ max: 100 }),
  body('telefono').optional().trim().isLength({ max: 20 }),
];

export const deleteFamiliarValidation = [
  param('id').isUUID().withMessage('id debe ser un UUID válido'),
];
