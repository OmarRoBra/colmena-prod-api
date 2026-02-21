import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../../db';
import { visitas, residentes, condominios, familiares } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getVisitasByCondominio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId } = req.params;
    const result = await db.select().from(visitas).where(eq(visitas.condominioId, condominioId));

    res.status(200).json({ status: 'success', results: result.length, visitas: result });
  } catch (error) {
    logger.error('Error in getVisitasByCondominio:', error);
    next(error);
  }
};

export const getVisitasByResidente = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { residenteId } = req.params;
    const result = await db.select().from(visitas).where(eq(visitas.residenteId, residenteId));

    res.status(200).json({ status: 'success', results: result.length, visitas: result });
  } catch (error) {
    logger.error('Error in getVisitasByResidente:', error);
    next(error);
  }
};

export const createVisita = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId, residenteId, nombreVisitante, fechaEsperada, familiarId, notas } = req.body;

    // Verify condominio exists
    const [condo] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) return next(AppError.notFound('Condominio no encontrado'));

    // Verify residente exists
    const [residente] = await db.select().from(residentes).where(eq(residentes.id, residenteId)).limit(1);
    if (!residente) return next(AppError.notFound('Residente no encontrado'));

    // Verify familiar if provided
    if (familiarId) {
      const [familiar] = await db.select().from(familiares).where(eq(familiares.id, familiarId)).limit(1);
      if (!familiar) return next(AppError.notFound('Familiar no encontrado'));
    }

    const qrToken = crypto.randomBytes(16).toString('hex');

    const [newVisita] = await db.insert(visitas).values({
      condominioId,
      residenteId,
      nombreVisitante,
      fechaEsperada: new Date(fechaEsperada),
      qrToken,
      ...(familiarId && { familiarId }),
      ...(notas && { notas }),
    }).returning();

    logger.info(`Visita created: ${newVisita.id} with QR token`);
    res.status(201).json({
      status: 'success',
      message: 'Visita creada exitosamente',
      visita: newVisita,
    });
  } catch (error) {
    logger.error('Error in createVisita:', error);
    next(error);
  }
};

export const scanQr = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { qrToken } = req.params;

    const [visita] = await db.select().from(visitas).where(eq(visitas.qrToken, qrToken)).limit(1);
    if (!visita) return next(AppError.notFound('QR inválido o visita no encontrada'));

    let nuevoEstado: string;

    if (visita.estado === 'pendiente') {
      nuevoEstado = 'llegada';
    } else if (visita.estado === 'llegada') {
      nuevoEstado = 'salida';
    } else {
      return next(AppError.badRequest('La visita ya fue registrada como completada (salida)'));
    }

    let updatedVisita: typeof visitas.$inferSelect;
    if (nuevoEstado === 'llegada') {
      [updatedVisita] = await db.update(visitas)
        .set({ estado: 'llegada', llegadaAt: new Date() })
        .where(eq(visitas.qrToken, qrToken))
        .returning();
    } else {
      [updatedVisita] = await db.update(visitas)
        .set({ estado: 'salida', salidaAt: new Date() })
        .where(eq(visitas.qrToken, qrToken))
        .returning();
    }

    // Fetch residente info for response
    const [residente] = await db.select().from(residentes).where(eq(residentes.id, visita.residenteId)).limit(1);

    logger.info(`QR scanned: visita ${visita.id} → estado ${nuevoEstado}`);
    res.status(200).json({
      status: 'success',
      message: `Visita registrada como: ${nuevoEstado}`,
      visita: updatedVisita,
      residente: residente ? { nombre: residente.nombre, unidadId: residente.unidadId } : null,
    });
  } catch (error) {
    logger.error('Error in scanQr:', error);
    next(error);
  }
};

export const getVisitaById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { id } = req.params;
    const [visita] = await db.select().from(visitas).where(eq(visitas.id, id)).limit(1);
    if (!visita) return next(AppError.notFound('Visita no encontrada'));

    res.status(200).json({ status: 'success', visita });
  } catch (error) {
    logger.error('Error in getVisitaById:', error);
    next(error);
  }
};
