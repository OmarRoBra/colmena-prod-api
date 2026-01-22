import { body, param } from 'express-validator';

export const createReglamentoValidation = [
  body('condominioId').notEmpty().isUUID(),
  body('titulo').trim().notEmpty().isLength({ max: 200 }),
  body('contenido').trim().notEmpty(),
  body('categoria').optional().trim().isLength({ max: 100 }),
  body('vigenciaDesde').notEmpty().isISO8601(),
];

export const updateReglamentoValidation = [
  param('id').isUUID(),
  body('activo').optional().isBoolean(),
];

export const getReglamentoValidation = [param('id').isUUID()];
