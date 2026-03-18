import { body, param } from 'express-validator';

const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;

// Campos fiscales compartidos
const fiscalFields = [
  body('razonSocial')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('razonSocial máximo 300 caracteres — debe coincidir con el SAT'),
  body('rfc')
    .optional()
    .trim()
    .matches(RFC_REGEX)
    .withMessage('RFC inválido (formato: AAAA######AAA)'),
  body('regimenFiscal')
    .optional()
    .isString()
    .isLength({ max: 10 })
    .withMessage('regimenFiscal: código SAT, ej: 612, 626'),
  body('usoCfdi')
    .optional()
    .isIn(['G01', 'G02', 'G03', 'I01', 'I02', 'I04', 'I08', 'CP01', 'S01'])
    .withMessage('usoCfdi inválido'),
  body('codigoPostalFiscal')
    .optional()
    .isLength({ min: 4, max: 10 })
    .withMessage('codigoPostalFiscal requerido para CFDI 4.0'),
];

export const createProveedorValidation = [
  body('condominioId').notEmpty().isUUID(),
  body('nombreEmpresa').trim().notEmpty().isLength({ max: 200 }),
  body('nombreContacto').trim().notEmpty().isLength({ max: 200 }),
  body('tipoServicio').trim().notEmpty().isLength({ max: 100 }),
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('telefono').trim().notEmpty().isLength({ max: 20 }),
  body('estado').optional().trim().isIn(['active', 'inactive', 'suspended']),
  body('direccion').optional().trim().isLength({ max: 500 }),
  body('calificacion').optional().isInt({ min: 1, max: 5 }),
  body('inicioContrato').optional().isISO8601(),
  body('finContrato').optional().isISO8601(),
  body('documento').optional({ nullable: true }).trim().isLength({ max: 500 })
    .withMessage('documento no debe exceder 500 caracteres'),
  ...fiscalFields,
];

export const updateProveedorValidation = [
  param('id').isUUID(),
  body('nombreEmpresa').optional().trim().isLength({ max: 200 }),
  body('nombreContacto').optional().trim().isLength({ max: 200 }),
  body('tipoServicio').optional().trim().isLength({ max: 100 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('estado').optional().trim().isIn(['active', 'inactive', 'suspended']),
  body('direccion').optional().trim().isLength({ max: 500 }),
  body('calificacion').optional().isInt({ min: 1, max: 5 }),
  body('inicioContrato').optional().isISO8601(),
  body('finContrato').optional().isISO8601(),
  body('documento').optional({ nullable: true }).trim().isLength({ max: 500 })
    .withMessage('documento no debe exceder 500 caracteres'),
  ...fiscalFields,
];

export const getProveedorValidation = [param('id').isUUID()];
