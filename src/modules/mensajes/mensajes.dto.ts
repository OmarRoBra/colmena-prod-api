import { body, param } from 'express-validator';

export const createMensajeValidation = [
  body('condominioId')
    .notEmpty().withMessage('El condominioId es requerido')
    .isUUID().withMessage('El condominioId debe ser un UUID válido'),
  body('de')
    .notEmpty().withMessage('El remitente es requerido')
    .isLength({ max: 200 }).withMessage('El remitente no puede exceder 200 caracteres'),
  body('para')
    .notEmpty().withMessage('El destinatario es requerido')
    .isLength({ max: 200 }).withMessage('El destinatario no puede exceder 200 caracteres'),
  body('asunto')
    .notEmpty().withMessage('El asunto es requerido')
    .isLength({ max: 300 }).withMessage('El asunto no puede exceder 300 caracteres'),
  body('contenido')
    .notEmpty().withMessage('El contenido es requerido'),
  body('prioridad')
    .optional()
    .isIn(['baja', 'normal', 'alta']).withMessage('La prioridad debe ser: baja, normal o alta'),
];

export const updateMensajeValidation = [
  param('id')
    .isUUID().withMessage('El id debe ser un UUID válido'),
  body('de')
    .optional()
    .isLength({ max: 200 }).withMessage('El remitente no puede exceder 200 caracteres'),
  body('para')
    .optional()
    .isLength({ max: 200 }).withMessage('El destinatario no puede exceder 200 caracteres'),
  body('asunto')
    .optional()
    .isLength({ max: 300 }).withMessage('El asunto no puede exceder 300 caracteres'),
  body('contenido')
    .optional(),
  body('estado')
    .optional()
    .isIn(['enviado', 'leido', 'borrador']).withMessage('El estado debe ser: enviado, leido o borrador'),
  body('prioridad')
    .optional()
    .isIn(['baja', 'normal', 'alta']).withMessage('La prioridad debe ser: baja, normal o alta'),
];

export const getMensajeValidation = [
  param('id')
    .isUUID().withMessage('El id debe ser un UUID válido'),
];

export const getMensajesByCondominioValidation = [
  param('condominioId')
    .isUUID().withMessage('El condominioId debe ser un UUID válido'),
];
