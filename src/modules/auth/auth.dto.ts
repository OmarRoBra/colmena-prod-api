import { body } from 'express-validator';

/**
 * Validation rules for user registration (profile creation)
 */
export const registerValidation = [
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

  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El tel\u00e9fono no debe exceder 20 caracteres'),

  body('rol')
    .optional()
    .isIn(['admin', 'condoAdmin', 'owner', 'tenant', 'worker', 'serviceProvider'])
    .withMessage('El rol debe ser admin, condoAdmin, owner, tenant, worker o serviceProvider'),
];
