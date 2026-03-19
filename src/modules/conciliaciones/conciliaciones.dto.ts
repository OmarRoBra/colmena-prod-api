import { body, param } from 'express-validator';

export const createConciliacionValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ max: 200 })
    .withMessage('El nombre no debe exceder 200 caracteres'),

  body('archivoOriginal')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('El nombre de archivo no debe exceder 255 caracteres'),

  body('movimientos')
    .optional()
    .isArray()
    .withMessage('Los movimientos deben ser un arreglo'),

  body('movimientos.*.fecha')
    .optional()
    .isISO8601()
    .withMessage('La fecha debe ser una fecha válida'),

  body('movimientos.*.descripcion')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida'),

  body('movimientos.*.monto')
    .optional()
    .isDecimal()
    .withMessage('El monto debe ser un número decimal'),

  body('movimientos.*.tipo')
    .optional()
    .isIn(['ingreso', 'egreso'])
    .withMessage('El tipo debe ser ingreso o egreso'),
];

export const getConciliacionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de conciliación inválido'),
];

export const getConciliacionesByCondominioValidation = [
  param('condominioId')
    .isUUID()
    .withMessage('ID de condominio inválido'),
];

export const confirmMovimientoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de movimiento inválido'),

  body('pagoId')
    .optional()
    .isUUID()
    .withMessage('ID de pago inválido'),

  body('gastoId')
    .optional()
    .isUUID()
    .withMessage('ID de gasto inválido'),
];

export const bulkConfirmValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('Debe seleccionar al menos un movimiento'),

  body('ids.*')
    .isUUID()
    .withMessage('ID de movimiento inválido'),
];
