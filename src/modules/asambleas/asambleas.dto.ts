import { body, param } from 'express-validator';

export const createAsambleaValidation = [
  body('condominioId').notEmpty().isUUID().withMessage('ID de condominio inválido'),
  body('titulo').trim().notEmpty().isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('fecha').notEmpty().isISO8601().withMessage('Fecha inválida'),
  body('ubicacion').optional().trim().isLength({ max: 200 }),
  body('tipo').notEmpty().isIn(['ordinaria', 'extraordinaria']),
  body('scope').optional().isIn(['general', 'committee']),
  body('comiteId').optional({ nullable: true }).isUUID().withMessage('ID de comité inválido'),
];

export const updateAsambleaValidation = [
  param('id').isUUID(),
  body('titulo').optional().trim().isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
  body('ubicacion').optional().trim().isLength({ max: 200 }),
  body('tipo').optional().isIn(['ordinaria', 'extraordinaria']),
  body('scope').optional().isIn(['general', 'committee']),
  body('comiteId').optional({ nullable: true }).isUUID().withMessage('ID de comité inválido'),
  body('estado').optional().isIn(['programada', 'en_curso', 'finalizada', 'cancelada']),
  body('acuerdos').optional().trim(),
];

export const getAsambleaValidation = [
  param('id').isUUID().withMessage('ID de asamblea inválido'),
];
