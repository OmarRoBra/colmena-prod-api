import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { asambleas, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllAsambleas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allAsambleas = await db.select().from(asambleas);
    res.status(200).json({ status: 'success', results: allAsambleas.length, data: { asambleas: allAsambleas } });
  } catch (error) {
    logger.error('Error in getAllAsambleas:', error);
    next(error);
  }
};

export const getAsambleasByCondominio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { condominioId } = req.params;
    const result = await db.select().from(asambleas).where(eq(asambleas.condominioId, condominioId));
    res.status(200).json({ status: 'success', results: result.length, data: { asambleas: result } });
  } catch (error) {
    logger.error('Error in getAsambleasByCondominio:', error);
    next(error);
  }
};

export const getAsambleaById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }
    const [asamblea] = await db.select().from(asambleas).where(eq(asambleas.id, req.params.id)).limit(1);
    if (!asamblea) return next(AppError.notFound('Asamblea no encontrada'));
    res.status(200).json({ status: 'success', data: { asamblea } });
  } catch (error) {
    logger.error('Error in getAsambleaById:', error);
    next(error);
  }
};

export const createAsamblea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }
    const { condominioId, titulo, descripcion, fecha, ubicacion, tipo } = req.body;

    const [condominio] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condominio) return next(AppError.notFound('Condominio no encontrado'));

    const [newAsamblea] = await db.insert(asambleas).values({
      condominioId, titulo, descripcion, fecha: new Date(fecha), ubicacion, tipo, estado: 'programada',
    }).returning();

    logger.info(`Asamblea created: ${newAsamblea.id}`);
    res.status(201).json({ status: 'success', message: 'Asamblea creada exitosamente', data: { asamblea: newAsamblea } });
  } catch (error) {
    logger.error('Error in createAsamblea:', error);
    next(error);
  }
};

export const updateAsamblea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }
    const { estado, acuerdos } = req.body;
    const [existing] = await db.select().from(asambleas).where(eq(asambleas.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Asamblea no encontrada'));

    const [updated] = await db.update(asambleas).set({
      ...(estado && { estado }),
      ...(acuerdos !== undefined && { acuerdos }),
      updatedAt: new Date(),
    }).where(eq(asambleas.id, req.params.id)).returning();

    logger.info(`Asamblea updated: ${updated.id}`);
    res.status(200).json({ status: 'success', message: 'Asamblea actualizada', data: { asamblea: updated } });
  } catch (error) {
    logger.error('Error in updateAsamblea:', error);
    next(error);
  }
};

export const deleteAsamblea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }
    const [existing] = await db.select().from(asambleas).where(eq(asambleas.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Asamblea no encontrada'));

    await db.delete(asambleas).where(eq(asambleas.id, req.params.id));
    logger.info(`Asamblea deleted: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Asamblea eliminada' });
  } catch (error) {
    logger.error('Error in deleteAsamblea:', error);
    next(error);
  }
};
