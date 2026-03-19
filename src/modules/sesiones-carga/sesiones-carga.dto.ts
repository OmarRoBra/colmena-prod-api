import { body, param } from 'express-validator';

export const createSesionValidation = [
  body('condominioId')
    .notEmpty().withMessage('El ID del condominio es requerido')
    .isUUID().withMessage('ID de condominio inválido'),
  body('cargadorId')
    .notEmpty().withMessage('El ID del cargador es requerido')
    .isUUID().withMessage('ID de cargador inválido'),
  body('modoCarga')
    .notEmpty().withMessage('El modo de carga es requerido')
    .isIn(['kwh', 'porcentaje', 'tiempo']).withMessage('Modo de carga inválido'),
  body('cantidadSolicitada')
    .notEmpty().withMessage('La cantidad solicitada es requerida')
    .isDecimal().withMessage('Cantidad debe ser un número decimal'),
  body('residenteId').optional().isUUID(),
  body('unidadId').optional().isUUID(),
];

export const updateSesionValidation = [
  param('id').isUUID().withMessage('ID de sesión inválido'),
  body('estado').optional().isIn(['activa', 'completada', 'cancelada', 'fallida']),
  body('energiaEntregada').optional().isDecimal(),
  body('costoFinal').optional().isDecimal(),
  body('finDt').optional().isISO8601(),
];

export const getSesionValidation = [
  param('id').isUUID().withMessage('ID de sesión inválido'),
];

export const getSesionesByCondominioValidation = [
  param('condominioId').isUUID().withMessage('ID de condominio inválido'),
];

export const getSesionesByResidenteValidation = [
  param('residenteId').isUUID().withMessage('ID de residente inválido'),
];
