import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { mantenimiento, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllMantenimiento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await db.select().from(mantenimiento);
    res.status(200).json({ status: 'success', results: all.length, data: { mantenimiento: all } });
  } catch (error) {
    logger.error('Error in getAllMantenimiento:', error);
    next(error);
  }
};

export const getMantenimientoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [mant] = await db.select().from(mantenimiento).where(eq(mantenimiento.id, req.params.id)).limit(1);
    if (!mant) return next(AppError.notFound('Solicitud no encontrada'));
    res.status(200).json({ status: 'success', data: { mantenimiento: mant } });
  } catch (error) {
    logger.error('Error in getMantenimientoById:', error);
    next(error);
  }
};

export const createMantenimiento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const userId = req.user?.userId;
    if (!userId) return next(AppError.unauthorized('No autenticado'));

    const { condominioId, unidadId, titulo, descripcion, categoria, prioridad } = req.body;

    const [cond] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!cond) return next(AppError.notFound('Condominio no encontrado'));

    const [newMant] = await db.insert(mantenimiento).values({
      condominioId, unidadId, solicitanteId: userId, titulo, descripcion, categoria,
      prioridad: prioridad || 'media', estado: 'pendiente',
    }).returning();

    logger.info(`Mantenimiento created: ${newMant.id}`);
    res.status(201).json({ status: 'success', message: 'Solicitud creada', data: { mantenimiento: newMant } });
  } catch (error) {
    logger.error('Error in createMantenimiento:', error);
    next(error);
  }
};

export const updateMantenimiento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const { estado, asignadoA, costo } = req.body;
    const [existing] = await db.select().from(mantenimiento).where(eq(mantenimiento.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Solicitud no encontrada'));

    const [updated] = await db.update(mantenimiento).set({
      ...(estado && { estado }),
      ...(asignadoA !== undefined && { asignadoA }),
      ...(costo !== undefined && { costo }),
      ...(estado === 'completado' && { fechaCompletado: new Date() }),
      ...(estado === 'en_proceso' && !existing.fechaInicio && { fechaInicio: new Date() }),
      updatedAt: new Date(),
    }).where(eq(mantenimiento.id, req.params.id)).returning();

    logger.info(`Mantenimiento updated: ${updated.id}`);
    res.status(200).json({ status: 'success', data: { mantenimiento: updated } });
  } catch (error) {
    logger.error('Error in updateMantenimiento:', error);
    next(error);
  }
};

export const deleteMantenimiento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [existing] = await db.select().from(mantenimiento).where(eq(mantenimiento.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Solicitud no encontrada'));

    await db.delete(mantenimiento).where(eq(mantenimiento.id, req.params.id));
    logger.info(`Mantenimiento deleted: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Solicitud eliminada' });
  } catch (error) {
    logger.error('Error in deleteMantenimiento:', error);
    next(error);
  }
};
