import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { cargadores } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllCargadores = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.select().from(cargadores).orderBy(cargadores.createdAt);
    res.status(200).json({ status: 'success', results: result.length, data: { cargadores: result } });
  } catch (error) {
    logger.error('Error getting cargadores:', error);
    next(error);
  }
};

export const getCargadoresByCondominio = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const { condominioId } = req.params;
    const result = await db.select().from(cargadores)
      .where(eq(cargadores.condominioId, condominioId))
      .orderBy(cargadores.nombre);
    res.status(200).json({ status: 'success', results: result.length, data: { cargadores: result } });
  } catch (error) {
    logger.error('Error getting cargadores by condominio:', error);
    next(error);
  }
};

export const getCargadorById = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const [cargador] = await db.select().from(cargadores).where(eq(cargadores.id, req.params.id)).limit(1);
    if (!cargador) return next(AppError.notFound('Cargador no encontrado'));
    res.status(200).json({ status: 'success', data: { cargador } });
  } catch (error) {
    next(error);
  }
};

export const createCargador = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const { condominioId, nombre, ubicacion, potenciaKw, tipoConector, precioPorKwh, estado } = req.body;
    const [cargador] = await db.insert(cargadores).values({
      condominioId,
      nombre,
      ubicacion,
      potenciaKw,
      tipoConector: tipoConector ?? 'Type2',
      precioPorKwh,
      estado: estado ?? 'disponible',
    }).returning();
    logger.info(`Cargador created: ${cargador.id}`);
    res.status(201).json({ status: 'success', data: { cargador } });
  } catch (error) {
    logger.error('Error creating cargador:', error);
    next(error);
  }
};

export const updateCargador = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const { nombre, ubicacion, potenciaKw, tipoConector, precioPorKwh, estado, activo } = req.body;
    const [existing] = await db.select().from(cargadores).where(eq(cargadores.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Cargador no encontrado'));

    const [cargador] = await db.update(cargadores).set({
      ...(nombre !== undefined && { nombre }),
      ...(ubicacion !== undefined && { ubicacion }),
      ...(potenciaKw !== undefined && { potenciaKw }),
      ...(tipoConector !== undefined && { tipoConector }),
      ...(precioPorKwh !== undefined && { precioPorKwh }),
      ...(estado !== undefined && { estado }),
      ...(activo !== undefined && { activo }),
      updatedAt: new Date(),
    }).where(eq(cargadores.id, req.params.id)).returning();

    res.status(200).json({ status: 'success', data: { cargador } });
  } catch (error) {
    next(error);
  }
};

export const deleteCargador = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const [existing] = await db.select().from(cargadores).where(eq(cargadores.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Cargador no encontrado'));
    await db.delete(cargadores).where(eq(cargadores.id, req.params.id));
    res.status(200).json({ status: 'success', message: 'Cargador eliminado' });
  } catch (error) {
    next(error);
  }
};
