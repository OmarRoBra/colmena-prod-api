import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../../db';
import {
  facturasEmitidas,
  facturasRecibidas,
  condominios,
  residentes,
  proveedoresExternos,
  trabajadores,
  pagos,
  gastos,
  proveedores,
} from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { logAudit } from '../../utils/audit';
import {
  getFacturapiClient,
  resolveFacturapiCustomer,
  buildFacturapiItems,
  FLUJO_DEFAULTS,
  RFC_PUBLICO_GENERAL,
  SAT,
  type ItemFactura,
  type FlujoFactura,
} from '../../services/facturapi.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Verifica que el condominio tiene los datos fiscales completos para emitir */
async function assertCondominioFiscal(condominioId: string) {
  const [condo] = await db
    .select()
    .from(condominios)
    .where(eq(condominios.id, condominioId))
    .limit(1);

  if (!condo) throw AppError.notFound('Condominio no encontrado');

  if (!condo.rfc || !condo.razonSocial || !condo.regimenFiscal || !condo.codigoPostalFiscal) {
    throw AppError.badRequest(
      'El condominio no tiene datos fiscales completos. Configura: rfc, razonSocial, regimenFiscal y codigoPostalFiscal.'
    );
  }

  return condo;
}

// ── EMITIR CFDI de Ingreso ────────────────────────────────────────────────────

