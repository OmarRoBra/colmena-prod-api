import { body, param } from 'express-validator';

/**
 * Validation rules for creating a condominio
 */
export const createCondominioValidation = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre debe tener entre 2 y 200 caracteres'),

  body('direccion')
    .trim()
    .notEmpty()
    .withMessage('La dirección es requerida'),

  body('ciudad')
    .trim()
    .notEmpty()
    .withMessage('La ciudad es requerida')
    .isLength({ max: 100 })
    .withMessage('La ciudad no debe exceder 100 caracteres'),

  body('estado')
    .trim()
    .notEmpty()
    .withMessage('El estado es requerido')
    .isLength({ max: 100 })
    .withMessage('El estado no debe exceder 100 caracteres'),

  body('codigoPostal')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El código postal no debe exceder 10 caracteres'),

  body('telefono')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no debe exceder 20 caracteres'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),

  body('totalUnidades')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Total de unidades debe ser un número entero positivo'),

  body('gerenteId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID de gerente inválido'),

  body('thumbnail')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('El thumbnail debe ser una URL válida')
    .isLength({ max: 500 })
    .withMessage('El thumbnail no debe exceder 500 caracteres'),

  body('statusCondominio')
    .optional({ checkFalsy: true })
    .isIn(['activo', 'inactivo', 'archivado'])
    .withMessage('El status del condominio debe ser activo, inactivo o archivado'),

  // Datos fiscales para facturación CFDI (opcionales al crear)
  body('rfc')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 13 })
    .withMessage('RFC no debe exceder 13 caracteres'),

  body('razonSocial')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Razón social no debe exceder 300 caracteres'),

  body('regimenFiscal')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 10 })
    .withMessage('Régimen fiscal inválido'),

  body('codigoPostalFiscal')
    .optional({ checkFalsy: true })
    .isLength({ min: 4, max: 10 })
    .withMessage('Código postal fiscal inválido'),
];

/**
 * Validation rules for updating a condominio
 */
export const updateCondominioValidation = [
  param('id')
    .notEmpty()
    .isString()
    .withMessage('ID de condominio inválido'),

  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre debe tener entre 2 y 200 caracteres'),

  body('direccion')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('La dirección no puede estar vacía'),

  body('ciudad')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La ciudad no debe exceder 100 caracteres'),

  body('estado')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El estado no debe exceder 100 caracteres'),

  body('codigoPostal')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El código postal no debe exceder 10 caracteres'),

  body('telefono')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no debe exceder 20 caracteres'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),

  body('totalUnidades')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Total de unidades debe ser un número entero positivo'),

  body('gerenteId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID de gerente inválido'),

  body('thumbnail')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('El thumbnail debe ser una URL válida')
    .isLength({ max: 500 })
    .withMessage('El thumbnail no debe exceder 500 caracteres'),

  body('statusCondominio')
    .optional({ checkFalsy: true })
    .isIn(['activo', 'inactivo', 'archivado'])
    .withMessage('El status del condominio debe ser activo, inactivo o archivado'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser un valor booleano'),

  // Datos fiscales para facturación CFDI
  body('rfc')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 13 })
    .withMessage('RFC no debe exceder 13 caracteres'),

  body('razonSocial')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Razón social no debe exceder 300 caracteres'),

  body('regimenFiscal')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 10 })
    .withMessage('Régimen fiscal inválido'),

  body('codigoPostalFiscal')
    .optional({ checkFalsy: true })
    .isLength({ min: 4, max: 10 })
    .withMessage('Código postal fiscal inválido'),

  body('facturapiKey')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 200 })
    .withMessage('Facturapi key inválida'),
];

/**
 * Validation rules for getting a condominio by ID
 */
export const getCondominioValidation = [
  param('id')
    .notEmpty()
    .isString()
    .withMessage('ID de condominio inválido'),
];

/**
 * Validation rules for getting condominios by gerente ID
 */
export const getCondominiosByGerenteValidation = [
  param('gerenteId')
    .isUUID()
    .withMessage('ID de gerente inválido'),
];
