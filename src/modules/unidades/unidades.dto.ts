import { body, param } from 'express-validator';

// ==========================================
// Type Interfaces
// ==========================================
export interface UnitDTO {
  id: string
  condominiumId: string
  numero: string
  tipo: string
  area: number
  propietario: string
  estado: string
  habitaciones: number
  banos: number
  estacionamientos: number
  cuotaMantenimiento: number
  notas?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUnitDTO {
  condominiumId: string
  numero: string
  tipo: string
  area: number
  propietario: string
  estado?: string
  habitaciones?: number
  banos?: number
  estacionamientos?: number
  cuotaMantenimiento: number
  notas?: string
}

export interface UpdateUnitDTO {
  numero?: string
  tipo?: string
  area?: number
  propietario?: string
  estado?: string
  habitaciones?: number
  banos?: number
  estacionamientos?: number
  cuotaMantenimiento?: number
  notas?: string
}

// ==========================================
// Validation Rules
// ==========================================

/**
 * Validation rules for creating a unidad
 */
export const createUnidadValidation = [
  body('condominiumId')
    .notEmpty()
    .withMessage('El ID del condominio es requerido')
    .isUUID()
    .withMessage('ID de condominio inválido'),

  body('numero')
    .trim()
    .notEmpty()
    .withMessage('El número de unidad es requerido')
    .isLength({ max: 50 })
    .withMessage('El número de unidad no debe exceder 50 caracteres'),

  body('tipo')
    .trim()
    .notEmpty()
    .withMessage('El tipo de unidad es requerido')
    .isIn(['Apartamento', 'Casa', 'Local Comercial', 'Estacionamiento'])
    .withMessage('El tipo debe ser Apartamento, Casa, Local Comercial o Estacionamiento'),

  body('area')
    .notEmpty()
    .withMessage('El área es requerida')
    .isDecimal()
    .withMessage('El área debe ser un número decimal'),

  body('propietario')
    .trim()
    .notEmpty()
    .withMessage('El propietario es requerido')
    .isLength({ max: 200 })
    .withMessage('El nombre del propietario no debe exceder 200 caracteres'),

  body('estado')
    .optional()
    .isIn(['Ocupado', 'Vacío', 'Mantenimiento'])
    .withMessage('Estado debe ser Ocupado, Vacío o Mantenimiento'),

  body('habitaciones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Habitaciones debe ser un número entero positivo'),

  body('banos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Baños debe ser un número entero positivo'),

  body('estacionamientos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estacionamientos debe ser un número entero positivo'),

  body('cuotaMantenimiento')
    .notEmpty()
    .withMessage('La cuota de mantenimiento es requerida')
    .isDecimal()
    .withMessage('La cuota de mantenimiento debe ser un número decimal'),

  body('notas')
    .optional()
    .isString()
    .withMessage('Las notas deben ser texto'),
];

/**
 * Validation rules for updating a unidad
 */
export const updateUnidadValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de unidad inválido'),

  body('numero')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El número de unidad no debe exceder 50 caracteres'),

  body('tipo')
    .optional()
    .isIn(['Apartamento', 'Casa', 'Local Comercial', 'Estacionamiento'])
    .withMessage('El tipo debe ser Apartamento, Casa, Local Comercial o Estacionamiento'),

  body('area')
    .optional()
    .isDecimal()
    .withMessage('El área debe ser un número decimal'),

  body('propietario')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre del propietario no debe exceder 200 caracteres'),

  body('estado')
    .optional()
    .isIn(['Ocupado', 'Vacío', 'Mantenimiento'])
    .withMessage('Estado debe ser Ocupado, Vacío o Mantenimiento'),

  body('habitaciones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Habitaciones debe ser un número entero positivo'),

  body('banos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Baños debe ser un número entero positivo'),

  body('estacionamientos')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estacionamientos debe ser un número entero positivo'),

  body('cuotaMantenimiento')
    .optional()
    .isDecimal()
    .withMessage('La cuota de mantenimiento debe ser un número decimal'),

  body('notas')
    .optional()
    .isString()
    .withMessage('Las notas deben ser texto'),
];

/**
 * Validation rules for getting a unidad by ID
 */
export const getUnidadValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de unidad inválido'),
];

/**
 * Validation rules for getting unidades by condominio
 */
export const getUnidadesByCondominioValidation = [
  param('condominiumId')
    .isUUID()
    .withMessage('ID de condominio inválido'),
];
