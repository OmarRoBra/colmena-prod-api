import { body, param } from 'express-validator';

export const getEncuestasByCondominioValidation = [
  param('condominioId').isUUID().withMessage('ID de condominio inválido'),
];

export const getEncuestaValidation = [
  param('id').isUUID().withMessage('ID de encuesta inválido'),
];

export const createEncuestaValidation = [
  body('condominioId')
    .notEmpty().withMessage('El condominioId es requerido')
    .isUUID().withMessage('ID de condominio inválido'),

  body('titulo')
    .trim()
    .notEmpty().withMessage('El título es requerido')
    .isLength({ max: 200 }).withMessage('El título no debe exceder 200 caracteres'),

  body('descripcion').optional().trim(),

  body('fechaInicio')
    .notEmpty().withMessage('La fecha de inicio es requerida')
    .isISO8601().withMessage('Fecha de inicio inválida'),

  body('fechaFin')
    .notEmpty().withMessage('La fecha de fin es requerida')
    .isISO8601().withMessage('Fecha de fin inválida'),

  body('destinatarios')
    .optional()
    .isIn(['todos', 'propietarios', 'inquilinos'])
    .withMessage('Destinatarios debe ser: todos, propietarios o inquilinos'),

  body('estado')
    .optional()
    .isIn(['activo', 'cerrado', 'borrador'])
    .withMessage('Estado debe ser: activo, cerrado o borrador'),

  body('preguntas')
    .notEmpty().withMessage('Las preguntas son requeridas')
    .isArray({ min: 1 }).withMessage('Debe haber al menos una pregunta'),

  body('preguntas.*.texto')
    .notEmpty().withMessage('Cada pregunta debe tener texto'),

  body('preguntas.*.tipo')
    .isIn(['opcion_multiple', 'texto_libre'])
    .withMessage('El tipo debe ser: opcion_multiple o texto_libre'),
];

export const deleteEncuestaValidation = [
  param('id').isUUID().withMessage('ID de encuesta inválido'),
];

export const getRespuestasValidation = [
  param('id').isUUID().withMessage('ID de encuesta inválido'),
];

export const createRespuestaValidation = [
  param('id').isUUID().withMessage('ID de encuesta inválido'),

  body('respondidoPor')
    .trim()
    .notEmpty().withMessage('El campo respondidoPor es requerido')
    .isLength({ max: 200 }).withMessage('No puede exceder 200 caracteres'),

  body('unidadId').optional().isUUID().withMessage('El unidadId debe ser un UUID válido'),

  body('respuestas')
    .notEmpty().withMessage('Las respuestas son requeridas')
    .isObject().withMessage('Las respuestas deben ser un objeto'),
];
