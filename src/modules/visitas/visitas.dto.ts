import { body, param } from 'express-validator';

export const getByCondominioValidation = [
  param('condominioId').isUUID().withMessage('condominioId debe ser un UUID válido'),
];

export const getByResidenteValidation = [
  param('residenteId').isUUID().withMessage('residenteId debe ser un UUID válido'),
];

export const createVisitaValidation = [
  body('condominioId').notEmpty().isUUID().withMessage('condominioId es requerido y debe ser UUID'),
  body('residenteId').notEmpty().isUUID().withMessage('residenteId es requerido y debe ser UUID'),
  body('nombreVisitante').trim().notEmpty().withMessage('El nombre del visitante es requerido').isLength({ max: 200 }),
  body('fechaEsperada').notEmpty().isISO8601().withMessage('fechaEsperada debe ser una fecha ISO8601 válida'),
  body('familiarId').optional().isUUID(),
  body('notas').optional().trim(),
];

export const scanQrValidation = [
  param('qrToken').notEmpty().withMessage('qrToken es requerido'),
];

export const getVisitaValidation = [
  param('id').isUUID().withMessage('id debe ser un UUID válido'),
];
