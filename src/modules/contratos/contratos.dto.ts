import { body, param } from 'express-validator';

export const createContratoValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('tipo')
    .trim()
    .notEmpty()
    .withMessage('El tipo de contrato es requerido')
    .isLength({ max: 100 })
    .withMessage('El tipo no debe exceder 100 caracteres'),

  body('partes')
    .trim()
    .notEmpty()
    .withMessage('Las partes del contrato son requeridas')
    .isLength({ max: 500 })
    .withMessage('Las partes no deben exceder 500 caracteres'),

  body('monto')
    .notEmpty()
    .withMessage('El monto es requerido')
    .isDecimal()
    .withMessage('El monto debe ser un número decimal'),

  body('fechaInicio')
    .notEmpty()
    .withMessage('La fecha de inicio es requerida')
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),

  body('fechaFin')
    .notEmpty()
    .withMessage('La fecha de fin es requerida')
    .isISO8601()
    .withMessage('Fecha de fin inválida'),

  body('estado')
    .optional()
    .isIn(['activo', 'inactivo', 'vencido'])
    .withMessage('Estado inválido'),

  body('documento').optional().trim().isLength({ max: 500 }),
  body('notas').optional().trim(),
];

export const updateContratoValidation = [
  param('id').isUUID().withMessage('ID de contrato inválido'),

  body('tipo').optional().trim().isLength({ max: 100 }),
  body('partes').optional().trim().isLength({ max: 500 }),
  body('monto').optional().isDecimal(),
  body('fechaInicio').optional().isISO8601(),
  body('fechaFin').optional().isISO8601(),
  body('estado').optional().isIn(['activo', 'inactivo', 'vencido']),
  body('documento').optional().trim().isLength({ max: 500 }),
  body('notas').optional().trim(),
];

export const getContratoValidation = [
  param('id').isUUID().withMessage('ID de contrato inválido'),
];

export const getContratosByCondominioValidation = [
  param('condominioId').isUUID().withMessage('ID de condominio inválido'),
];
