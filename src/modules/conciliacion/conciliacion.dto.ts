import { body, param } from 'express-validator';

export const generarAutomaticaValidation = [
  body('condominioId').isUUID().withMessage('condominioId inválido'),
  body('nombre').trim().notEmpty().isLength({ max: 200 }).withMessage('nombre requerido'),
  body('periodoInicio').isISO8601().withMessage('periodoInicio debe ser fecha ISO válida'),
  body('periodoFin').isISO8601().withMessage('periodoFin debe ser fecha ISO válida'),
];

export const uploadValidation = [
  body('condominioId').isUUID().withMessage('condominioId inválido'),
  body('nombre').trim().notEmpty().isLength({ max: 200 }).withMessage('nombre requerido'),
  body('banco').trim().notEmpty().isLength({ max: 100 }).withMessage('banco requerido'),
  body('periodoInicio').isISO8601().withMessage('periodoInicio debe ser fecha ISO válida'),
  body('periodoFin').isISO8601().withMessage('periodoFin debe ser fecha ISO válida'),
  body('saldoInicial').optional().isNumeric().withMessage('saldoInicial debe ser numérico'),
  body('saldoFinal').optional().isNumeric().withMessage('saldoFinal debe ser numérico'),
  body('csvContent').notEmpty().withMessage('csvContent es requerido'),
];

export const confirmarValidation = [
  param('id').isUUID().withMessage('id de conciliación inválido'),
  body('matches').optional().isArray().withMessage('matches debe ser un arreglo'),
  body('matches.*.movimientoId').optional().isUUID().withMessage('movimientoId inválido'),
  body('matches.*.gastoId').optional().isUUID().withMessage('gastoId inválido'),
  body('ignorados').optional().isArray().withMessage('ignorados debe ser un arreglo'),
];
