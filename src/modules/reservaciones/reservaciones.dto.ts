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
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('ID de unidad inválido'),

  body('areaComunId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('ID de área común inválido'),

  body('area')
    .optional()
    .trim()
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

  body('numPersonas')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El número de personas debe ser al menos 1'),

  body('motivo')
    .optional({ values: 'null' })
    .trim(),

  body('notas')
    .optional({ values: 'null' })
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

  body('areaComunId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('ID de área común inválido'),

  body('area')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El área no debe exceder 100 caracteres'),

  body('fechaInicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),

  body('fechaFin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),

  body('costo')
    .optional()
    .isDecimal()
    .withMessage('El costo debe ser un número decimal'),

  body('numPersonas')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El número de personas debe ser al menos 1'),

  body('motivo')
    .optional({ values: 'null' })
    .trim(),

  body('notas')
    .optional({ values: 'null' })
    .trim(),

  body('pagado')
    .optional()
    .isBoolean()
    .withMessage('El campo pagado debe ser verdadero o falso'),
];

/**
 * Validation rules for getting a reservacion by ID
 */
export const getReservacionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de reservación inválido'),
];

/**
 * Validation rules for approving a reservacion
 */
export const aprobarReservacionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de reservación inválido'),
];

/**
 * Validation rules for rejecting a reservacion
 */
export const rechazarReservacionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de reservación inválido'),

  body('motivoRechazo')
    .notEmpty()
    .withMessage('El motivo de rechazo es requerido')
    .trim(),
];
