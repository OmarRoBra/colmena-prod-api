import { body, param } from 'express-validator';

/**
 * Validation rules for creating a unidad
 */
export const createUnidadValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('numero')
    .trim()
    .notEmpty()
    .withMessage('El número de unidad es requerido')
    .isLength({ max: 50 })
    .withMessage('El número de unidad no debe exceder 50 caracteres'),

  body('propietarioId')
    .optional()
    .isUUID()
    .withMessage('ID de propietario inválido'),

  body('tipo')
    .trim()
    .notEmpty()
    .withMessage('El tipo de unidad es requerido')
    .isIn(['departamento', 'casa', 'local'])
    .withMessage('El tipo debe ser departamento, casa o local'),

  body('metrosCuadrados')
    .optional()
    .isDecimal()
    .withMessage('Metros cuadrados debe ser un número decimal'),

  body('habitaciones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Habitaciones debe ser un número entero positivo'),

  body('banos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Baños debe ser un número entero positivo'),

  body('estacionamientos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estacionamientos debe ser un número entero positivo'),

  body('cuotaMantenimiento')
    .notEmpty()
    .withMessage('La cuota de mantenimiento es requerida')
    .isDecimal()
    .withMessage('La cuota de mantenimiento debe ser un número decimal'),

  body('estadoPago')
    .optional()
    .isIn(['al_corriente', 'atrasado', 'moroso'])
    .withMessage('Estado de pago debe ser al_corriente, atrasado o moroso'),
];

/**
 * Validation rules for updating a unidad
 */
export const updateUnidadValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de unidad inválido'),

  body('numero')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El número de unidad no debe exceder 50 caracteres'),

  body('propietarioId')
    .optional()
    .isUUID()
    .withMessage('ID de propietario inválido'),

  body('tipo')
    .optional()
    .isIn(['departamento', 'casa', 'local'])
    .withMessage('El tipo debe ser departamento, casa o local'),

  body('metrosCuadrados')
    .optional()
    .isDecimal()
    .withMessage('Metros cuadrados debe ser un número decimal'),

  body('habitaciones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Habitaciones debe ser un número entero positivo'),

  body('banos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Baños debe ser un número entero positivo'),

  body('estacionamientos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estacionamientos debe ser un número entero positivo'),

  body('cuotaMantenimiento')
    .optional()
    .isDecimal()
    .withMessage('La cuota de mantenimiento debe ser un número decimal'),

  body('estadoPago')
    .optional()
    .isIn(['al_corriente', 'atrasado', 'moroso'])
    .withMessage('Estado de pago debe ser al_corriente, atrasado o moroso'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser un valor booleano'),
];

/**
 * Validation rules for getting a unidad by ID
 */
export const getUnidadValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de unidad inválido'),
];

/**
 * Validation rules for getting unidades by condominio
 */
export const getUnidadesByCondominioValidation = [
  param('condominioId')
    .isUUID()
    .withMessage('ID de condominio inválido'),
];
