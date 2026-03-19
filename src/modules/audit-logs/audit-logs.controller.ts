import { Request, Response, NextFunction } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../../db';
import { auditLogs } from '../../db/schema';
import { AppError } from '../../utils/appError';

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { condominioId, entidad, usuarioId, desde, hasta } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [];
    if (condominioId) conditions.push(eq(auditLogs.condominioId, condominioId));
    if (entidad) conditions.push(eq(auditLogs.entidad, entidad));
    if (usuarioId) conditions.push(eq(auditLogs.usuarioId, usuarioId));
    if (desde) conditions.push(gte(auditLogs.createdAt, new Date(desde)));
    if (hasta) conditions.push(lte(auditLogs.createdAt, new Date(hasta)));

    const result = conditions.length > 0
      ? await db.select().from(auditLogs).where(and(...conditions)).orderBy(auditLogs.createdAt)
      : await db.select().from(auditLogs).orderBy(auditLogs.createdAt);

    res.status(200).json({ status: 'success', results: result.length, data: { logs: result } });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, req.params.id)).limit(1);
    if (!log) return next(AppError.notFound('Registro de auditoría no encontrado'));
    res.status(200).json({ status: 'success', data: { log } });
  } catch (error) {
    next(error);
  }
};
