import { body, param } from 'express-validator';

export const getAreaComunValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido'),
];

export const createAreaComunValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('condominioId debe ser UUID válido'),
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('tipo')
    .isIn(['salon', 'terraza', 'gym', 'alberca', 'jardin', 'asador', 'ludoteca', 'otro'])
    .withMessage('Tipo inválido'),
  body('capacidad')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Capacidad debe ser un número positivo'),
  body('costo')
    .optional()
    .isDecimal()
    .withMessage('El costo debe ser un número decimal'),
  body('requiereAprobacion')
    .optional()
    .isBoolean()
    .withMessage('requiereAprobacion debe ser booleano'),
  body('horaApertura')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('horaApertura debe tener formato HH:MM'),
  body('horaCierre')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('horaCierre debe tener formato HH:MM'),
];

export const updateAreaComunValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido'),
  body('nombre').optional().trim().notEmpty().isLength({ max: 200 }),
  body('descripcion').optional().trim(),
  body('tipo')
    .optional()
    .isIn(['salon', 'terraza', 'gym', 'alberca', 'jardin', 'asador', 'ludoteca', 'otro']),
  body('capacidad').optional().isInt({ min: 0 }),
  body('costo').optional().isDecimal(),
  body('requiereAprobacion').optional().isBoolean(),
  body('horaApertura').optional().matches(/^\d{2}:\d{2}$/),
  body('horaCierre').optional().matches(/^\d{2}:\d{2}$/),
  body('activo').optional().isBoolean(),
];
