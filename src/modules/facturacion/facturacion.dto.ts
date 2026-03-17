import { body, param, query } from 'express-validator';

// Motivos de cancelación SAT CFDI 4.0
const MOTIVOS_CANCELACION = ['01', '02', '03', '04'] as const;
// 01 = Comprobante emitido con errores con relación
// 02 = Comprobante emitido con errores sin relación
// 03 = No se llevó a cabo la operación
// 04 = Operación nominativa relacionada en una factura global

const FLUJOS_VALIDOS = [
  'mantenimiento', 'multa', 'amenidad', 'renta_espacio', 'renta', 'venta_material', 'otro',
] as const;

const FORMAS_PAGO_VALIDAS = ['01', '02', '03', '04', '28', '99'] as const;

// ── Emitir CFDI de Ingreso ────────────────────────────────────────────────────
export const emitirFacturaValidation = [
  body('condominioId').notEmpty().isString().withMessage('condominioId requerido'),
  body('receptorTipo')
    .notEmpty()
    .isIn(['residente', 'externo', 'empresa_externa', 'publico_general'])
    .withMessage('receptorTipo debe ser: residente | externo | empresa_externa | publico_general'),
  // residenteId requerido para receptor residente
  body('residenteId')
    .if(body('receptorTipo').equals('residente'))
    .notEmpty().isString().withMessage('residenteId requerido para receptor tipo residente'),
  // proveedorExternoId requerido para receptor externo
  body('proveedorExternoId')
    .if(body('receptorTipo').equals('externo'))
    .notEmpty().isString().withMessage('proveedorExternoId requerido para receptor tipo externo'),
  // trabajadorId requerido para receptor empresa_externa (trabajador tipo empresa)
  body('trabajadorId')
    .if(body('receptorTipo').equals('empresa_externa'))
    .notEmpty().isString().withMessage('trabajadorId requerido para receptor tipo empresa_externa'),
  body('flujo')
    .notEmpty()
    .isIn(FLUJOS_VALIDOS)
    .withMessage(`flujo debe ser uno de: ${FLUJOS_VALIDOS.join(', ')}`),
  body('pagoId').optional({ checkFalsy: true }).isString(),
  // items es opcional — si no se envían se usan los defaults del flujo + monto
  body('items').optional().isArray(),
  body('items.*.descripcion').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  body('items.*.claveProducto').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
  body('items.*.claveUnidad').optional({ checkFalsy: true }).isString().isLength({ max: 10 }),
  body('items.*.precio')
    .optional().isFloat({ min: 0.01 }).withMessage('precio debe ser mayor a 0'),
  body('items.*.cantidad').optional().isFloat({ min: 0.001 }),
  body('items.*.conIva').optional().isBoolean({ strict: false }),
  body('items.*.descuento').optional().isFloat({ min: 0, max: 100 }),
  // monto requerido cuando no se envían items (se usa con los defaults del flujo)
  body('monto')
    .if(body('items').not().isArray({ min: 1 }))
    .notEmpty().isFloat({ min: 0.01 })
    .withMessage('monto requerido cuando no se envían items'),
  body('formaPago')
    .notEmpty()
    .isIn(FORMAS_PAGO_VALIDAS)
    .withMessage(`formaPago inválida. Opciones: ${FORMAS_PAGO_VALIDAS.join(', ')}`),
  body('metodoPago')
    .notEmpty()
    .isIn(['PUE', 'PPD'])
    .withMessage('metodoPago debe ser PUE o PPD'),
  body('usoCfdi').optional({ checkFalsy: true }).isString().isLength({ max: 10 }),
  body('serie').optional({ checkFalsy: true }).isString().isLength({ max: 10 }),
  body('notas').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  body('enviarEmail').optional().isBoolean({ strict: false }),
];

// ── Cancelar CFDI ─────────────────────────────────────────────────────────────
export const cancelarFacturaValidation = [
  param('id').isUUID(),
  query('condominioId').notEmpty().isString().withMessage('condominioId requerido'),
  body('motivo')
    .notEmpty()
    .isIn(MOTIVOS_CANCELACION)
    .withMessage(`motivo debe ser: ${MOTIVOS_CANCELACION.join(', ')}`),
  body('sustitucion')
    .optional()
    .isString()
    .withMessage('sustitucion debe ser el UUID del CFDI que reemplaza al cancelado'),
];

// ── Listar facturas emitidas ──────────────────────────────────────────────────
export const listarFacturasEmitidasValidation = [
  query('condominioId').notEmpty().isString(),
  query('flujo').optional().isIn(FLUJOS_VALIDOS),
  query('estado').optional().isIn(['borrador', 'vigente', 'cancelada', 'en_proceso']),
  query('receptorTipo').optional().isIn(['residente', 'externo', 'empresa_externa', 'publico_general']),
  query('desde').optional().isISO8601(),
  query('hasta').optional().isISO8601(),
];

// ── Registrar factura recibida ────────────────────────────────────────────────
export const registrarFacturaRecibidaValidation = [
  body('condominioId').notEmpty().isString(),
  body('proveedorId').optional().isString(),
  body('gastoId').optional().isString(),
  body('cfdiUuid')
    .optional()
    .isUUID()
    .withMessage('cfdiUuid debe ser UUID válido'),
  body('emisorRfc')
    .notEmpty()
    .isLength({ min: 12, max: 13 })
    .matches(/^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/)
    .withMessage('RFC del emisor inválido'),
  body('emisorRazonSocial').optional().isString().isLength({ max: 300 }),
  body('serie').optional().isString().isLength({ max: 10 }),
  body('folio').optional().isString().isLength({ max: 20 }),
  body('fechaEmision').notEmpty().isISO8601(),
  body('subtotal').notEmpty().isFloat({ min: 0 }),
  body('iva').optional().isFloat({ min: 0 }),
  body('total').notEmpty().isFloat({ min: 0 }),
  body('moneda').optional().isString().isLength({ max: 10 }),
  body('descripcion').notEmpty().isString().isLength({ max: 1000 }),
  body('categoria').optional().isString().isLength({ max: 100 }),
  body('xmlUrl').optional().isURL(),
  body('pdfUrl').optional().isURL(),
  body('notas').optional().isString().isLength({ max: 500 }),
];

export const updateFacturaRecibidaValidation = [
  param('id').isUUID(),
  query('condominioId').notEmpty().isString().withMessage('condominioId requerido'),
  body('gastoId').optional().isString(),
  body('proveedorId').optional().isString(),
  body('verificada').optional().isBoolean(),
  body('estado').optional().isIn(['vigente', 'cancelada']),
  body('categoria').optional().isString().isLength({ max: 100 }),
  body('notas').optional().isString().isLength({ max: 500 }),
  body('xmlUrl').optional().isURL(),
  body('pdfUrl').optional().isURL(),
];

export const getByIdValidation = [
  param('id').isUUID(),
  query('condominioId').notEmpty().isString().withMessage('condominioId requerido'),
];

export const enviarEmailValidation = [
  param('id').isUUID(),
  query('condominioId').notEmpty().isString().withMessage('condominioId requerido'),
  body('email').notEmpty().isEmail().normalizeEmail().withMessage('email inválido'),
];

export const listarFacturasRecibidasValidation = [
  query('condominioId').notEmpty().isString(),
  query('proveedorId').optional().isString(),
  query('verificada').optional().isBoolean(),
  query('desde').optional().isISO8601(),
  query('hasta').optional().isISO8601(),
];
