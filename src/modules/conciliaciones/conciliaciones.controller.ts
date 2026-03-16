import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { conciliaciones, conciliacionMovimientos, pagos, gastos } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { logAudit } from '../../utils/audit';

/**
 * Create a new reconciliation session
 */
export const createConciliacion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { condominioId, nombre, archivoOriginal, movimientos } = req.body;
    const userId = (req as any).user?.userId;

    // Create session
    const [session] = await db.insert(conciliaciones).values({
      condominioId,
      nombre,
      archivoOriginal: archivoOriginal || null,
      estado: 'borrador',
      totalMovimientos: Array.isArray(movimientos) ? movimientos.length : 0,
      totalPendientes: Array.isArray(movimientos) ? movimientos.length : 0,
      createdBy: userId,
    }).returning();

    // Insert movements if provided
    if (Array.isArray(movimientos) && movimientos.length > 0) {
      const rows = movimientos.map((m: any) => ({
        conciliacionId: session.id,
        fecha: m.fecha,
        descripcion: m.descripcion,
        referenciaBanco: m.referenciaBanco || null,
        monto: String(m.monto),
        tipo: m.tipo, // ingreso | egreso
        estado: m.estado || 'pendiente',
        confianza: m.confianza ?? null,
        pagoId: m.pagoId || null,
        gastoId: m.gastoId || null,
      }));
      await db.insert(conciliacionMovimientos).values(rows);
    }

    await logAudit({
      usuarioId: userId,
      accion: 'crear_conciliacion',
      entidad: 'conciliaciones',
      entidadId: session.id,
      detalles: { nombre, condominioId, totalMovimientos: session.totalMovimientos },
    });

    res.status(201).json({ status: 'success', data: { conciliacion: session } });
  } catch (error) {
    logger.error('Error creating conciliacion:', error);
    next(new AppError('Error al crear la conciliación', 500));
  }
};

/**
 * Get reconciliation sessions for a condominium
 */
export const getConciliaciones = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { condominioId } = req.params;

    const sessions = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.condominioId, condominioId))
      .orderBy(conciliaciones.createdAt);

    // Reverse for newest first
    sessions.reverse();

    res.json({ status: 'success', data: { conciliaciones: sessions } });
  } catch (error) {
    logger.error('Error fetching conciliaciones:', error);
    next(new AppError('Error al obtener conciliaciones', 500));
  }
};

/**
 * Get a single reconciliation session with all its movements
 */
export const getConciliacionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const [session] = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.id, id));

    if (!session) {
      return next(new AppError('Conciliación no encontrada', 404));
    }

    const movimientos = await db
      .select()
      .from(conciliacionMovimientos)
      .where(eq(conciliacionMovimientos.conciliacionId, id))
      .orderBy(conciliacionMovimientos.fecha);

    res.json({
      status: 'success',
      data: { conciliacion: session, movimientos },
    });
  } catch (error) {
    logger.error('Error fetching conciliacion:', error);
    next(new AppError('Error al obtener la conciliación', 500));
  }
};

/**
 * Confirm a movement match (mark as conciliado)
 */
export const confirmMovimiento = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { id } = req.params; // movement id
    const { pagoId, gastoId } = req.body;
    const userId = (req as any).user?.userId;

    const [mov] = await db
      .select()
      .from(conciliacionMovimientos)
      .where(eq(conciliacionMovimientos.id, id));

    if (!mov) {
      return next(new AppError('Movimiento no encontrado', 404));
    }

    // Update the movement
    const [updated] = await db
      .update(conciliacionMovimientos)
      .set({
        estado: 'conciliado',
        pagoId: pagoId || mov.pagoId,
        gastoId: gastoId || mov.gastoId,
        confirmadoPor: userId,
        confirmadoAt: new Date(),
      })
      .where(eq(conciliacionMovimientos.id, id))
      .returning();

    // Mark the matched pago/gasto as reconciled
    if (updated.pagoId) {
      await db.update(pagos).set({ reconciliado: true }).where(eq(pagos.id, updated.pagoId));
    }
    if (updated.gastoId) {
      await db.update(gastos).set({ reconciliado: true }).where(eq(gastos.id, updated.gastoId));
    }

    // Update session counters
    await updateSessionCounters(mov.conciliacionId);

    res.json({ status: 'success', data: { movimiento: updated } });
  } catch (error) {
    logger.error('Error confirming movimiento:', error);
    next(new AppError('Error al confirmar el movimiento', 500));
  }
};

