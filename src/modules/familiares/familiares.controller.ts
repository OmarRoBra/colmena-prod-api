import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
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

    res.status(200).json({ status: 'success', data: { results: result.length, familiares: result } });
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

    // Generate a permanent QR token for the familiar
    const qrToken = `FAM-${crypto.randomBytes(12).toString('hex')}`;

    const [newFamiliar] = await db.insert(familiares).values({
      residenteId,
      condominioId,
      nombre,
      relacion,
      qrToken,
      ...(telefono && { telefono }),
    }).returning();

    logger.info(`Familiar created: ${newFamiliar.id} for residente ${residenteId} with QR`);
    res.status(201).json({ status: 'success', data: { message: 'Familiar agregado exitosamente', familiar: newFamiliar } });
  } catch (error) {
    logger.error('Error in createFamiliar:', error);
    next(error);
  }
};

export const updateFamiliar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { id } = req.params;
    const { nombre, relacion, telefono } = req.body;

    const [existing] = await db.select().from(familiares).where(eq(familiares.id, id)).limit(1);
    if (!existing) return next(AppError.notFound('Familiar no encontrado'));

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (relacion !== undefined) updateData.relacion = relacion;
    if (telefono !== undefined) updateData.telefono = telefono;

    // If familiar doesn't have a QR token yet, generate one
    if (!existing.qrToken) {
      updateData.qrToken = `FAM-${crypto.randomBytes(12).toString('hex')}`;
    }

    const [updated] = await db.update(familiares).set(updateData).where(eq(familiares.id, id)).returning();

    logger.info(`Familiar updated: ${id}`);
    res.status(200).json({ status: 'success', data: { message: 'Familiar actualizado exitosamente', familiar: updated } });
  } catch (error) {
    logger.error('Error in updateFamiliar:', error);
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
    res.status(200).json({ status: 'success', data: { message: 'Familiar eliminado exitosamente' } });
  } catch (error) {
    logger.error('Error in deleteFamiliar:', error);
    next(error);
  }
};
