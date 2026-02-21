import { body, param } from 'express-validator';

export const createReglamentoValidation = [
  body('condominioId').notEmpty().isUUID(),
  body('titulo').trim().notEmpty().isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('contenido').optional().trim(),
  body('categoria').optional().trim().isLength({ max: 100 }),
  body('version').optional().trim().isLength({ max: 20 }),
  body('vigenciaDesde').notEmpty().isISO8601(),
  body('estado').optional().isIn(['active', 'archived', 'draft', 'pending_approval']),
  body('documento').optional().trim().isLength({ max: 500 }),
  body('pages').optional().isInt({ min: 0 }),
  body('fileSize').optional().trim().isLength({ max: 50 }),
  body('approvedBy').optional().trim().isLength({ max: 200 }),
];

export const updateReglamentoValidation = [
  param('id').isUUID(),
  body('titulo').optional().trim().notEmpty().isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('contenido').optional().trim(),
  body('categoria').optional().trim().isLength({ max: 100 }),
  body('version').optional().trim().isLength({ max: 20 }),
  body('vigenciaDesde').optional().isISO8601(),
  body('estado').optional().isIn(['active', 'archived', 'draft', 'pending_approval']),
  body('documento').optional().trim().isLength({ max: 500 }),
  body('pages').optional().isInt({ min: 0 }),
  body('fileSize').optional().trim().isLength({ max: 50 }),
  body('approvedBy').optional().trim().isLength({ max: 200 }),
  body('activo').optional().isBoolean(), // Deprecated but kept for backward compatibility
];

export const getReglamentoValidation = [param('id').isUUID()];

export const getReglamentosByCondominioValidation = [param('condominioId').isUUID()];