/**
 * Ignore a movement (mark as ignorado)
 */
export const ignoreMovimiento = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const [mov] = await db
      .select()
      .from(conciliacionMovimientos)
      .where(eq(conciliacionMovimientos.id, id));

    if (!mov) {
      return next(new AppError('Movimiento no encontrado', 404));
    }

    const [updated] = await db
      .update(conciliacionMovimientos)
      .set({
        estado: 'ignorado',
        confirmadoPor: userId,
        confirmadoAt: new Date(),
      })
      .where(eq(conciliacionMovimientos.id, id))
      .returning();

    await updateSessionCounters(mov.conciliacionId);

    res.json({ status: 'success', data: { movimiento: updated } });
  } catch (error) {
    logger.error('Error ignoring movimiento:', error);
    next(new AppError('Error al ignorar el movimiento', 500));
  }
};

/**
 * Bulk confirm high-confidence matches
 */
export const bulkConfirmMovimientos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { ids } = req.body; // array of movement ids
    const userId = (req as any).user?.userId;

    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('Debe seleccionar al menos un movimiento', 400));
    }

    // Fetch movements to confirm
    const movs = await db
      .select()
      .from(conciliacionMovimientos)
      .where(
        and(
          inArray(conciliacionMovimientos.id, ids),
          eq(conciliacionMovimientos.estado, 'pendiente')
        )
      );

    let confirmed = 0;
    const pagoIds: string[] = [];
    const gastoIds: string[] = [];

    for (const mov of movs) {
      if (!mov.pagoId && !mov.gastoId) continue; // skip unmatched

      await db
        .update(conciliacionMovimientos)
        .set({
          estado: 'conciliado',
          confirmadoPor: userId,
          confirmadoAt: new Date(),
        })
        .where(eq(conciliacionMovimientos.id, mov.id));

      if (mov.pagoId) pagoIds.push(mov.pagoId);
      if (mov.gastoId) gastoIds.push(mov.gastoId);
      confirmed++;
    }

    // Mark matched records as reconciled
    if (pagoIds.length > 0) {
      await db.update(pagos).set({ reconciliado: true }).where(inArray(pagos.id, pagoIds));
    }
    if (gastoIds.length > 0) {
      await db.update(gastos).set({ reconciliado: true }).where(inArray(gastos.id, gastoIds));
    }

    // Update session counters for each unique session
    const sessionIds = [...new Set(movs.map(m => m.conciliacionId))];
    for (const sid of sessionIds) {
      await updateSessionCounters(sid);
    }

    await logAudit({
      usuarioId: userId,
      accion: 'bulk_confirmar_movimientos',
      entidad: 'conciliacion_movimientos',
      entidadId: ids[0],
      detalles: { totalConfirmados: confirmed, totalSolicitados: ids.length },
    });

    res.json({ status: 'success', data: { confirmed } });
  } catch (error) {
    logger.error('Error bulk confirming movimientos:', error);
    next(new AppError('Error al confirmar movimientos', 500));
  }
};

/**
 * Close a reconciliation session
 */
export const closeConciliacion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const [session] = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.id, id));

    if (!session) {
      return next(new AppError('Conciliación no encontrada', 404));
    }

    if (session.estado === 'cerrado') {
      return next(new AppError('La conciliación ya está cerrada', 400));
    }

    const [updated] = await db
      .update(conciliaciones)
      .set({
        estado: 'cerrado',
        cerradoPor: userId,
        cerradoAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conciliaciones.id, id))
      .returning();

    await logAudit({
      usuarioId: userId,
      accion: 'cerrar_conciliacion',
      entidad: 'conciliaciones',
      entidadId: id,
      detalles: {
        totalMovimientos: updated.totalMovimientos,
        totalConciliados: updated.totalConciliados,
        totalIgnorados: updated.totalIgnorados,
        totalPendientes: updated.totalPendientes,
      },
    });

    res.json({ status: 'success', data: { conciliacion: updated } });
  } catch (error) {
    logger.error('Error closing conciliacion:', error);
    next(new AppError('Error al cerrar la conciliación', 500));
  }
};