export const emitirFactura = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const {
      condominioId,
      receptorTipo,
      residenteId,
      proveedorExternoId,
      trabajadorId,
      flujo,
      pagoId,
      items,
      monto,
      formaPago,
      metodoPago,
      usoCfdi,
      serie,
      notas,
      enviarEmail,
    } = req.body;

    // 1. Verificar datos fiscales del condominio (emisor)
    const condo = await assertCondominioFiscal(condominioId);

    // 2. Idempotencia: verificar que el pago no tenga ya una factura
    if (pagoId) {
      const [existing] = await db
        .select({ id: facturasEmitidas.id })
        .from(facturasEmitidas)
        .where(eq(facturasEmitidas.pagoId, pagoId))
        .limit(1);

      if (existing) {
        return next(AppError.conflict('Este pago ya tiene una factura emitida'));
      }
    }

    // 3. Resolver datos del receptor
    let customerFacturapiId: string | null = null;
    let customerData: Record<string, unknown>;
    let receptorEmail: string | null = null;
    let savedResidenteId: string | null = null;
    let savedProveedorExternoId: string | null = null;
    let savedTrabajadorId: string | null = null;

    if (receptorTipo === 'publico_general') {
      // CFDI a público en general (CFDI 4.0: zip debe ser '00000', régimen 616)
      customerData = {
        legal_name: 'PUBLICO EN GENERAL',
        tax_id: RFC_PUBLICO_GENERAL,
        email: condo.email || 'facturacion@condominio.com',
        tax_system: '616',
        address: { zip: '00000' },
      };
    } else if (receptorTipo === 'residente') {
      const [res] = await db.select().from(residentes).where(eq(residentes.id, residenteId)).limit(1);
      if (!res) return next(AppError.notFound('Residente no encontrado'));
      if (res.condominioId !== condominioId) return next(AppError.forbidden('El residente no pertenece a este condominio'));
      if (!res.rfc || !res.codigoPostalFiscal) {
        return next(AppError.badRequest(
          'El residente no tiene datos fiscales completos (rfc, codigoPostalFiscal). Actualiza el perfil del residente.'
        ));
      }
      customerData = {
        legal_name: res.razonSocial || res.nombre,
        tax_id: res.rfc,
        email: res.email,
        tax_system: res.regimenFiscal || '616',
        address: { zip: res.codigoPostalFiscal },
      };
      customerFacturapiId = res.facturapiClienteId;
      receptorEmail = res.email;
      savedResidenteId = res.id;
    } else if (receptorTipo === 'externo') {
      // Proveedor externo registrado en el módulo de proveedores_externos
      const [ext] = await db.select().from(proveedoresExternos).where(eq(proveedoresExternos.id, proveedorExternoId)).limit(1);
      if (!ext) return next(AppError.notFound('Proveedor externo no encontrado'));
      if (ext.condominioId !== condominioId) return next(AppError.forbidden('El proveedor externo no pertenece a este condominio'));
      customerData = {
        legal_name: ext.razonSocial,
        tax_id: ext.rfc,
        email: ext.email,
        tax_system: ext.regimenFiscal,
        address: { zip: ext.codigoPostalFiscal },
      };
      customerFacturapiId = ext.facturapiClienteId;
      receptorEmail = ext.email;
      savedProveedorExternoId = ext.id;
    } else {
      // empresa_externa: empresa de servicios registrada en el módulo de trabajadores
      const [trab] = await db.select().from(trabajadores).where(eq(trabajadores.id, trabajadorId)).limit(1);
      if (!trab) return next(AppError.notFound('Empresa/trabajador externo no encontrado'));
      if (trab.condominioId !== condominioId) return next(AppError.forbidden('La empresa externa no pertenece a este condominio'));
      if (trab.tipo !== 'empresa_externa') {
        return next(AppError.badRequest('El trabajador registrado no es una empresa externa. Cambia su tipo a empresa_externa para facturar.'));
      }
      if (!trab.rfc || !trab.codigoPostalFiscal) {
        return next(AppError.badRequest(
          'La empresa externa no tiene datos fiscales completos. Actualiza: rfc y codigoPostalFiscal.'
        ));
      }
      customerData = {
        legal_name: trab.razonSocial || trab.nombre,
        tax_id: trab.rfc,
        email: trab.email || condo.email || '',
        tax_system: trab.regimenFiscal || '612',
        address: { zip: trab.codigoPostalFiscal },
      };
      customerFacturapiId = trab.facturapiClienteId;
      receptorEmail = trab.email;
      savedTrabajadorId = trab.id;
    }

    // 4. Obtener/crear cliente en Facturapi
    const facturapi = getFacturapiClient();

    let facturapiCustomerId: string;
    try {
      facturapiCustomerId = await resolveFacturapiCustomer(
        facturapi,
        customerData as unknown as Parameters<typeof resolveFacturapiCustomer>[1],
        customerFacturapiId
      );
    } catch (err: unknown) {
      logger.error('Facturapi resolveCustomer error:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = err as any;
      const detail = anyErr?.response?.data?.message ?? anyErr?.response?.data ?? (err instanceof Error ? err.message : String(err));
      return next(AppError.badRequest(`Error Facturapi (cliente): ${JSON.stringify(detail)}`));
    }

    // Cachear el facturapiClienteId para futuras facturas
    if (receptorTipo === 'residente' && savedResidenteId && facturapiCustomerId !== customerFacturapiId) {
      await db.update(residentes)
        .set({ facturapiClienteId: facturapiCustomerId, updatedAt: new Date() })
        .where(eq(residentes.id, savedResidenteId));
    } else if (receptorTipo === 'externo' && savedProveedorExternoId && facturapiCustomerId !== customerFacturapiId) {
      await db.update(proveedoresExternos)
        .set({ facturapiClienteId: facturapiCustomerId, updatedAt: new Date() })
        .where(eq(proveedoresExternos.id, savedProveedorExternoId));
    } else if (receptorTipo === 'empresa_externa' && savedTrabajadorId && facturapiCustomerId !== customerFacturapiId) {
      await db.update(trabajadores)
        .set({ facturapiClienteId: facturapiCustomerId, updatedAt: new Date() })
        .where(eq(trabajadores.id, savedTrabajadorId));
    }

    // 5. Determinar usoCfdi efectivo
    const usoCfdiEfectivo = usoCfdi
      || (receptorTipo === 'residente' ? (await db.select({ v: residentes.usoCfdi }).from(residentes).where(eq(residentes.id, savedResidenteId!)).limit(1))[0]?.v : null)
      || (receptorTipo === 'externo' ? (await db.select({ v: proveedoresExternos.usoCfdi }).from(proveedoresExternos).where(eq(proveedoresExternos.id, savedProveedorExternoId!)).limit(1))[0]?.v : null)
      || 'S01';

    // 6. Construir items — si no vienen en el body, usar defaults del flujo + monto
    const flujoDefaults = FLUJO_DEFAULTS[flujo as FlujoFactura];
    const facturacionItems: ItemFactura[] = items?.length
      ? items
      : [{
          descripcion: flujoDefaults.descripcion,
          claveProducto: flujoDefaults.claveProducto,
          claveUnidad: flujoDefaults.claveUnidad,
          precio: monto ?? 0,
          cantidad: 1,
          conIva: true,
        }];

    const facturapiItems = buildFacturapiItems(facturacionItems);

    // 7. Calcular totales
    const subtotal = facturacionItems.reduce((acc, item) => {
      const base = item.precio * (item.cantidad ?? 1);
      const descuento = item.descuento ? base * (item.descuento / 100) : 0;
      return acc + base - descuento;
    }, 0);
    const conIvaSome = facturacionItems.some((i) => i.conIva !== false);
    const iva = conIvaSome ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;

    // 8. Crear invoice en Facturapi
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let facturapiInvoice: any;
    const invoicePayload = {
      type: 'I',
      customer: facturapiCustomerId,
      items: facturapiItems,
      use: usoCfdiEfectivo,
      payment_form: formaPago,
      payment_method: metodoPago,
      currency: 'MXN',
      ...(serie && { series: serie }),
      ...(notas && { pdf_custom_section: notas }),
    };
    logger.info('Facturapi invoice payload:', JSON.stringify(invoicePayload, null, 2));
    try {
      facturapiInvoice = await facturapi.invoices.create(invoicePayload);
    } catch (err: unknown) {
      logger.error('Facturapi create invoice error (raw):', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = err as any;
      const detail = anyErr?.response?.data?.message
        ?? anyErr?.response?.data
        ?? (err instanceof Error ? err.message : String(err));
      logger.error('Facturapi error detail:', JSON.stringify(detail));
      return next(AppError.badRequest(`Error Facturapi: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`));
    }

    // 9. Persistir en BD
    const [nuevaFactura] = await db.insert(facturasEmitidas).values({
      condominioId,
      receptorTipo,
      residenteId: savedResidenteId,
      proveedorExternoId: savedProveedorExternoId,
      trabajadorId: savedTrabajadorId,
      flujo,
      pagoId: pagoId || null,
      facturapiId: String(facturapiInvoice.id),
      cfdiUuid: facturapiInvoice.uuid as string || null,
      serie: facturapiInvoice.series as string || serie || null,
      folio: String(facturapiInvoice.folio_number ?? ''),
      fechaEmision: facturapiInvoice.date ? new Date(facturapiInvoice.date as string) : new Date(),
      subtotal: String(subtotal),
      iva: String(iva),
      total: String(total),
      moneda: 'MXN',
      tipoCfdi: 'I',
      estado: facturapiInvoice.status === 'valid' ? 'vigente' : 'en_proceso',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawResponse: facturapiInvoice as any,
      notas: notas || null,
    }).returning();

    // 10. Enviar por email si se solicitó
    if (enviarEmail && receptorEmail) {
      try {
        await facturapi.invoices.sendByEmail(String(facturapiInvoice.id), { email: receptorEmail });
      } catch (err) {
        logger.warn('No se pudo enviar factura por email:', err);
      }
    }

    await logAudit({
      usuarioId: req.user?.userId ?? null,
      condominioId,
      accion: 'create',
      entidad: 'factura_emitida',
      entidadId: nuevaFactura.id,
      detalles: { flujo, total, receptorTipo },
      ipAddress: req.ip,
    });

    logger.info(`Factura emitida: ${nuevaFactura.id} UUID: ${nuevaFactura.cfdiUuid}`);

    res.status(201).json({
      status: 'success',
      message: 'Factura emitida exitosamente',
      data: { factura: nuevaFactura },
    });
  } catch (error) {
    logger.error('Error en emitirFactura:', error);
    next(error);
  }
};

