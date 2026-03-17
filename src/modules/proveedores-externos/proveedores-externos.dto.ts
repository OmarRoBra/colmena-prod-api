import { body, param, query } from 'express-validator';

const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;

export const createProveedorExternoValidation = [
  body('condominioId').notEmpty().isString(),
  body('nombre').trim().notEmpty().isLength({ max: 200 }),
  body('razonSocial')
    .trim()
    .notEmpty()
    .isLength({ max: 300 })
    .withMessage('razonSocial requerida — debe coincidir exactamente con el SAT'),
  body('rfc')
    .trim()
    .notEmpty()
    .matches(RFC_REGEX)
    .withMessage('RFC inválido (formato: AAAA######AAA)'),
  body('email').trim().notEmpty().isEmail(),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('regimenFiscal')
    .notEmpty()
    .isString()
    .isLength({ min: 3, max: 10 })
    .withMessage('regimenFiscal requerido (código SAT, ej: 612, 626)'),
  body('usoCfdi')
    .optional()
    .isIn(['G01', 'G02', 'G03', 'I01', 'I02', 'I04', 'I08', 'CP01', 'S01'])
    .withMessage('usoCfdi inválido'),
  body('codigoPostalFiscal')
    .notEmpty()
    .isLength({ min: 4, max: 10 })
    .withMessage('codigoPostalFiscal requerido para CFDI 4.0'),
  body('notas').optional().isString().isLength({ max: 500 }),
];

export const updateProveedorExternoValidation = [
  param('id').isUUID(),
  query('condominioId').notEmpty().isString().withMessage('condominioId requerido'),
  body('nombre').optional().trim().isLength({ max: 200 }),
  body('razonSocial').optional().trim().isLength({ max: 300 }),
  body('rfc').optional().trim().matches(RFC_REGEX).withMessage('RFC inválido'),
  body('email').optional().trim().isEmail(),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('regimenFiscal').optional().isString().isLength({ max: 10 }),
  body('usoCfdi').optional().isIn(['G01', 'G02', 'G03', 'I01', 'I02', 'I04', 'I08', 'CP01', 'S01']),
  body('codigoPostalFiscal').optional().isLength({ min: 4, max: 10 }),
  body('activo').optional().isBoolean(),
  body('notas').optional().isString().isLength({ max: 500 }),
];

export const getProveedorExternoValidation = [
  param('id').isUUID(),
  query('condominioId').notEmpty().isString().withMessage('condominioId requerido'),
];

export const listProveedoresExternosValidation = [
  query('condominioId').notEmpty().isString(),
  query('activo').optional().isBoolean(),
];
