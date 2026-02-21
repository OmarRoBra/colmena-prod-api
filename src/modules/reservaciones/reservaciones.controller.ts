import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { reservaciones, condominios, unidades, areasComunes } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all reservaciones (admin)
 */
export const getAllReservaciones = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allReservaciones = await db.select().from(reservaciones);

    res.status(200).json({
      status: 'success',
      results: allReservaciones.length,
      data: { reservaciones: allReservaciones },
    });
  } catch (error) {
    logger.error('Error in getAllReservaciones:', error);
    next(error);
  }
};

/**
 * Get reservaciones by condominium
 */
export const getByCondominio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { condominioId } = req.params;

    const allReservaciones = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.condominioId, condominioId));

    res.status(200).json({
      status: 'success',
      results: allReservaciones.length,
      data: { reservaciones: allReservaciones },
    });
  } catch (error) {
    logger.error('Error in getByCondominio:', error);
    next(error);
  }
};

/**
 * Get reservacion by ID
 */
export const getReservacionById = async (
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

    const [reservacion] = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);

    if (!reservacion) {
      return next(AppError.notFound('Reservación no encontrada'));
    }

    res.status(200).json({
      status: 'success',
      data: { reservacion },
    });
  } catch (error) {
    logger.error('Error in getReservacionById:', error);
    next(error);
  }
};

/**
 * Create a new reservacion
 */
export const createReservacion = async (
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
      condominioId,
      unidadId,
      areaComunId,
      area,
      fechaInicio,
      fechaFin,
      costo,
      numPersonas,
      motivo,
      notas,
    } = req.body;

    // Verify condominio exists
    const [condominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);

    if (!condominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    // Verify unidad if provided
    if (unidadId) {
      const [unidad] = await db
        .select()
        .from(unidades)
        .where(eq(unidades.id, unidadId))
        .limit(1);

      if (!unidad) {
        return next(AppError.notFound('Unidad no encontrada'));
      }
    }

    // Determine area name from areaComunId if provided
    let areaName = area || '';
    if (areaComunId) {
      const [areaComun] = await db
        .select()
        .from(areasComunes)
        .where(eq(areasComunes.id, areaComunId))
        .limit(1);

      if (!areaComun) {
        return next(AppError.notFound('Área común no encontrada'));
      }
      areaName = areaComun.nombre;
    }

    // Validate dates
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    if (startDate >= endDate) {
      return next(
        AppError.badRequest('La fecha de fin debe ser posterior a la fecha de inicio')
      );
    }

    // Create reservacion - build values dynamically to avoid sending empty strings for UUID columns
    const insertValues: Record<string, unknown> = {
      condominioId,
      usuarioId: userId,
      area: areaName,
      fechaInicio: startDate,
      fechaFin: endDate,
      costo: costo || '0',
      numPersonas: numPersonas || 1,
      estado: 'pendiente',
    };

    // Only include optional UUID fields if they have valid values
    if (unidadId && typeof unidadId === 'string' && unidadId.trim() !== '') {
      insertValues.unidadId = unidadId;
    }
    if (areaComunId && typeof areaComunId === 'string' && areaComunId.trim() !== '') {
      insertValues.areaComunId = areaComunId;
    }
    if (motivo && typeof motivo === 'string' && motivo.trim() !== '') {
      insertValues.motivo = motivo;
    }
    if (notas && typeof notas === 'string' && notas.trim() !== '') {
      insertValues.notas = notas;
    }

    const [newReservacion] = await db
      .insert(reservaciones)
      .values(insertValues as typeof reservaciones.$inferInsert)
      .returning();

    logger.info(`Reservacion created: ${newReservacion.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Reservación creada exitosamente',
      data: { reservacion: newReservacion },
    });
  } catch (error) {
    logger.error('Error in createReservacion:', error);
    next(error);
  }
};

/**
 * Update reservacion
 */
export const updateReservacion = async (
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
    const {
      estado,
      notas,
      pagado,
      areaComunId,
      area,
      fechaInicio,
      fechaFin,
      costo,
      numPersonas,
      motivo,
    } = req.body;

    const [existingReservacion] = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);

    if (!existingReservacion) {
      return next(AppError.notFound('Reservación no encontrada'));
    }

    // Build update object dynamically
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (estado) updateData.estado = estado;
    if (notas !== undefined) updateData.notas = notas;
    if (pagado !== undefined) updateData.pagado = pagado;
    if (motivo !== undefined) updateData.motivo = motivo;
    if (costo !== undefined) updateData.costo = String(costo);
    if (numPersonas !== undefined) updateData.numPersonas = numPersonas;
    if (fechaInicio) updateData.fechaInicio = new Date(fechaInicio);
    if (fechaFin) updateData.fechaFin = new Date(fechaFin);

    if (areaComunId) {
      const [areaComun] = await db
        .select()
        .from(areasComunes)
        .where(eq(areasComunes.id, areaComunId))
        .limit(1);
      if (areaComun) {
        updateData.areaComunId = areaComunId;
        updateData.area = areaComun.nombre;
      }
    } else if (area) {
      updateData.area = area;
    }

    const [updatedReservacion] = await db
      .update(reservaciones)
      .set(updateData as Partial<typeof reservaciones.$inferInsert>)
      .where(eq(reservaciones.id, id))
      .returning();

    logger.info(`Reservacion updated: ${updatedReservacion.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Reservación actualizada exitosamente',
      data: { reservacion: updatedReservacion },
    });
  } catch (error) {
    logger.error('Error in updateReservacion:', error);
    next(error);
  }
};

/**
 * Approve reservacion
 */
export const aprobarReservacion = async (
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
    const userId = req.user?.userId;

    const [existing] = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);

    if (!existing) {
      return next(AppError.notFound('Reservación no encontrada'));
    }

    if (existing.estado !== 'pendiente') {
      return next(
        AppError.badRequest('Solo se pueden aprobar reservaciones pendientes')
      );
    }

    const [updated] = await db
      .update(reservaciones)
      .set({
        estado: 'confirmado',
        aprobadoPor: userId,
        fechaAprobacion: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservaciones.id, id))
      .returning();

    logger.info(`Reservacion approved: ${updated.id} by ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Reservación aprobada exitosamente',
      data: { reservacion: updated },
    });
  } catch (error) {
    logger.error('Error in aprobarReservacion:', error);
    next(error);
  }
};

/**
 * Reject reservacion
 */
export const rechazarReservacion = async (
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
    const { motivoRechazo } = req.body;

    const [existing] = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);

    if (!existing) {
      return next(AppError.notFound('Reservación no encontrada'));
    }

    if (existing.estado !== 'pendiente') {
      return next(
        AppError.badRequest('Solo se pueden rechazar reservaciones pendientes')
      );
    }

    const [updated] = await db
      .update(reservaciones)
      .set({
        estado: 'cancelado',
        motivoRechazo: motivoRechazo || 'Rechazada por administración',
        updatedAt: new Date(),
      })
      .where(eq(reservaciones.id, id))
      .returning();

    logger.info(`Reservacion rejected: ${updated.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Reservación rechazada',
      data: { reservacion: updated },
    });
  } catch (error) {
    logger.error('Error in rechazarReservacion:', error);
    next(error);
  }
};

/**
 * Delete reservacion
 */
export const deleteReservacion = async (
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

    const [existingReservacion] = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);

    if (!existingReservacion) {
      return next(AppError.notFound('Reservación no encontrada'));
    }

    await db.delete(reservaciones).where(eq(reservaciones.id, id));

    logger.info(`Reservacion deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Reservación eliminada exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteReservacion:', error);
    next(error);
  }
};
