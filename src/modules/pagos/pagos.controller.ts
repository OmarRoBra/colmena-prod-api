import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and, like, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { pagos, unidades, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { logAudit } from '../../utils/audit';
import { notifyMonthlyFeesGenerated, notifyPaymentReported, notifyPaymentApproved, notifyPaymentRejected } from '../../services/automation.service';

function resolveDueDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveMonthlyDueDate(anio: number, mes: number, diaVencimiento?: number) {
  const lastDay = new Date(anio, mes, 0).getDate();
  const day = Math.min(Math.max(diaVencimiento || 10, 1), lastDay);
  return new Date(anio, mes - 1, day, 12, 0, 0, 0);
}

/**
 * Get all pagos
 */
export const getAllPagos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allPagos = await db.select().from(pagos).where(isNull(pagos.deletedAt));

    res.status(200).json({
      status: 'success',
      results: allPagos.length,
      data: { pagos: allPagos },
    });
  } catch (error) {
    logger.error('Error in getAllPagos:', error);
    next(error);
  }
};

/**
 * Get pago by ID
 */
export const getPagoById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { id } = req.params;

    const [pago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!pago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    res.status(200).json({
      status: 'success',
      data: { pago },
    });
  } catch (error) {
    logger.error('Error in getPagoById:', error);
    next(error);
  }
};

/**
 * Get pagos by unidad ID
 */
export const getPagosByUnidad = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { unidadId } = req.params;

    // Verify unidad exists
    const [unidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, unidadId))
      .limit(1);

    if (!unidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    const pagosUnidad = await db
      .select()
      .from(pagos)
      .where(and(eq(pagos.unidadId, unidadId), isNull(pagos.deletedAt)));

    res.status(200).json({
      status: 'success',
      results: pagosUnidad.length,
      data: { pagos: pagosUnidad },
    });
  } catch (error) {
    logger.error('Error in getPagosByUnidad:', error);
    next(error);
  }
};

/**
 * Create a new pago
 */
export const createPago = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const {
      unidadId,
      monto,
      concepto,
      metodoPago,
      referencia,
      comprobante,
      notas,
      fechaLimite,
      dueDate,
    } = req.body;

    // Verify unidad exists
    const [unidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, unidadId))
      .limit(1);

    if (!unidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    const resolvedDueDate = resolveDueDate(fechaLimite || dueDate);

    // Create pago — default metodoPago to 'pendiente' when not yet known
    const [newPago] = await db
      .insert(pagos)
      .values({
        unidadId,
        usuarioId: userId,
        monto,
        concepto,
        metodoPago: metodoPago || 'pendiente',
        referencia,
        comprobante,
        notas,
        estado: 'pendiente',
        fechaLimite: resolvedDueDate,
      })
      .returning();

    logger.info(`Pago created: ${newPago.id} for unidad ${unidadId}`);

    await logAudit({
      usuarioId: userId,
      condominioId: unidad.condominiumId,
      accion: 'create',
      entidad: 'pago',
      entidadId: newPago.id,
      detalles: { monto: newPago.monto, concepto: newPago.concepto, unidadId },
      ipAddress: req.ip,
    });

    res.status(201).json({
      status: 'success',
      message: 'Pago registrado exitosamente',
      data: { pago: newPago },
    });
  } catch (error) {
    logger.error('Error in createPago:', error);
    next(error);
  }
};

/**
 * Update pago
 */
