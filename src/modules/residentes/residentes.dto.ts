import { body, param } from 'express-validator';

// ==========================================
// Type Interfaces
// ==========================================
export interface ResidentDTO {
  id: string
  condominioId: string
  unidadId: string
  nombre: string
  email: string
  telefono: string
  telefonoWhatsapp?: string | null
  tipo: string
  fechaIngreso: string
  documentoIdentidad?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  notas?: string
  activo: boolean
  rfc?: string | null
  razonSocial?: string | null
  regimenFiscal?: string | null
  usoCfdi?: string | null
  codigoPostalFiscal?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateResidentDTO {
  condominioId: string
  unidadId?: string
  nombre: string
  email: string
  telefono: string
  telefonoWhatsapp?: string
  tipo?: string
  fechaIngreso: string
  documentoIdentidad?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  notas?: string
  rfc?: string
  razonSocial?: string
  regimenFiscal?: string
  usoCfdi?: string
  codigoPostalFiscal?: string
}

export interface UpdateResidentDTO {
  nombre?: string
  email?: string
  telefono?: string
  telefonoWhatsapp?: string | null
  tipo?: string
  fechaIngreso?: string
  documentoIdentidad?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  notas?: string
  activo?: boolean
  rfc?: string | null
  razonSocial?: string | null
  regimenFiscal?: string | null
  usoCfdi?: string | null
  codigoPostalFiscal?: string | null
}

// ==========================================
// Validation Rules
// ==========================================

/**
 * Validation rules for creating a resident
 */
export const createResidentValidation = [
  body('condominioId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('unidadId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID de unidad inválido'),

  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ max: 200 })
    .withMessage('El nombre no debe exceder 200 caracteres'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El teléfono es requerido')
    .isLength({ max: 20 })
    .withMessage('El teléfono no debe exceder 20 caracteres'),

  body('telefonoWhatsapp')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono de WhatsApp no debe exceder 20 caracteres'),

  body('tipo')
    .optional({ checkFalsy: true })
    .isIn(['Propietario', 'Inquilino', 'Familiar'])
    .withMessage('Tipo debe ser Propietario, Inquilino o Familiar'),

  body('fechaIngreso')
    .notEmpty()
    .withMessage('La fecha de ingreso es requerida')
    .isISO8601()
    .withMessage('Fecha de ingreso inválida'),

  body('documentoIdentidad')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('El documento de identidad no debe exceder 50 caracteres'),

  body('contactoEmergencia')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('El contacto de emergencia no debe exceder 200 caracteres'),

  body('telefonoEmergencia')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono de emergencia no debe exceder 20 caracteres'),

  body('notas')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Las notas deben ser texto'),

  // Fiscal fields
  body('rfc')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 13 })
    .withMessage('El RFC no debe exceder 13 caracteres'),

  body('razonSocial')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('La razón social no debe exceder 300 caracteres'),

  body('regimenFiscal')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El régimen fiscal no debe exceder 10 caracteres'),

  body('usoCfdi')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El uso CFDI no debe exceder 10 caracteres'),

  body('codigoPostalFiscal')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El código postal fiscal no debe exceder 10 caracteres'),
];

/**
 * Validation rules for updating a resident
 */
export const updateResidentValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de residente inválido'),

  body('nombre')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre no debe exceder 200 caracteres'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('telefono')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no debe exceder 20 caracteres'),

  body('telefonoWhatsapp')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono de WhatsApp no debe exceder 20 caracteres'),

  body('tipo')
    .optional({ checkFalsy: true })
    .isIn(['Propietario', 'Inquilino', 'Familiar'])
    .withMessage('Tipo debe ser Propietario, Inquilino o Familiar'),

  body('fechaIngreso')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Fecha de ingreso inválida'),

  body('documentoIdentidad')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('El documento de identidad no debe exceder 50 caracteres'),

  body('contactoEmergencia')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('El contacto de emergencia no debe exceder 200 caracteres'),

  body('telefonoEmergencia')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono de emergencia no debe exceder 20 caracteres'),

  body('notas')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Las notas deben ser texto'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser true o false'),

  // Fiscal fields
  body('rfc')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 13 })
    .withMessage('El RFC no debe exceder 13 caracteres'),

  body('razonSocial')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('La razón social no debe exceder 300 caracteres'),

  body('regimenFiscal')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El régimen fiscal no debe exceder 10 caracteres'),

  body('usoCfdi')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El uso CFDI no debe exceder 10 caracteres'),

  body('codigoPostalFiscal')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('El código postal fiscal no debe exceder 10 caracteres'),
];

/**
 * Validation rules for getting a resident by ID
 */
export const getResidentValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de residente inválido'),
];

/**
 * Validation rules for getting residents by unit
 */
export const getResidentsByUnitValidation = [
  param('unidadId')
    .isUUID()
    .withMessage('ID de unidad inválido'),
];