// ── LISTAR facturas emitidas ──────────────────────────────────────────────────

export const getFacturasEmitidas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId, flujo, estado, receptorTipo, desde, hasta } = req.query;

    const conditions = [eq(facturasEmitidas.condominioId, condominioId as string)];
    if (flujo) conditions.push(eq(facturasEmitidas.flujo, flujo as string));
    if (estado) conditions.push(eq(facturasEmitidas.estado, estado as string));
    if (receptorTipo) conditions.push(eq(facturasEmitidas.receptorTipo, receptorTipo as string));
    if (desde) conditions.push(gte(facturasEmitidas.fechaEmision, new Date(desde as string)));
    if (hasta) conditions.push(lte(facturasEmitidas.fechaEmision, new Date(hasta as string)));

    const result = await db
      .select()
      .from(facturasEmitidas)
      .where(and(...conditions));

    res.status(200).json({
      status: 'success',
      results: result.length,
      data: { facturas: result },
    });
  } catch (error) {
    logger.error('Error en getFacturasEmitidas:', error);
    next(error);
  }
};

// ── OBTENER una factura emitida ───────────────────────────────────────────────

export const getFacturaEmitidaById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [factura] = await db
      .select()
      .from(facturasEmitidas)
      .where(eq(facturasEmitidas.id, req.params.id))
      .limit(1);

    if (!factura) return next(AppError.notFound('Factura no encontrada'));
    if (factura.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));

    res.status(200).json({ status: 'success', data: { factura } });
  } catch (error) {
    logger.error('Error en getFacturaEmitidaById:', error);
    next(error);
  }
};