export const updatePago = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { id } = req.params;
    const { estado, referencia, comprobante, notas, metodoPago, fechaLimite, dueDate, motivoRechazo } = req.body;

    // Check if pago exists
    const [existingPago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!existingPago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    const oldEstado = existingPago.estado;
    const resolvedDueDate = resolveDueDate(fechaLimite || dueDate);

    // Determine actual estado: if admin approves but montoPagado < monto → parcial
    let finalEstado = estado;
    if (estado === 'completado') {
      const totalMonto = parseFloat(existingPago.monto) || 0;
      const montoPagado = parseFloat(existingPago.montoPagado) || 0;
      if (montoPagado > 0 && montoPagado < totalMonto) {
        finalEstado = 'parcial';
      }
    }

    // Update pago
    const [updatedPago] = await db
      .update(pagos)
      .set({
        ...(finalEstado && { estado: finalEstado }),
        ...(metodoPago && { metodoPago }),
        ...(referencia !== undefined && { referencia }),
        ...(comprobante !== undefined && { comprobante }),
        ...(notas !== undefined && { notas }),
        ...(resolvedDueDate && { fechaLimite: resolvedDueDate }),
        ...((finalEstado === 'completado' || finalEstado === 'parcial') && {
          fechaPago: new Date(),
          aprobadoPor: req.user?.userId ?? null,
          fechaAprobacion: new Date(),
        }),
        ...(finalEstado === 'rechazado' && motivoRechazo && { motivoRechazo }),
        updatedAt: new Date(),
      })
      .where(eq(pagos.id, id))
      .returning();

    logger.info(`Pago updated: ${updatedPago.id}`);

    await logAudit({
      usuarioId: req.user?.userId ?? null,
      accion: 'update',
      entidad: 'pago',
      entidadId: updatedPago.id,
      detalles: { oldEstado, newEstado: updatedPago.estado, motivoRechazo: updatedPago.motivoRechazo },
      ipAddress: req.ip,
    });

    // Notify resident on approval/rejection
    if ((finalEstado === 'completado' || finalEstado === 'parcial') && oldEstado !== 'completado' && oldEstado !== 'parcial') {
      void notifyPaymentApproved(updatedPago).catch((err) => {
        logger.error('Payment approval notification failed:', err);
      });
    } else if (finalEstado === 'rechazado' && oldEstado !== 'rechazado') {
      void notifyPaymentRejected(updatedPago, motivoRechazo).catch((err) => {
        logger.error('Payment rejection notification failed:', err);
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Pago actualizado exitosamente',
      data: { pago: updatedPago },
    });
  } catch (error) {
    logger.error('Error in updatePago:', error);
    next(error);
  }
};

/**
 * Report payment by resident — marks as por_verificar with payment details
 */
export const reportPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { id } = req.params;
    const { metodoPago, referencia, comprobante, notas, montoPagado: reportedAmount } = req.body;

    const [existingPago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!existingPago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    if (existingPago.estado === 'completado') {
      return next(AppError.badRequest('Este pago ya fue completado'));
    }

    // Accumulate montoPagado for partial payments
    const currentPaid = parseFloat(existingPago.montoPagado) || 0;
    const newPayment = parseFloat(reportedAmount) || 0;
    const totalMonto = parseFloat(existingPago.monto) || 0;
    const newMontoPagado = newPayment > 0 ? Math.min(currentPaid + newPayment, totalMonto) : currentPaid;

    const [updatedPago] = await db
      .update(pagos)
      .set({
        estado: 'por_verificar',
        metodoPago: metodoPago || existingPago.metodoPago,
        ...(newPayment > 0 && { montoPagado: String(newMontoPagado) }),
        ...(referencia !== undefined && { referencia }),
        ...(comprobante !== undefined && { comprobante }),
        ...(notas !== undefined && { notas }),
        updatedAt: new Date(),
      })
      .where(eq(pagos.id, id))
      .returning();

    logger.info(`Pago reported by resident: ${updatedPago.id}, method: ${metodoPago}, amount: ${newPayment || 'full'}`);

    await logAudit({
      usuarioId: req.user?.userId ?? null,
      accion: 'update',
      entidad: 'pago',
      entidadId: updatedPago.id,
      detalles: { estado: 'por_verificar', metodoPago, referencia },
      ipAddress: req.ip,
    });

    void notifyPaymentReported(updatedPago).catch((automationError) => {
      logger.error('Payment report automation failed:', automationError);
    });

    res.status(200).json({
      status: 'success',
      message: 'Pago reportado exitosamente. La administración verificará tu pago.',
      data: { pago: updatedPago },
    });
  } catch (error) {
    logger.error('Error in reportPayment:', error);
    next(error);
  }
};

/**
 * Request clarification on a payment (creates notification for admin)
 */
export const requestClarification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { id } = req.params;
    const { mensaje } = req.body;
    const userId = req.user?.userId;

    const [existingPago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!existingPago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    // Append clarification note to existing notas
    const timestamp = new Date().toLocaleString('es-MX');
    const clarificationNote = `[Aclaración ${timestamp}]: ${mensaje}`;
    const updatedNotas = existingPago.notas
      ? `${existingPago.notas}\n${clarificationNote}`
      : clarificationNote;

    const [updatedPago] = await db
      .update(pagos)
      .set({
        notas: updatedNotas,
        updatedAt: new Date(),
      })
      .where(eq(pagos.id, id))
      .returning();

    logger.info(`Payment clarification requested: ${id} by user ${userId}`);

    await logAudit({
      usuarioId: userId ?? null,
      accion: 'update',
      entidad: 'pago',
      entidadId: id,
      detalles: { accion: 'solicitud_aclaracion', mensaje },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      message: 'Solicitud de aclaración enviada correctamente.',
      data: { pago: updatedPago },
    });
  } catch (error) {
    logger.error('Error in requestClarification:', error);
    next(error);
  }
};

