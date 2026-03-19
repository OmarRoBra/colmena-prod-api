import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { notificaciones } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { createNotification } from '../../services/notification-delivery.service';

export const getMyNotificaciones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(AppError.unauthorized('No autenticado'));

    const result = await db.select().from(notificaciones)
      .where(eq(notificaciones.usuarioId, userId))
      .orderBy(notificaciones.createdAt);

    res.status(200).json({ status: 'success', results: result.length, data: { notificaciones: result } });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(AppError.unauthorized('No autenticado'));

    const result = await db.select().from(notificaciones)
      .where(and(
        eq(notificaciones.usuarioId, userId),
        eq(notificaciones.leida, false)
      ));

    res.status(200).json({ status: 'success', data: { count: result.length } });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const userId = req.user?.userId;
    const [notif] = await db.select().from(notificaciones).where(eq(notificaciones.id, req.params.id)).limit(1);
    if (!notif) return next(AppError.notFound('Notificación no encontrada'));
    if (notif.usuarioId !== userId) return next(AppError.forbidden('No autorizado'));

    const [updated] = await db.update(notificaciones).set({
      leida: true,
      leidaAt: new Date(),
    }).where(eq(notificaciones.id, req.params.id)).returning();

    res.status(200).json({ status: 'success', data: { notificacion: updated } });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(AppError.unauthorized('No autenticado'));

    await db.update(notificaciones).set({
      leida: true,
      leidaAt: new Date(),
    }).where(and(
      eq(notificaciones.usuarioId, userId),
      eq(notificaciones.leida, false)
    ));

    res.status(200).json({ status: 'success', message: 'Notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotificacion = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const userId = req.user?.userId;
    const [notif] = await db.select().from(notificaciones).where(eq(notificaciones.id, req.params.id)).limit(1);
    if (!notif) return next(AppError.notFound('Notificación no encontrada'));
    if (notif.usuarioId !== userId) return next(AppError.forbidden('No autorizado'));

    await db.delete(notificaciones).where(eq(notificaciones.id, req.params.id));
    res.status(200).json({ status: 'success', message: 'Notificación eliminada' });
  } catch (error) {
    next(error);
  }
};

export const createNotificacion = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const { usuarioId, condominioId, titulo, mensaje, tipo, accionUrl } = req.body;
    const notif = await createNotification(usuarioId, condominioId ?? null, {
      titulo,
      mensaje,
      tipo: tipo ?? 'info',
      accionUrl: accionUrl ?? null,
    });

    res.status(201).json({ status: 'success', data: { notificacion: notif } });
  } catch (error) {
    logger.error('Error creating notificacion:', error);
    next(error);
  }
};
