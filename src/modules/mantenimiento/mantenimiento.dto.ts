import { body, param } from 'express-validator';

export const createMantenimientoValidation = [
  body('condominioId').notEmpty().isUUID(),
  body('unidadId').optional().isUUID(),
  body('titulo').trim().notEmpty().isLength({ max: 200 }),
  body('descripcion').trim().notEmpty(),
  body('categoria').trim().notEmpty().isLength({ max: 100 }),
  body('prioridad').optional().isIn(['baja', 'media', 'alta', 'urgente']),
];

export const updateMantenimientoValidation = [
  param('id').isUUID(),
  body('titulo').optional().trim().isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('categoria').optional().trim().isLength({ max: 100 }),
  body('prioridad').optional().isIn(['baja', 'media', 'alta', 'urgente']),
  body('estado').optional().isIn(['pendiente', 'en_proceso', 'completado', 'cancelado']),
  body('asignadoA').optional().isString(),
  body('costo').optional().isDecimal(),
  body('notas').optional().isString(),
];

export const getMantenimientoValidation = [param('id').isUUID()];
