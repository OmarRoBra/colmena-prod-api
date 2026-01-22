import { body, param } from 'express-validator';

/**
 * Validation rules for creating a user
 */
export const createUsuarioValidation = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('apellido')
    .trim()
    .notEmpty()
    .withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El apellido debe tener entre 2 y 100 caracteres'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),

  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no debe exceder 20 caracteres'),

  body('rol')
    .optional()
    .isIn(['admin', 'condoAdmin', 'owner', 'tenant', 'worker', 'serviceProvider'])
    .withMessage('El rol debe ser admin, condoAdmin, owner, tenant, worker o serviceProvider'),
];

/**
 * Validation rules for updating a user
 */
export const updateUsuarioValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de usuario inválido'),

  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('apellido')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El apellido debe tener entre 2 y 100 caracteres'),

  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no debe exceder 20 caracteres'),

  body('rol')
    .optional()
    .isIn(['admin', 'condoAdmin', 'owner', 'tenant', 'worker', 'serviceProvider'])
    .withMessage('El rol debe ser admin, condoAdmin, owner, tenant, worker o serviceProvider'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser un valor booleano'),
];

/**
 * Validation rules for getting a user by ID
 */
export const getUsuarioValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de usuario inválido'),
];