/**
 * Delete pago
 */
export const deletePago = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { id } = req.params;

    // Check if pago exists
    const [existingPago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!existingPago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    // Soft delete — preserve financial records
    await db
      .update(pagos)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(pagos.id, id));

    logger.info(`Pago soft-deleted: ${id}`);

    await logAudit({
      usuarioId: req.user?.userId ?? null,
      accion: 'soft_delete',
      entidad: 'pago',
      entidadId: id,
      detalles: { monto: existingPago.monto, concepto: existingPago.concepto, estado: existingPago.estado },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      message: 'Pago eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deletePago:', error);
    next(error);
  }
};

/**
 * Get pagos by condominium
 */
export const getPagosByCondominium = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { condominioId } = req.params;

    // Get all units for the condominium
    const condoUnidades = await db
      .select({ id: unidades.id })
      .from(unidades)
      .where(eq(unidades.condominiumId, condominioId));

    if (condoUnidades.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { pagos: [] },
      });
    }

    // Get all pagos for those units in a single query
    const unitIds = condoUnidades.map(u => u.id);
    const allPagos = await db
      .select()
      .from(pagos)
      .where(and(inArray(pagos.unidadId, unitIds), isNull(pagos.deletedAt)));

    res.status(200).json({
      status: 'success',
      results: allPagos.length,
      data: { pagos: allPagos },
    });
  } catch (error) {
    logger.error('Error in getPagosByCondominium:', error);
    next(error);
  }
};

/**
 * Generate maintenance fees for all units in a condominium
 */