// ── DESCARGAR PDF ─────────────────────────────────────────────────────────────

export const downloadFacturaPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [factura] = await db
      .select()
      .from(facturasEmitidas)
      .where(eq(facturasEmitidas.id, req.params.id))
      .limit(1);

    if (!factura) return next(AppError.notFound('Factura no encontrada'));
    if (factura.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));
    if (!factura.facturapiId) return next(AppError.badRequest('Esta factura no tiene ID de Facturapi'));

    const condo = await db.select().from(condominios).where(eq(condominios.id, factura.condominioId)).limit(1);
    const facturapi = getFacturapiClient();

    const stream = await facturapi.invoices.downloadPdf(factura.facturapiId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.folio || factura.id}.pdf"`);

    if (stream instanceof Buffer || stream instanceof Uint8Array) {
      res.send(stream);
    } else {
      (stream as NodeJS.ReadableStream).pipe(res);
    }
  } catch (error) {
    logger.error('Error en downloadFacturaPdf:', error);
    next(error);
  }
};

// ── DESCARGAR XML ─────────────────────────────────────────────────────────────

export const downloadFacturaXml = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [factura] = await db
      .select()
      .from(facturasEmitidas)
      .where(eq(facturasEmitidas.id, req.params.id))
      .limit(1);

    if (!factura) return next(AppError.notFound('Factura no encontrada'));
    if (factura.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));
    if (!factura.facturapiId) return next(AppError.badRequest('Esta factura no tiene ID de Facturapi'));

    const condo = await db.select().from(condominios).where(eq(condominios.id, factura.condominioId)).limit(1);
    const facturapi = getFacturapiClient();

    const stream = await facturapi.invoices.downloadXml(factura.facturapiId);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.folio || factura.id}.xml"`);

    if (stream instanceof Buffer || stream instanceof Uint8Array) {
      res.send(stream);
    } else {
      (stream as NodeJS.ReadableStream).pipe(res);
    }
  } catch (error) {
    logger.error('Error en downloadFacturaXml:', error);
    next(error);
  }
};

// ── CANCELAR CFDI ─────────────────────────────────────────────────────────────

export const cancelarFactura = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { motivo, sustitucion } = req.body;

    const [factura] = await db
      .select()
      .from(facturasEmitidas)
      .where(eq(facturasEmitidas.id, req.params.id))
      .limit(1);

    if (!factura) return next(AppError.notFound('Factura no encontrada'));
    if (factura.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));
    if (factura.estado === 'cancelada') return next(AppError.conflict('La factura ya está cancelada'));
    if (factura.estado === 'borrador') return next(AppError.badRequest('Una factura en borrador no puede cancelarse, elimínala directamente'));
    if (!factura.facturapiId) return next(AppError.badRequest('Esta factura no tiene ID de Facturapi'));

    const condo = await db.select().from(condominios).where(eq(condominios.id, factura.condominioId)).limit(1);
    const facturapi = getFacturapiClient();

    try {
      await facturapi.invoices.cancel(factura.facturapiId, {
        motive: motivo,
        ...(sustitucion && { substitution: sustitucion }),
      });
    } catch (err: unknown) {
      logger.error('Facturapi cancel error:', err);
      const msg = err instanceof Error ? err.message : 'Error al cancelar en Facturapi';
      return next(AppError.badRequest(`Error Facturapi: ${msg}`));
    }

    const [updated] = await db
      .update(facturasEmitidas)
      .set({ estado: 'cancelada', motivoCancelacion: motivo, updatedAt: new Date() })
      .where(eq(facturasEmitidas.id, req.params.id))
      .returning();

    await logAudit({
      usuarioId: req.user?.userId ?? null,
      condominioId: factura.condominioId,
      accion: 'cancel',
      entidad: 'factura_emitida',
      entidadId: factura.id,
      detalles: { motivo, sustitucion },
      ipAddress: req.ip,
    });

    logger.info(`Factura cancelada: ${factura.id} motivo: ${motivo}`);

    res.status(200).json({
      status: 'success',
      message: 'Factura cancelada exitosamente',
      data: { factura: updated },
    });
  } catch (error) {
    logger.error('Error en cancelarFactura:', error);
    next(error);
  }
};

