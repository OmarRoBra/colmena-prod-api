import { body, param } from 'express-validator';

export const createDocumentoValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ max: 255 })
    .withMessage('El nombre no debe exceder 255 caracteres'),

  body('url')
    .trim()
    .notEmpty()
    .withMessage('La URL del documento es requerida')
    .isLength({ max: 500 })
    .withMessage('La URL no debe exceder 500 caracteres'),

  body('categoria').optional().trim().isLength({ max: 100 }),
  body('tamano').optional().isInt({ min: 0 }).withMessage('El tamaño debe ser un número positivo'),
  body('tipoArchivo').optional().trim().isLength({ max: 100 }),
  body('subidoPor').optional().trim().isLength({ max: 200 }),
];

export const getDocumentoValidation = [
  param('id').isUUID().withMessage('ID de documento inválido'),
];

export const getDocumentosByCondominioValidation = [
  param('condominioId').isUUID().withMessage('ID de condominio inválido'),
];