/**
 * Mark session as reviewed
 */
export const reviewConciliacion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const [session] = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.id, id));

    if (!session) {
      return next(new AppError('Conciliación no encontrada', 404));
    }

    if (session.estado !== 'borrador') {
      return next(new AppError('Solo se pueden revisar conciliaciones en borrador', 400));
    }

    const [updated] = await db
      .update(conciliaciones)
      .set({ estado: 'revisado', updatedAt: new Date() })
      .where(eq(conciliaciones.id, id))
      .returning();

    res.json({ status: 'success', data: { conciliacion: updated } });
  } catch (error) {
    logger.error('Error reviewing conciliacion:', error);
    next(new AppError('Error al marcar como revisada', 500));
  }
};

/**
 * Export reconciliation summary as CSV
 */
export const exportConciliacionCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const [session] = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.id, id));

    if (!session) {
      return next(new AppError('Conciliación no encontrada', 404));
    }

    const movimientos = await db
      .select()
      .from(conciliacionMovimientos)
      .where(eq(conciliacionMovimientos.conciliacionId, id))
      .orderBy(conciliacionMovimientos.fecha);

    // Build CSV
    const headers = [
      'Fecha',
      'Descripción',
      'Referencia Banco',
      'Monto',
      'Tipo',
      'Estado',
      'Confianza %',
      'Pago ID',
      'Gasto ID',
      'Confirmado Por',
      'Confirmado At',
    ].join(',');

    const rows = movimientos.map(m => [
      m.fecha,
      `"${(m.descripcion || '').replace(/"/g, '""')}"`,
      `"${(m.referenciaBanco || '').replace(/"/g, '""')}"`,
      m.monto,
      m.tipo,
      m.estado,
      m.confianza ?? '',
      m.pagoId || '',
      m.gastoId || '',
      m.confirmadoPor || '',
      m.confirmadoAt ? new Date(m.confirmadoAt).toISOString() : '',
    ].join(','));

    const csv = [headers, ...rows].join('\n');

    const filename = `conciliacion_${session.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    logger.error('Error exporting conciliacion CSV:', error);
    next(new AppError('Error al exportar la conciliación', 500));
  }
};

/**
 * Delete a reconciliation session (only drafts)
 */
export const deleteConciliacion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const [session] = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.id, id));

    if (!session) {
      return next(new AppError('Conciliación no encontrada', 404));
    }

    if (session.estado === 'cerrado') {
      return next(new AppError('No se puede eliminar una conciliación cerrada', 400));
    }

    // Cascade will delete movimientos
    await db.delete(conciliaciones).where(eq(conciliaciones.id, id));

    await logAudit({
      usuarioId: userId,
      accion: 'eliminar_conciliacion',
      entidad: 'conciliaciones',
      entidadId: id,
      detalles: { nombre: session.nombre },
    });

    res.json({ status: 'success', data: null });
  } catch (error) {
    logger.error('Error deleting conciliacion:', error);
    next(new AppError('Error al eliminar la conciliación', 500));
  }
};

// ---- Helpers ----

async function updateSessionCounters(conciliacionId: string) {
  const movimientos = await db
    .select()
    .from(conciliacionMovimientos)
    .where(eq(conciliacionMovimientos.conciliacionId, conciliacionId));

  let totalConciliados = 0;
  let totalIgnorados = 0;
  let totalPendientes = 0;

  for (const m of movimientos) {
    if (m.estado === 'conciliado') totalConciliados++;
    else if (m.estado === 'ignorado') totalIgnorados++;
    else totalPendientes++;
  }

  await db
    .update(conciliaciones)
    .set({
      totalMovimientos: movimientos.length,
      totalConciliados,
      totalIgnorados,
      totalPendientes,
      updatedAt: new Date(),
    })
    .where(eq(conciliaciones.id, conciliacionId));
}
