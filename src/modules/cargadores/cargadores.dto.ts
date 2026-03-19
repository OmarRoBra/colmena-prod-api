import { body, param } from 'express-validator';

export const createCargadorValidation = [
  body('condominioId')
    .notEmpty().withMessage('El ID del condominio es requerido')
    .isUUID().withMessage('ID de condominio inválido'),
  body('nombre')
    .trim().notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no debe exceder 100 caracteres'),
  body('potenciaKw')
    .notEmpty().withMessage('La potencia en kW es requerida')
    .isDecimal().withMessage('Potencia debe ser un número decimal'),
  body('precioPorKwh')
    .notEmpty().withMessage('El precio por kWh es requerido')
    .isDecimal().withMessage('Precio debe ser un número decimal'),
  body('tipoConector')
    .optional()
    .isIn(['Type2', 'CCS', 'CHAdeMO', 'Schuko']).withMessage('Tipo de conector inválido'),
  body('ubicacion').optional().trim().isLength({ max: 200 }),
  body('estado')
    .optional()
    .isIn(['disponible', 'en_uso', 'mantenimiento', 'fuera_servicio']),
];

export const updateCargadorValidation = [
  param('id').isUUID().withMessage('ID de cargador inválido'),
  body('nombre').optional().trim().isLength({ max: 100 }),
  body('potenciaKw').optional().isDecimal(),
  body('precioPorKwh').optional().isDecimal(),
  body('tipoConector').optional().isIn(['Type2', 'CCS', 'CHAdeMO', 'Schuko']),
  body('ubicacion').optional().trim().isLength({ max: 200 }),
  body('estado').optional().isIn(['disponible', 'en_uso', 'mantenimiento', 'fuera_servicio']),
  body('activo').optional().isBoolean(),
];

export const getCargadorValidation = [
  param('id').isUUID().withMessage('ID de cargador inválido'),
];

export const getCargadoresByCondominioValidation = [
  param('condominioId').isUUID().withMessage('ID de condominio inválido'),
];