export const generateMaintenanceFees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const { condominioId, mes, anio, diaVencimiento } = req.body;

    // Verify condominium exists
    const [condo] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);

    if (!condo) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    // Get all units for the condominium
    const condoUnidades = await db
      .select()
      .from(unidades)
      .where(eq(unidades.condominiumId, condominioId));

    if (condoUnidades.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No hay unidades registradas en este condominio',
        data: { pagos: [], generated: 0 },
      });
    }

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const monthName = monthNames[mes - 1] || `Mes ${mes}`;

    const conceptoPrefix = `Cuota Mantenimiento ${monthName} ${anio}`;
    const createdPagos = [];
    const skippedUnits = [];
    const dueDate = resolveMonthlyDueDate(Number(anio), Number(mes), diaVencimiento ? Number(diaVencimiento) : undefined);

    for (const unidad of condoUnidades) {
      // Skip vacant or maintenance units
      if (unidad.estado === 'Vacío' || unidad.estado === 'Mantenimiento') {
        skippedUnits.push(`${unidad.numero} (${unidad.estado})`);
        continue;
      }

      // Check if a fee already exists for this unit in this month/year
      const [existing] = await db
        .select({ id: pagos.id })
        .from(pagos)
        .where(
          and(
            eq(pagos.unidadId, unidad.id),
            like(pagos.concepto, `${conceptoPrefix}%`)
          )
        )
        .limit(1);

      if (existing) {
        skippedUnits.push(unidad.numero);
        continue;
      }

      const refLabel = unidad.referenciaUnica ? ` [Ref: ${unidad.referenciaUnica}]` : '';
      const concepto = `${conceptoPrefix} - Unidad ${unidad.numero}${refLabel}`;

      const feeAmount = parseFloat(unidad.cuotaMantenimiento) || 0;
      const saldo = parseFloat(unidad.saldoAFavor) || 0;

      // Determine credit to apply from saldo a favor
      let creditoAplicado = 0;
      let estado = 'pendiente';
      let metodoPago = 'pendiente';
      let fechaPago: Date | undefined;
      let notaCredito = '';

      if (saldo > 0 && feeAmount > 0) {
        if (saldo >= feeAmount) {
          // Full credit covers the fee
          creditoAplicado = feeAmount;
          estado = 'completado';
          metodoPago = 'saldo_a_favor';
          fechaPago = new Date();
          notaCredito = `Pagado automáticamente con saldo a favor. Crédito aplicado: $${feeAmount.toFixed(2)}`;
        } else {
          // Partial credit
          creditoAplicado = saldo;
          notaCredito = `Crédito parcial aplicado: $${saldo.toFixed(2)} de saldo a favor. Pendiente: $${(feeAmount - saldo).toFixed(2)}`;
        }

        // Deduct credit from unit's saldo a favor
        await db
          .update(unidades)
          .set({
            saldoAFavor: sql`${unidades.saldoAFavor} - ${creditoAplicado}`,
            updatedAt: new Date(),
          })
          .where(eq(unidades.id, unidad.id));
      }

      const [newPago] = await db
        .insert(pagos)
        .values({
          unidadId: unidad.id,
          usuarioId: userId,
          monto: unidad.cuotaMantenimiento,
          concepto,
          metodoPago,
          referencia: unidad.referenciaUnica || undefined,
          estado,
          fechaLimite: dueDate,
          creditoAplicado: String(creditoAplicado),
          ...(fechaPago && { fechaPago }),
          ...(notaCredito && { notas: notaCredito }),
          ...(estado === 'completado' && {
            aprobadoPor: userId,
            fechaAprobacion: new Date(),
          }),
        })
        .returning();

      createdPagos.push(newPago);
    }

    const autoPaid = createdPagos.filter(p => p.estado === 'completado').length;
    const partialCredit = createdPagos.filter(p => parseFloat(p.creditoAplicado) > 0 && p.estado !== 'completado').length;

    logger.info(
      `Generated ${createdPagos.length} maintenance fees for condominium ${condominioId} (${monthName} ${anio}), skipped ${skippedUnits.length}, auto-paid ${autoPaid}, partial credit ${partialCredit}`
    );

    void notifyMonthlyFeesGenerated(condominioId, createdPagos).catch((automationError) => {
      logger.error('Maintenance fee automation failed:', automationError);
    });

    const skippedMsg = skippedUnits.length > 0
      ? `. ${skippedUnits.length} unidad(es) omitida(s) (${skippedUnits.join(', ')})`
      : '';
    const creditMsg = autoPaid > 0
      ? `. ${autoPaid} pagada(s) automáticamente con saldo a favor`
      : '';
    const partialMsg = partialCredit > 0
      ? `. ${partialCredit} con crédito parcial aplicado`
      : '';

    res.status(201).json({
      status: 'success',
      message: `Se generaron ${createdPagos.length} cuotas de mantenimiento para ${monthName} ${anio}${skippedMsg}${creditMsg}${partialMsg}`,
      data: {
        pagos: createdPagos,
        generated: createdPagos.length,
        skipped: skippedUnits.length,
        autoPaid,
        partialCredit,
      },
    });
  } catch (error) {
    logger.error('Error in generateMaintenanceFees:', error);
    next(error);
  }
};

/**
 * Bulk approve payments
 */
