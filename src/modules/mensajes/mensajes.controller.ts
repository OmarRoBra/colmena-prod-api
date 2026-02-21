import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { mensajes, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllMensajes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db.select().from(mensajes);

    res.status(200).json({
      status: 'success',
      results: result.length,
      mensajes: result,
    });
  } catch (error) {
    logger.error('Error in getAllMensajes:', error);
    next(error);
  }
};

export const getMensajesByCondominio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId } = req.params;

    const result = await db
      .select()
      .from(mensajes)
      .where(eq(mensajes.condominioId, condominioId));

    res.status(200).json({
      status: 'success',
      results: result.length,
      mensajes: result,
    });
  } catch (error) {
    logger.error('Error in getMensajesByCondominio:', error);
    next(error);
  }
};

export const getMensajeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;
    const [mensaje] = await db.select().from(mensajes).where(eq(mensajes.id, id)).limit(1);

    if (!mensaje) {
      return next(AppError.notFound('Mensaje no encontrado'));
    }

    res.status(200).json({ status: 'success', mensaje });
  } catch (error) {
    logger.error('Error in getMensajeById:', error);
    next(error);
  }
};

export const createMensaje = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId, de, para, asunto, contenido, prioridad } = req.body;

    const [condo] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const [newMensaje] = await db
      .insert(mensajes)
      .values({
        condominioId,
        de,
        para,
        asunto,
        contenido,
        prioridad: prioridad || 'normal',
        estado: 'enviado',
        fecha: new Date(),
      })
      .returning();

    logger.info(`Mensaje created: ${newMensaje.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Mensaje creado exitosamente',
      mensaje: newMensaje,
    });
  } catch (error) {
    logger.error('Error in createMensaje:', error);
    next(error);
  }
};

export const updateMensaje = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;
    const { de, para, asunto, contenido, estado, prioridad } = req.body;

    const [existing] = await db.select().from(mensajes).where(eq(mensajes.id, id)).limit(1);
    if (!existing) {
      return next(AppError.notFound('Mensaje no encontrado'));
    }

    const [updated] = await db
      .update(mensajes)
      .set({
        ...(de !== undefined && { de }),
        ...(para !== undefined && { para }),
        ...(asunto !== undefined && { asunto }),
        ...(contenido !== undefined && { contenido }),
        ...(estado !== undefined && { estado }),
        ...(prioridad !== undefined && { prioridad }),
        updatedAt: new Date(),
      })
      .where(eq(mensajes.id, id))
      .returning();

    logger.info(`Mensaje updated: ${updated.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Mensaje actualizado exitosamente',
      mensaje: updated,
    });
  } catch (error) {
    logger.error('Error in updateMensaje:', error);
    next(error);
  }
};

export const deleteMensaje = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;

    const [existing] = await db.select().from(mensajes).where(eq(mensajes.id, id)).limit(1);
    if (!existing) {
      return next(AppError.notFound('Mensaje no encontrado'));
    }

    await db.delete(mensajes).where(eq(mensajes.id, id));

    logger.info(`Mensaje deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Mensaje eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteMensaje:', error);
    next(error);
  }
};
