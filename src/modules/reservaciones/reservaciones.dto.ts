import { body, param } from 'express-validator';

/**
 * Validation rules for creating a reservacion
 */
export const createReservacionValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('unidadId')
    .notEmpty()
    .withMessage('El ID de la unidad es requerido')
    .isUUID()
    .withMessage('ID de unidad inválido'),

  body('area')
    .trim()
    .notEmpty()
    .withMessage('El área es requerida')
    .isLength({ max: 100 })
    .withMessage('El área no debe exceder 100 caracteres'),

  body('fechaInicio')
    .notEmpty()
    .withMessage('La fecha de inicio es requerida')
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),

  body('fechaFin')
    .notEmpty()
    .withMessage('La fecha de fin es requerida')
    .isISO8601()
    .withMessage('Fecha de fin inválida'),

  body('costo')
    .optional()
    .isDecimal()
    .withMessage('El costo debe ser un número decimal'),

  body('notas')
    .optional()
    .trim(),
];

/**
 * Validation rules for updating a reservacion
 */
export const updateReservacionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de reservación inválido'),

  body('estado')
    .optional()
    .isIn(['pendiente', 'confirmado', 'cancelado'])
    .withMessage('El estado debe ser pendiente, confirmado o cancelado'),

  body('notas')
    .optional()
    .trim(),
];

/**
 * Validation rules for getting a reservacion by ID
 */
export const getReservacionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de reservación inválido'),
];
