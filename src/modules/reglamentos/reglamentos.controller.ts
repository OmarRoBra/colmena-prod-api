import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { reglamentos, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllReglamentos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await db.select().from(reglamentos);
    res.status(200).json({ status: 'success', results: all.length, data: { reglamentos: all } });
  } catch (error) {
    logger.error('Error in getAllReglamentos:', error);
    next(error);
  }
};

export const getReglamentoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [reglamento] = await db.select().from(reglamentos).where(eq(reglamentos.id, req.params.id)).limit(1);
    if (!reglamento) return next(AppError.notFound('Reglamento no encontrado'));
    res.status(200).json({ status: 'success', data: { reglamento } });
  } catch (error) {
    logger.error('Error in getReglamentoById:', error);
    next(error);
  }
};

export const createReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const { condominioId, titulo, contenido, categoria, vigenciaDesde, documento } = req.body;

    const [cond] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!cond) return next(AppError.notFound('Condominio no encontrado'));

    const [newReglamento] = await db.insert(reglamentos).values({
      condominioId, titulo, contenido, categoria, vigenciaDesde: new Date(vigenciaDesde), documento, activo: true,
    }).returning();

    logger.info(`Reglamento created: ${newReglamento.id}`);
    res.status(201).json({ status: 'success', message: 'Reglamento creado', data: { reglamento: newReglamento } });
  } catch (error) {
    logger.error('Error in createReglamento:', error);
    next(error);
  }
};

export const updateReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const { activo } = req.body;
    const [existing] = await db.select().from(reglamentos).where(eq(reglamentos.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Reglamento no encontrado'));

    const [updated] = await db.update(reglamentos).set({
      ...(activo !== undefined && { activo }),
      updatedAt: new Date(),
    }).where(eq(reglamentos.id, req.params.id)).returning();

    logger.info(`Reglamento updated: ${updated.id}`);
    res.status(200).json({ status: 'success', data: { reglamento: updated } });
  } catch (error) {
    logger.error('Error in updateReglamento:', error);
    next(error);
  }
};

export const deleteReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [existing] = await db.select().from(reglamentos).where(eq(reglamentos.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Reglamento no encontrado'));

    await db.update(reglamentos).set({ activo: false, updatedAt: new Date() }).where(eq(reglamentos.id, req.params.id));
    logger.info(`Reglamento deactivated: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Reglamento desactivado' });
  } catch (error) {
    logger.error('Error in deleteReglamento:', error);
    next(error);
  }
};
