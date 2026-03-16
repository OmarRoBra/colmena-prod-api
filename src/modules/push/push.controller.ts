import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { pushSubscriptions } from '../../db/schema';
import { AppError } from '../../utils/appError';
import { config } from '../../config/env';
import logger from '../../utils/logger';

export const getVapidKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { publicKey: config.vapid.publicKey },
    });
  } catch (error) {
    next(error);
  }
};

export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(AppError.unauthorized('No autenticado'));

    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return next(AppError.badRequest('Subscription data incompleta'));
    }

    // Upsert: delete existing subscription with same endpoint for this user, then insert
    await db.delete(pushSubscriptions).where(
      and(
        eq(pushSubscriptions.usuarioId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );

    const [sub] = await db.insert(pushSubscriptions).values({
      usuarioId: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }).returning();

    logger.info(`Push subscription created for user ${userId}`);
    res.status(201).json({ status: 'success', data: { subscription: sub } });
  } catch (error) {
    logger.error('Error creating push subscription:', error);
    next(error);
  }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(AppError.unauthorized('No autenticado'));

    const { endpoint } = req.body;
    if (!endpoint) {
      return next(AppError.badRequest('Endpoint requerido'));
    }

    await db.delete(pushSubscriptions).where(
      and(
        eq(pushSubscriptions.usuarioId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );

    logger.info(`Push subscription removed for user ${userId}`);
    res.status(200).json({ status: 'success', message: 'Suscripción eliminada' });
  } catch (error) {
    next(error);
  }
};
