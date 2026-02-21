import { body, param } from 'express-validator';

export const createGastoValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('concepto')
    .trim()
    .notEmpty()
    .withMessage('El concepto es requerido')
    .isLength({ max: 200 })
    .withMessage('El concepto no debe exceder 200 caracteres'),

  body('monto')
    .notEmpty()
    .withMessage('El monto es requerido')
    .isDecimal()
    .withMessage('El monto debe ser un número decimal'),

  body('categoria')
    .trim()
    .notEmpty()
    .withMessage('La categoría es requerida')
    .isIn(['mantenimiento', 'servicios', 'nomina', 'seguros', 'impuestos', 'otro'])
    .withMessage('Categoría inválida'),

  body('fechaGasto')
    .notEmpty()
    .withMessage('La fecha del gasto es requerida')
    .isISO8601()
    .withMessage('Fecha inválida'),

  body('descripcion').optional().trim(),
  body('comprobante').optional().trim().isLength({ max: 500 }),
  body('notas').optional().trim(),
];

export const updateGastoValidation = [
  param('id').isUUID().withMessage('ID de gasto inválido'),

  body('concepto').optional().trim().isLength({ max: 200 }),
  body('monto').optional().isDecimal(),
  body('categoria')
    .optional()
    .isIn(['mantenimiento', 'servicios', 'nomina', 'seguros', 'impuestos', 'otro']),
  body('fechaGasto').optional().isISO8601(),
  body('descripcion').optional().trim(),
  body('comprobante').optional().trim().isLength({ max: 500 }),
  body('notas').optional().trim(),
];

export const getGastoValidation = [
  param('id').isUUID().withMessage('ID de gasto inválido'),
];

export const getGastosByCondominioValidation = [
  param('condominioId').isUUID().withMessage('ID de condominio inválido'),
];