// ── ENVIAR por email ──────────────────────────────────────────────────────────

export const enviarFacturaPorEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { email } = req.body;

    const [factura] = await db
      .select()
      .from(facturasEmitidas)
      .where(eq(facturasEmitidas.id, req.params.id))
      .limit(1);

    if (!factura) return next(AppError.notFound('Factura no encontrada'));
    if (factura.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));
    if (!factura.facturapiId) return next(AppError.badRequest('Esta factura no tiene ID de Facturapi'));

    const condo = await db.select().from(condominios).where(eq(condominios.id, factura.condominioId)).limit(1);
    const facturapi = getFacturapiClient();

    await facturapi.invoices.sendByEmail(factura.facturapiId, { email });

    res.status(200).json({ status: 'success', message: `Factura enviada a ${email}` });
  } catch (error) {
    logger.error('Error en enviarFacturaPorEmail:', error);
    next(error);
  }
};

// ── FACTURAS RECIBIDAS ────────────────────────────────────────────────────────

export const registrarFacturaRecibida = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const {
      condominioId, proveedorId, gastoId, cfdiUuid, serie, folio,
      emisorRfc, emisorRazonSocial, fechaEmision, subtotal, iva, total,
      moneda, descripcion, categoria, xmlUrl, pdfUrl, notas,
    } = req.body;

    // Verificar condominio
    const [condo] = await db.select({ id: condominios.id }).from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) return next(AppError.notFound('Condominio no encontrado'));

    // Verificar UUID único si se provee
    if (cfdiUuid) {
      const [dup] = await db.select({ id: facturasRecibidas.id }).from(facturasRecibidas).where(eq(facturasRecibidas.cfdiUuid, cfdiUuid)).limit(1);
      if (dup) return next(AppError.conflict('Ya existe una factura registrada con este UUID CFDI'));
    }

    // Verificar proveedor si se provee
    if (proveedorId) {
      const [prov] = await db.select({ id: proveedores.id }).from(proveedores).where(eq(proveedores.id, proveedorId)).limit(1);
      if (!prov) return next(AppError.notFound('Proveedor no encontrado'));
    }

    // Verificar gasto si se provee
    if (gastoId) {
      const [gasto] = await db.select({ id: gastos.id }).from(gastos).where(eq(gastos.id, gastoId)).limit(1);
      if (!gasto) return next(AppError.notFound('Gasto no encontrado'));
    }

    const [nueva] = await db.insert(facturasRecibidas).values({
      condominioId,
      proveedorId: proveedorId || null,
      gastoId: gastoId || null,
      cfdiUuid: cfdiUuid || null,
      serie: serie || null,
      folio: folio || null,
      emisorRfc,
      emisorRazonSocial: emisorRazonSocial || null,
      fechaEmision: new Date(fechaEmision),
      subtotal: String(subtotal),
      iva: String(iva ?? 0),
      total: String(total),
      moneda: moneda || 'MXN',
      descripcion,
      categoria: categoria || null,
      xmlUrl: xmlUrl || null,
      pdfUrl: pdfUrl || null,
      notas: notas || null,
      estado: 'vigente',
    }).returning();

    // Marcar el gasto como "tiene factura"
    if (gastoId) {
      await db.update(gastos).set({ tieneFactura: true, updatedAt: new Date() }).where(eq(gastos.id, gastoId));
    }

    await logAudit({
      usuarioId: req.user?.userId ?? null,
      condominioId,
      accion: 'create',
      entidad: 'factura_recibida',
      entidadId: nueva.id,
      detalles: { emisorRfc, total },
      ipAddress: req.ip,
    });

    logger.info(`Factura recibida registrada: ${nueva.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Factura recibida registrada',
      data: { factura: nueva },
    });
  } catch (error) {
    logger.error('Error en registrarFacturaRecibida:', error);
    next(error);
  }
};

export const getFacturasRecibidas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId, proveedorId, verificada, desde, hasta } = req.query;

    const conditions = [eq(facturasRecibidas.condominioId, condominioId as string)];
    if (proveedorId) conditions.push(eq(facturasRecibidas.proveedorId, proveedorId as string));
    if (verificada !== undefined) conditions.push(eq(facturasRecibidas.verificada, verificada === 'true'));
    if (desde) conditions.push(gte(facturasRecibidas.fechaEmision, new Date(desde as string)));
    if (hasta) conditions.push(lte(facturasRecibidas.fechaEmision, new Date(hasta as string)));

    const result = await db.select().from(facturasRecibidas).where(and(...conditions));

    res.status(200).json({
      status: 'success',
      results: result.length,
      data: { facturas: result },
    });
  } catch (error) {
    logger.error('Error en getFacturasRecibidas:', error);
    next(error);
  }
};

export const getFacturaRecibidaById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [factura] = await db
      .select()
      .from(facturasRecibidas)
      .where(eq(facturasRecibidas.id, req.params.id))
      .limit(1);

    if (!factura) return next(AppError.notFound('Factura recibida no encontrada'));
    if (factura.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));

    res.status(200).json({ status: 'success', data: { factura } });
  } catch (error) {
    logger.error('Error en getFacturaRecibidaById:', error);
    next(error);
  }
};

export const updateFacturaRecibida = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { gastoId, proveedorId, verificada, estado, categoria, notas, xmlUrl, pdfUrl } = req.body;

    const [existing] = await db.select().from(facturasRecibidas).where(eq(facturasRecibidas.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Factura recibida no encontrada'));
    if (existing.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));

    // Si se está asociando a un gasto nuevo, marcar el gasto
    const prevGastoId = existing.gastoId;
    if (gastoId && gastoId !== prevGastoId) {
      await db.update(gastos).set({ tieneFactura: true, updatedAt: new Date() }).where(eq(gastos.id, gastoId));
      // Desmarcar gasto anterior si lo hubiera
      if (prevGastoId) {
        const [otrasFacturasDelGasto] = await db
          .select({ id: facturasRecibidas.id })
          .from(facturasRecibidas)
          .where(and(eq(facturasRecibidas.gastoId, prevGastoId), eq(facturasRecibidas.estado, 'vigente')))
          .limit(1);
        if (!otrasFacturasDelGasto) {
          await db.update(gastos).set({ tieneFactura: false, updatedAt: new Date() }).where(eq(gastos.id, prevGastoId));
        }
      }
    }

    const [updated] = await db
      .update(facturasRecibidas)
      .set({
        ...(gastoId !== undefined && { gastoId }),
        ...(proveedorId !== undefined && { proveedorId }),
        ...(verificada !== undefined && { verificada }),
        ...(estado !== undefined && { estado }),
        ...(categoria !== undefined && { categoria }),
        ...(notas !== undefined && { notas }),
        ...(xmlUrl !== undefined && { xmlUrl }),
        ...(pdfUrl !== undefined && { pdfUrl }),
        updatedAt: new Date(),
      })
      .where(eq(facturasRecibidas.id, req.params.id))
      .returning();

    res.status(200).json({ status: 'success', data: { factura: updated } });
  } catch (error) {
    logger.error('Error en updateFacturaRecibida:', error);
    next(error);
  }
};

export const deleteFacturaRecibida = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [existing] = await db.select().from(facturasRecibidas).where(eq(facturasRecibidas.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Factura recibida no encontrada'));
    if (existing.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a esta factura'));

    await db.delete(facturasRecibidas).where(eq(facturasRecibidas.id, req.params.id));

    // Desmarcar el gasto si ya no tiene facturas
    if (existing.gastoId) {
      const [otras] = await db
        .select({ id: facturasRecibidas.id })
        .from(facturasRecibidas)
        .where(eq(facturasRecibidas.gastoId, existing.gastoId))
        .limit(1);
      if (!otras) {
        await db.update(gastos).set({ tieneFactura: false, updatedAt: new Date() }).where(eq(gastos.id, existing.gastoId));
      }
    }

    res.status(200).json({ status: 'success', message: 'Factura recibida eliminada' });
  } catch (error) {
    logger.error('Error en deleteFacturaRecibida:', error);
    next(error);
  }
};

// ── Catálogos SAT ─────────────────────────────────────────────────────────────

export const getCatalogos = (_req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: { catalogos: SAT } });
};