export const bulkApprovePagos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const { ids } = req.body as { ids: string[] };

    // Fetch all matching payments that are por_verificar
    const matchingPagos = await db
      .select()
      .from(pagos)
      .where(
        and(
          inArray(pagos.id, ids),
          eq(pagos.estado, 'por_verificar'),
          isNull(pagos.deletedAt)
        )
      );

    if (matchingPagos.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No se encontraron pagos por verificar con los IDs proporcionados',
        data: { approved: 0 },
      });
    }

    const now = new Date();
    const approvedIds = matchingPagos.map((p) => p.id);

    await db
      .update(pagos)
      .set({
        estado: 'completado',
        fechaPago: now,
        aprobadoPor: userId,
        fechaAprobacion: now,
        updatedAt: now,
      })
      .where(inArray(pagos.id, approvedIds));

    // Audit + notify each payment
    for (const pago of matchingPagos) {
      await logAudit({
        usuarioId: userId,
        accion: 'update',
        entidad: 'pago',
        entidadId: pago.id,
        detalles: { oldEstado: 'por_verificar', newEstado: 'completado', bulk: true },
        ipAddress: req.ip,
      });

      void notifyPaymentApproved({ ...pago, estado: 'completado' }).catch((err) => {
        logger.error(`Bulk approve notification failed for pago ${pago.id}:`, err);
      });
    }

    logger.info(`Bulk approved ${approvedIds.length} payments by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: `Se aprobaron ${approvedIds.length} pago(s) exitosamente`,
      data: { approved: approvedIds.length },
    });
  } catch (error) {
    logger.error('Error in bulkApprovePagos:', error);
    next(error);
  }
};

/**
 * Aged receivables report — groups outstanding payments by aging buckets
 */
export const getAgedReceivables = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { condominioId } = req.params;

    const condoUnidades = await db
      .select()
      .from(unidades)
      .where(eq(unidades.condominiumId, condominioId));

    if (condoUnidades.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { buckets: { current: [], days30: [], days60: [], days90Plus: [] }, totals: { current: 0, days30: 0, days60: 0, days90Plus: 0, total: 0 } },
      });
    }

    const unitIds = condoUnidades.map((u) => u.id);
    const unitMap = new Map(condoUnidades.map((u) => [u.id, u]));

    const outstanding = await db
      .select()
      .from(pagos)
      .where(
        and(
          inArray(pagos.unidadId, unitIds),
          inArray(pagos.estado, ['pendiente', 'vencido', 'parcial', 'por_verificar']),
          isNull(pagos.deletedAt)
        )
      );

    const now = new Date();
    const buckets: Record<string, typeof outstanding> = { current: [], days30: [], days60: [], days90Plus: [] };

    for (const pago of outstanding) {
      const dueDate = pago.fechaLimite || pago.createdAt;
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) buckets.current.push(pago);
      else if (diffDays <= 30) buckets.days30.push(pago);
      else if (diffDays <= 60) buckets.days60.push(pago);
      else buckets.days90Plus.push(pago);
    }

    const sumBucket = (items: typeof outstanding) =>
      items.reduce((sum, p) => {
        const monto = parseFloat(p.monto) || 0;
        const montoPagado = parseFloat(p.montoPagado) || 0;
        const mora = parseFloat(p.mora) || 0;
        return sum + (monto - montoPagado) + mora;
      }, 0);

    const totals = {
      current: Math.round(sumBucket(buckets.current) * 100) / 100,
      days30: Math.round(sumBucket(buckets.days30) * 100) / 100,
      days60: Math.round(sumBucket(buckets.days60) * 100) / 100,
      days90Plus: Math.round(sumBucket(buckets.days90Plus) * 100) / 100,
      total: 0 as number,
    };
    totals.total = Math.round((totals.current + totals.days30 + totals.days60 + totals.days90Plus) * 100) / 100;

    // Enrich with unit info
    const enrichPago = (p: (typeof outstanding)[0]) => {
      const unit = unitMap.get(p.unidadId);
      return {
        ...p,
        unidadNumero: unit?.numero ?? '',
        propietario: unit?.propietario ?? '',
        pendiente: Math.round(((parseFloat(p.monto) || 0) - (parseFloat(p.montoPagado) || 0)) * 100) / 100,
      };
    };

    res.status(200).json({
      status: 'success',
      data: {
        buckets: {
          current: buckets.current.map(enrichPago),
          days30: buckets.days30.map(enrichPago),
          days60: buckets.days60.map(enrichPago),
          days90Plus: buckets.days90Plus.map(enrichPago),
        },
        totals,
      },
    });
  } catch (error) {
    logger.error('Error in getAgedReceivables:', error);
    next(error);
  }
};

/**
 * Export payments as CSV
 */
export const exportPaymentsCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { condominioId } = req.params;

    const condoUnidades = await db
      .select()
      .from(unidades)
      .where(eq(unidades.condominiumId, condominioId));

    const unitIds = condoUnidades.map((u) => u.id);
    const unitMap = new Map(condoUnidades.map((u) => [u.id, u]));

    const allPagos = await db
      .select()
      .from(pagos)
      .where(
        and(
          inArray(pagos.unidadId, unitIds),
          isNull(pagos.deletedAt)
        )
      );

    const csvHeader = 'Unidad,Propietario,Concepto,Monto,Monto Pagado,Mora,Estado,Método Pago,Referencia,Fecha Límite,Fecha Pago,Crédito Aplicado\n';
    const csvRows = allPagos.map((p) => {
      const unit = unitMap.get(p.unidadId);
      const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
      return [
        escape(unit?.numero ?? ''),
        escape(unit?.propietario ?? ''),
        escape(p.concepto),
        p.monto,
        p.montoPagado,
        p.mora,
        escape(p.estado),
        escape(p.metodoPago),
        escape(p.referencia ?? ''),
        p.fechaLimite ? new Date(p.fechaLimite).toISOString().split('T')[0] : '',
        p.fechaPago ? new Date(p.fechaPago).toISOString().split('T')[0] : '',
        p.creditoAplicado,
      ].join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pagos_${condominioId}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Error in exportPaymentsCsv:', error);
    next(error);
  }
};
