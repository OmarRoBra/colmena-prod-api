import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { mantenimiento, condominios, usuarios, residentes } from '../../db/schema';
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

    // Check if user exists in usuarios table (might only exist in Supabase auth)
    const [userExists] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, userId)).limit(1);

    const { residenteId } = req.body;
    const isResident = req.user?.rol === 'resident';

    // If resident, look up their residenteId from their usuarioId
    let resolvedResidenteId = residenteId;
    if (isResident && !resolvedResidenteId) {
      const [residente] = await db.select({ id: residentes.id }).from(residentes).where(eq(residentes.usuarioId, userId)).limit(1);
      resolvedResidenteId = residente?.id;
    }

    const [newMant] = await db.insert(mantenimiento).values({
      condominioId, unidadId, titulo, descripcion, categoria,
      prioridad: prioridad || 'media', estado: 'pendiente',
      tipo: isResident ? 'incidente' : 'mantenimiento',
      ...(userExists ? { solicitanteId: userId } : {}),
      ...(resolvedResidenteId ? { residenteId: resolvedResidenteId } : {}),
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

export const getMantenimientoByResidente = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { residenteId } = req.params;
    const result = await db.select().from(mantenimiento).where(eq(mantenimiento.residenteId, residenteId));

    res.status(200).json({ status: 'success', results: result.length, data: { mantenimiento: result } });
  } catch (error) {
    logger.error('Error in getMantenimientoByResidente:', error);
    next(error);
  }
};

export const getMantenimientoByCondominio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { condominioId } = req.params;
    const result = await db.select().from(mantenimiento).where(eq(mantenimiento.condominioId, condominioId));
    res.status(200).json({ status: 'success', results: result.length, data: { mantenimiento: result } });
  } catch (error) {
    logger.error('Error in getMantenimientoByCondominio:', error);
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
