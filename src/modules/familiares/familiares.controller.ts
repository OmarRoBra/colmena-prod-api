import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { familiares, residentes, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getFamiliaresByResidente = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { residenteId } = req.params;

    const result = await db.select().from(familiares).where(eq(familiares.residenteId, residenteId));

    res.status(200).json({ status: 'success', results: result.length, familiares: result });
  } catch (error) {
    logger.error('Error in getFamiliaresByResidente:', error);
    next(error);
  }
};

export const createFamiliar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { residenteId, condominioId, nombre, relacion, telefono } = req.body;

    // Verify residente exists
    const [residente] = await db.select().from(residentes).where(eq(residentes.id, residenteId)).limit(1);
    if (!residente) return next(AppError.notFound('Residente no encontrado'));

    // Verify condominio exists
    const [condo] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) return next(AppError.notFound('Condominio no encontrado'));

    const [newFamiliar] = await db.insert(familiares).values({
      residenteId,
      condominioId,
      nombre,
      relacion,
      ...(telefono && { telefono }),
    }).returning();

    logger.info(`Familiar created: ${newFamiliar.id} for residente ${residenteId}`);
    res.status(201).json({ status: 'success', message: 'Familiar agregado exitosamente', familiar: newFamiliar });
  } catch (error) {
    logger.error('Error in createFamiliar:', error);
    next(error);
  }
};

export const deleteFamiliar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { id } = req.params;

    const [existing] = await db.select().from(familiares).where(eq(familiares.id, id)).limit(1);
    if (!existing) return next(AppError.notFound('Familiar no encontrado'));

    await db.delete(familiares).where(eq(familiares.id, id));

    logger.info(`Familiar deleted: ${id}`);
    res.status(200).json({ status: 'success', message: 'Familiar eliminado exitosamente' });
  } catch (error) {
    logger.error('Error in deleteFamiliar:', error);
    next(error);
  }
};
