import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { trabajadores, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllTrabajadores = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await db.select().from(trabajadores);
    res.status(200).json({ status: 'success', results: all.length, data: { trabajadores: all } });
  } catch (error) {
    logger.error('Error in getAllTrabajadores:', error);
    next(error);
  }
};

export const getTrabajadorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [trabajador] = await db.select().from(trabajadores).where(eq(trabajadores.id, req.params.id)).limit(1);
    if (!trabajador) return next(AppError.notFound('Trabajador no encontrado'));
    res.status(200).json({ status: 'success', data: { trabajador } });
  } catch (error) {
    logger.error('Error in getTrabajadorById:', error);
    next(error);
  }
};

export const createTrabajador = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const { condominioId, nombre, apellido, puesto, telefono, email, salario, fechaContratacion } = req.body;

    const [cond] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!cond) return next(AppError.notFound('Condominio no encontrado'));

    const [newTrabajador] = await db.insert(trabajadores).values({
      condominioId, nombre, apellido, puesto, telefono, email: email?.toLowerCase(), salario,
      fechaContratacion: new Date(fechaContratacion), activo: true,
    }).returning();

    logger.info(`Trabajador created: ${newTrabajador.id}`);
    res.status(201).json({ status: 'success', message: 'Trabajador creado', data: { trabajador: newTrabajador } });
  } catch (error) {
    logger.error('Error in createTrabajador:', error);
    next(error);
  }
};

export const updateTrabajador = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const { puesto, telefono, salario, activo } = req.body;
    const [existing] = await db.select().from(trabajadores).where(eq(trabajadores.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Trabajador no encontrado'));

    const [updated] = await db.update(trabajadores).set({
      ...(puesto && { puesto }),
      ...(telefono !== undefined && { telefono }),
      ...(salario !== undefined && { salario }),
      ...(activo !== undefined && { activo }),
      updatedAt: new Date(),
    }).where(eq(trabajadores.id, req.params.id)).returning();

    logger.info(`Trabajador updated: ${updated.id}`);
    res.status(200).json({ status: 'success', data: { trabajador: updated } });
  } catch (error) {
    logger.error('Error in updateTrabajador:', error);
    next(error);
  }
};

export const deleteTrabajador = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [existing] = await db.select().from(trabajadores).where(eq(trabajadores.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Trabajador no encontrado'));

    await db.update(trabajadores).set({ activo: false, updatedAt: new Date() }).where(eq(trabajadores.id, req.params.id));
    logger.info(`Trabajador deactivated: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Trabajador desactivado' });
  } catch (error) {
    logger.error('Error in deleteTrabajador:', error);
    next(error);
  }
};
