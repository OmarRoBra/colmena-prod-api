import { body, param } from 'express-validator';

// GET /api/v1/comites/:id validation
export const getComiteValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido'),
];

// POST /api/v1/comites validation
export const createComiteValidation = [
  body('condominioId').isUUID().withMessage('condominioId debe ser UUID válido'),
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido').isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('tipo').isIn(['administracion', 'vigilancia', 'mantenimiento', 'social', 'otro']).withMessage('Tipo inválido'),
  body('fechaFormacion').isISO8601().withMessage('fechaFormacion debe ser fecha válida'),
];

// PUT /api/v1/comites/:id validation
export const updateComiteValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido'),
  body('nombre').optional().trim().notEmpty().isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('tipo').optional().isIn(['administracion', 'vigilancia', 'mantenimiento', 'social', 'otro']),
  body('fechaFormacion').optional().isISO8601(),
  body('estado').optional().isIn(['activo', 'inactivo', 'disuelto']),
];

// POST /api/v1/comites/:id/miembros validation
export const addMiembroValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido'),
  body('residenteId').isUUID().withMessage('residenteId debe ser UUID válido'),
  body('role').isIn(['presidente', 'secretario', 'tesorero', 'vocal']).withMessage('Role inválido'),
  body('fechaIngreso').isISO8601().withMessage('fechaIngreso debe ser fecha válida'),
];

// PUT /api/v1/comites/:id/miembros/:miembroId validation
export const updateMiembroValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido'),
  param('miembroId').isUUID().withMessage('miembroId debe ser UUID válido'),
  body('role').isIn(['presidente', 'secretario', 'tesorero', 'vocal']).withMessage('Role inválido'),
];

// DELETE /api/v1/comites/:id/miembros/:miembroId validation
export const removeMiembroValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido'),
  param('miembroId').isUUID().withMessage('miembroId debe ser UUID válido'),
];
