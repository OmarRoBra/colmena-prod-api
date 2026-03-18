import Facturapi from 'facturapi';
import { config } from '../config/env';
import logger from '../utils/logger';

// ── SAT Catalogs (CFDI 4.0) ──────────────────────────────────────────────────
export const SAT = {
  // Regímenes Fiscales más comunes
  regimenFiscal: {
    '601': 'General de Ley Personas Morales',
    '603': 'Personas Morales con Fines no Lucrativos',
    '606': 'Arrendamiento',
    '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
    '616': 'Sin obligaciones fiscales',
    '620': 'Sociedades Cooperativas de Producción',
    '621': 'Incorporación Fiscal',
    '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
    '626': 'Régimen Simplificado de Confianza',
    '630': 'Enajenación de acciones en bolsa de valores',
    '636': 'Otro',
  },
  // Usos CFDI más comunes
  usoCfdi: {
    'G01': 'Adquisición de mercancias',
    'G02': 'Devoluciones, descuentos o bonificaciones',
    'G03': 'Gastos en general',
    'I01': 'Construcciones',
    'I02': 'Mobilario y equipo de oficina por inversiones',
    'I04': 'Equipo de computo y accesorios',
    'I08': 'Otra maquinaria y equipo',
    'CP01': 'Pagos',
    'S01': 'Sin efectos fiscales',
  },
  // Claves de producto/servicio SAT comunes en condominios
  claveProducto: {
    ADMINISTRACION: '80131501',    // Administración de propiedades
    MANTENIMIENTO: '80131503',     // Servicios de mantenimiento
    RENTA_SALON: '72154001',       // Alquiler de salones para eventos
    RENTA_ESPACIO: '80131504',     // Alquiler de áreas comunes
    RENTA_INMUEBLE: '80131500',    // Arrendamiento de inmuebles (renta residencial)
    MULTA: '85121800',             // Multas y sanciones administrativas
    CUOTA_CONDOMINIO: '80131502',  // Administración de condominios
    VENTA_MATERIAL: '24101800',    // Materiales de construcción genérico
    ELECTRICIDAD: '26111601',      // Energía eléctrica
    AGUA: '81141601',              // Suministro de agua
  },
  // Claves de unidad SAT (c_ClaveUnidad del SAT — ISO/UN-CEFACT)
  claveUnidad: {
    ACTIVIDAD: 'ACT',  // Actividad
    SERVICIO: 'E48',   // Unidad de Servicio
    MES: 'MON',        // Mes (Month — código ISO correcto, no "MES")
    PIEZA: 'H87',      // Pieza
    HORA: 'HUR',       // Hora
    DIA: 'DAY',        // Día (Day — no "DIA")
  },
  // Formas de pago
  formaPago: {
    '01': 'Efectivo',
    '02': 'Cheque nominativo',
    '03': 'Transferencia electrónica',
    '04': 'Tarjeta de crédito',
    '28': 'Tarjeta de débito',
    '99': 'Por definir',
  },
} as const;

// RFC especial para CFDI a público en general (sin solicitar factura)
export const RFC_PUBLICO_GENERAL = 'XAXX010101000';
export const RFC_EXTRANJERO = 'XEXX010101000';

// ── Facturapi Service ─────────────────────────────────────────────────────────

/**
 * Retorna una instancia de Facturapi con la key del condominio o la global de env.
 * Soporta multi-tenant: cada condominio puede tener su propia key.
 */
export function getFacturapiClient(): Facturapi {
  const apiKey = config.facturapi.key;
  if (!apiKey) {
    throw new Error('FACTURAPI_KEY no está configurada en las variables de entorno.');
  }
  return new Facturapi(apiKey);
}

// ── Customer helpers ──────────────────────────────────────────────────────────

interface CustomerData {
  legal_name: string;
  tax_id: string;            // RFC (Facturapi v4 usa tax_id)
  email: string;
  tax_system: string;        // régimen fiscal SAT code
  address: { zip: string };  // CP fiscal requerido CFDI 4.0
}

/**
 * Busca un cliente en Facturapi por RFC.
 * Si no existe, lo crea y retorna su ID.
 * Permite cachear el facturapiClienteId para no duplicar clientes.
 */
