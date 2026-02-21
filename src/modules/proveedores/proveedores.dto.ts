import { body, param } from 'express-validator';

export const createProveedorValidation = [
  body('condominioId').notEmpty().isUUID(),
  body('nombreEmpresa').trim().notEmpty().isLength({ max: 200 }),
  body('nombreContacto').trim().notEmpty().isLength({ max: 200 }),
  body('tipoServicio').trim().notEmpty().isLength({ max: 100 }),
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('telefono').trim().notEmpty().isLength({ max: 20 }),
  body('estado').optional().trim().isIn(['active', 'inactive', 'suspended']),
  body('direccion').optional().trim().isLength({ max: 500 }),
  body('rfc').optional().trim().isLength({ max: 50 }),
  body('calificacion').optional().isInt({ min: 1, max: 5 }),
  body('inicioContrato').optional().isISO8601(),
  body('finContrato').optional().isISO8601(),
];

export const updateProveedorValidation = [
  param('id').isUUID(),
  body('nombreEmpresa').optional().trim().isLength({ max: 200 }),
  body('nombreContacto').optional().trim().isLength({ max: 200 }),
  body('tipoServicio').optional().trim().isLength({ max: 100 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('estado').optional().trim().isIn(['active', 'inactive', 'suspended']),
  body('direccion').optional().trim().isLength({ max: 500 }),
  body('rfc').optional().trim().isLength({ max: 50 }),
  body('calificacion').optional().isInt({ min: 1, max: 5 }),
  body('inicioContrato').optional().isISO8601(),
  body('finContrato').optional().isISO8601(),
];

export const getProveedorValidation = [param('id').isUUID()];
