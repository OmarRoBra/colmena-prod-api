import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { reservaciones, condominios, unidades } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all reservaciones
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
      area,
      fechaInicio,
      fechaFin,
      costo,
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

    // Verify unidad exists
    const [unidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, unidadId))
      .limit(1);

    if (!unidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    // Validate dates
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    if (startDate >= endDate) {
      return next(
        AppError.badRequest('La fecha de fin debe ser posterior a la fecha de inicio')
      );
    }

    // Create reservacion
    const [newReservacion] = await db
      .insert(reservaciones)
      .values({
        condominioId,
        unidadId,
        usuarioId: userId,
        area,
        fechaInicio: startDate,
        fechaFin: endDate,
        costo: costo || '0',
        notas,
        estado: 'pendiente',
      })
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
    const { estado, notas } = req.body;

    // Check if reservacion exists
    const [existingReservacion] = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);

    if (!existingReservacion) {
      return next(AppError.notFound('Reservación no encontrada'));
    }

    // Update reservacion
    const [updatedReservacion] = await db
      .update(reservaciones)
      .set({
        ...(estado && { estado }),
        ...(notas !== undefined && { notas }),
        updatedAt: new Date(),
      })
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

    // Check if reservacion exists
    const [existingReservacion] = await db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);

    if (!existingReservacion) {
      return next(AppError.notFound('Reservación no encontrada'));
    }

    // Delete reservacion
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
