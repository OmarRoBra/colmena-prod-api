import { body, param } from 'express-validator';

const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;

export const createTrabajadorValidation = [
  body('condominioId').notEmpty().isUUID(),
  body('tipo')
    .optional()
    .isIn(['empleado', 'empresa_externa'])
    .withMessage('tipo debe ser empleado o empresa_externa'),
  body('nombre').trim().notEmpty().isLength({ max: 100 }),
  body('apellido')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }),
  body('puesto').trim().notEmpty().isLength({ max: 100 }),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('salario').optional().isFloat({ min: 0 }),
  body('fechaContratacion').notEmpty().isISO8601(),
  body('notas').optional().isString().isLength({ max: 500 }),
  // Datos fiscales — requeridos si tipo=empresa_externa
  body('rfc')
    .if(body('tipo').equals('empresa_externa'))
    .notEmpty()
    .matches(RFC_REGEX)
    .withMessage('RFC inválido (formato SAT requerido)'),
  body('rfc')
    .if(body('tipo').not().equals('empresa_externa'))
    .optional({ nullable: true })
    .matches(RFC_REGEX)
    .withMessage('RFC inválido'),
  body('razonSocial')
    .if(body('tipo').equals('empresa_externa'))
    .notEmpty()
    .isString()
    .isLength({ max: 300 })
    .withMessage('razonSocial requerida para empresa_externa'),
  body('razonSocial')
    .if(body('tipo').not().equals('empresa_externa'))
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 300 }),
  body('regimenFiscal').optional({ nullable: true }).isString().isLength({ max: 10 }),
  body('usoCfdi').optional({ nullable: true }).isString().isLength({ max: 10 }),
  body('codigoPostalFiscal')
    .if(body('tipo').equals('empresa_externa'))
    .notEmpty()
    .isString()
    .isLength({ min: 5, max: 10 })
    .withMessage('codigoPostalFiscal requerido para empresa_externa'),
  body('codigoPostalFiscal')
    .if(body('tipo').not().equals('empresa_externa'))
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 10 }),
];

export const updateTrabajadorValidation = [
  param('id').isUUID(),
  body('tipo')
    .optional()
    .isIn(['empleado', 'empresa_externa'])
    .withMessage('tipo debe ser empleado o empresa_externa'),
  body('puesto').optional().trim().isLength({ max: 100 }),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('salario').optional().isFloat({ min: 0 }),
  body('activo').optional().isBoolean(),
  body('notas').optional().isString().isLength({ max: 500 }),
  body('rfc').optional({ nullable: true }).matches(RFC_REGEX).withMessage('RFC inválido'),
  body('razonSocial').optional({ nullable: true }).isString().isLength({ max: 300 }),
  body('regimenFiscal').optional({ nullable: true }).isString().isLength({ max: 10 }),
  body('usoCfdi').optional({ nullable: true }).isString().isLength({ max: 10 }),
  body('codigoPostalFiscal').optional({ nullable: true }).isString().isLength({ max: 10 }),
];

export const getTrabajadorValidation = [param('id').isUUID()];
