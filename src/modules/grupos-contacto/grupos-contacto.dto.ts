import { body, param } from 'express-validator';

export const getGruposByCondominioValidation = [
  param('condominioId')
    .isUUID().withMessage('El condominioId debe ser un UUID válido'),
];

export const grupoIdValidation = [
  param('id')
    .isUUID().withMessage('El id debe ser un UUID válido'),
];

export const createGrupoValidation = [
  body('condominioId')
    .notEmpty().withMessage('El condominioId es requerido')
    .isUUID().withMessage('El condominioId debe ser un UUID válido'),
  body('nombre')
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 200 }).withMessage('El nombre no puede exceder 200 caracteres'),
  body('descripcion')
    .notEmpty().withMessage('La descripción es requerida'),
  body('miembros')
    .isInt({ min: 0 }).withMessage('Miembros debe ser un número entero mayor o igual a 0'),
];

export const updateGrupoValidation = [
  ...grupoIdValidation,
  body('nombre')
    .optional()
    .isLength({ max: 200 }).withMessage('El nombre no puede exceder 200 caracteres'),
  body('descripcion')
    .optional()
    .isString().withMessage('La descripción debe ser texto'),
  body('miembros')
    .optional()
    .isInt({ min: 0 }).withMessage('Miembros debe ser un número entero mayor o igual a 0'),
];
