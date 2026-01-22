import { body, param } from 'express-validator';

/**
 * Validation rules for creating a pago
 */
export const createPagoValidation = [
  body('unidadId')
    .notEmpty()
    .withMessage('El ID de la unidad es requerido')
    .isUUID()
    .withMessage('ID de unidad inválido'),

  body('monto')
    .notEmpty()
    .withMessage('El monto es requerido')
    .isDecimal()
    .withMessage('El monto debe ser un número decimal'),

  body('concepto')
    .trim()
    .notEmpty()
    .withMessage('El concepto es requerido')
    .isLength({ max: 200 })
    .withMessage('El concepto no debe exceder 200 caracteres'),

  body('metodoPago')
    .trim()
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['efectivo', 'transferencia', 'tarjeta'])
    .withMessage('El método de pago debe ser efectivo, transferencia o tarjeta'),

  body('referencia')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La referencia no debe exceder 100 caracteres'),

  body('comprobante')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('El comprobante no debe exceder 500 caracteres'),

  body('notas')
    .optional()
    .trim(),
];

/**
 * Validation rules for updating a pago
 */
export const updatePagoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de pago inválido'),

  body('estado')
    .optional()
    .isIn(['pendiente', 'completado', 'rechazado'])
    .withMessage('El estado debe ser pendiente, completado o rechazado'),

  body('referencia')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La referencia no debe exceder 100 caracteres'),

  body('comprobante')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('El comprobante no debe exceder 500 caracteres'),

  body('notas')
    .optional()
    .trim(),
];

/**
 * Validation rules for getting a pago by ID
 */
export const getPagoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de pago inválido'),
];

/**
 * Validation rules for getting pagos by unidad
 */
export const getPagosByUnidadValidation = [
  param('unidadId')
    .isUUID()
    .withMessage('ID de unidad inválido'),
];
