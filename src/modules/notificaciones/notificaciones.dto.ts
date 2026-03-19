import { body, param } from 'express-validator';

export const createNotificacionValidation = [
  body('usuarioId')
    .notEmpty().withMessage('El ID de usuario es requerido')
    .isUUID().withMessage('ID de usuario inválido'),
  body('titulo')
    .trim().notEmpty().withMessage('El título es requerido')
    .isLength({ max: 200 }).withMessage('Título no debe exceder 200 caracteres'),
  body('mensaje')
    .trim().notEmpty().withMessage('El mensaje es requerido'),
  body('tipo')
    .optional()
    .isIn(['info', 'pago', 'mantenimiento', 'reservacion', 'aviso']),
  body('condominioId').optional().isUUID(),
  body('accionUrl').optional().trim().isLength({ max: 300 }),
];

export const getNotificacionValidation = [
  param('id').isUUID().withMessage('ID de notificación inválido'),
];
