import { body, param } from 'express-validator';

// ==========================================
// Type Interfaces
// ==========================================
export interface ResidentDTO {
  id: string
  unidadId: string
  nombre: string
  email: string
  telefono: string
  tipo: string
  fechaIngreso: string
  documentoIdentidad?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  notas?: string
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateResidentDTO {
  unidadId: string
  nombre: string
  email: string
  telefono: string
  tipo?: string
  fechaIngreso: string
  documentoIdentidad?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  notas?: string
}

export interface UpdateResidentDTO {
  nombre?: string
  email?: string
  telefono?: string
  tipo?: string
  fechaIngreso?: string
  documentoIdentidad?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  notas?: string
  activo?: boolean
}

// ==========================================
// Validation Rules
// ==========================================

/**
 * Validation rules for creating a resident
 */
export const createResidentValidation = [
  body('unidadId')
    .notEmpty()
    .withMessage('El ID de la unidad es requerido')
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

  body('tipo')
    .optional()
    .isIn(['Propietario', 'Inquilino', 'Familiar'])
    .withMessage('Tipo debe ser Propietario, Inquilino o Familiar'),

  body('fechaIngreso')
    .notEmpty()
    .withMessage('La fecha de ingreso es requerida')
    .isISO8601()
    .withMessage('Fecha de ingreso inválida'),

  body('documentoIdentidad')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El documento de identidad no debe exceder 50 caracteres'),

  body('contactoEmergencia')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El contacto de emergencia no debe exceder 200 caracteres'),

  body('telefonoEmergencia')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono de emergencia no debe exceder 20 caracteres'),

  body('notas')
    .optional()
    .isString()
    .withMessage('Las notas deben ser texto'),
];

/**
 * Validation rules for updating a resident
 */
export const updateResidentValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de residente inválido'),

  body('nombre')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre no debe exceder 200 caracteres'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no debe exceder 20 caracteres'),

  body('tipo')
    .optional()
    .isIn(['Propietario', 'Inquilino', 'Familiar'])
    .withMessage('Tipo debe ser Propietario, Inquilino o Familiar'),

  body('fechaIngreso')
    .optional()
    .isISO8601()
    .withMessage('Fecha de ingreso inválida'),

  body('documentoIdentidad')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El documento de identidad no debe exceder 50 caracteres'),

  body('contactoEmergencia')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El contacto de emergencia no debe exceder 200 caracteres'),

  body('telefonoEmergencia')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono de emergencia no debe exceder 20 caracteres'),

  body('notas')
    .optional()
    .isString()
    .withMessage('Las notas deben ser texto'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('Activo debe ser true o false'),
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