export async function resolveFacturapiCustomer(
  facturapi: Facturapi,
  data: CustomerData,
  existingFacturapiId?: string | null
): Promise<string> {
  // 1. Si ya tenemos el ID, lo usamos directamente
  if (existingFacturapiId) {
    return existingFacturapiId;
  }

  // 2. Buscar por RFC para evitar duplicados
  try {
    const results = await facturapi.customers.list({ q: data.tax_id });
    if (results.data && results.data.length > 0) {
      return results.data[0].id as string;
    }
  } catch (err) {
    logger.warn('No se pudo buscar cliente en Facturapi, se creará nuevo:', err);
  }

  // 3. Crear cliente nuevo
  const created = await facturapi.customers.create(data as unknown as Record<string, unknown>);
  return created.id as string;
}

// ── Invoice item builder ──────────────────────────────────────────────────────

export interface ItemFactura {
  descripcion: string;
  claveProducto: string;   // SAT product key
  claveUnidad: string;     // SAT unit key
  precio: number;          // Precio unitario SIN IVA
  cantidad?: number;       // Default 1
  conIva?: boolean;        // ¿Aplicar IVA 16%? Default true
  descuento?: number;      // Descuento en %
}

function normalizeUnitKey(unitKey: string): string {
  const normalized = unitKey.trim().toUpperCase();

  switch (normalized) {
    case 'MES':
      return SAT.claveUnidad.MES;
    case 'DIA':
      return SAT.claveUnidad.DIA;
    case 'SERVICIO':
      return SAT.claveUnidad.SERVICIO;
    case 'PIEZA':
      return SAT.claveUnidad.PIEZA;
    case 'HORA':
      return SAT.claveUnidad.HORA;
    default:
      return normalized;
  }
}

export function buildFacturapiItems(items: ItemFactura[]) {
  return items.map((item) => ({
    product: {
      description: item.descripcion,
      product_key: item.claveProducto,
      unit_key: normalizeUnitKey(item.claveUnidad),
      price: item.precio,
      tax_included: false,
      // factor: 'Tasa' es requerido por Facturapi v4 / SAT CFDI 4.0
      taxes: item.conIva !== false
        ? [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }]
        : [],
    },
    quantity: item.cantidad ?? 1,
    ...(item.descuento !== undefined && { discount: item.descuento }),
  }));
}

// ── Flujo → defaults mapper ───────────────────────────────────────────────────
// Mapea el flujo de negocio a defaults SAT para agilizar la emisión

export type FlujoFactura =
  | 'mantenimiento'
  | 'multa'
  | 'amenidad'
  | 'renta_espacio'
  | 'renta'
  | 'venta_material'
  | 'otro';

interface FlujoDefaults {
  claveProducto: string;
  claveUnidad: string;
  descripcion: string;
}

export const FLUJO_DEFAULTS: Record<FlujoFactura, FlujoDefaults> = {
  mantenimiento: {
    claveProducto: SAT.claveProducto.CUOTA_CONDOMINIO,
    claveUnidad: SAT.claveUnidad.MES,
    descripcion: 'Cuota de mantenimiento',
  },
  multa: {
    claveProducto: SAT.claveProducto.MULTA,
    claveUnidad: SAT.claveUnidad.ACTIVIDAD,
    descripcion: 'Multa por incumplimiento de reglamento',
  },
  amenidad: {
    claveProducto: SAT.claveProducto.RENTA_SALON,
    claveUnidad: SAT.claveUnidad.ACTIVIDAD,
    descripcion: 'Uso de área común',
  },
  renta_espacio: {
    claveProducto: SAT.claveProducto.RENTA_ESPACIO,
    claveUnidad: SAT.claveUnidad.DIA,
    descripcion: 'Renta de espacio o área común',
  },
  renta: {
    claveProducto: SAT.claveProducto.RENTA_INMUEBLE,
    claveUnidad: SAT.claveUnidad.MES,
    descripcion: 'Renta de unidad/inmueble',
  },
  venta_material: {
    claveProducto: SAT.claveProducto.VENTA_MATERIAL,
    claveUnidad: SAT.claveUnidad.PIEZA,
    descripcion: 'Venta de material',
  },
  otro: {
    claveProducto: SAT.claveProducto.ADMINISTRACION,
    claveUnidad: SAT.claveUnidad.ACTIVIDAD,
    descripcion: 'Servicio',
  },
};
