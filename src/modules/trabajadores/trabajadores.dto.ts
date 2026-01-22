import { body, param } from 'express-validator';

export const createTrabajadorValidation = [
  body('condominioId').notEmpty().isUUID(),
  body('nombre').trim().notEmpty().isLength({ max: 100 }),
  body('apellido').trim().notEmpty().isLength({ max: 100 }),
  body('puesto').trim().notEmpty().isLength({ max: 100 }),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('salario').optional().isDecimal(),
  body('fechaContratacion').notEmpty().isISO8601(),
];

export const updateTrabajadorValidation = [
  param('id').isUUID(),
  body('puesto').optional().trim().isLength({ max: 100 }),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('salario').optional().isDecimal(),
  body('activo').optional().isBoolean(),
];

export const getTrabajadorValidation = [param('id').isUUID()];
