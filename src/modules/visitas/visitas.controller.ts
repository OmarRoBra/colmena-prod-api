import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../../db';
import { visitas, residentes, condominios, familiares } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { notifyVisitCreated, notifyVisitStatusChanged } from '../../services/automation.service';

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

    const { condominioId, residenteId, nombreVisitante, fechaEsperada, familiarId, notas, tipo, cantidadPersonas } = req.body;

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
      tipo: tipo || 'visita',
      cantidadPersonas: cantidadPersonas ? Number(cantidadPersonas) : 1,
      fechaEsperada: new Date(fechaEsperada),
      qrToken,
      ...(familiarId && { familiarId }),
      ...(notas && { notas }),
    }).returning();

    logger.info(`Visita created: ${newVisita.id} with QR token`);
    void notifyVisitCreated(newVisita).catch((automationError) => {
      logger.error('Visit automation failed:', automationError);
    });
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

    // Check if it's a familiar permanent QR (prefixed with FAM-)
    if (qrToken.startsWith('FAM-')) {
      const [familiar] = await db.select().from(familiares).where(eq(familiares.qrToken, qrToken)).limit(1);
      if (!familiar) return next(AppError.notFound('QR de familiar inválido'));

      const [residente] = await db.select().from(residentes).where(eq(residentes.id, familiar.residenteId)).limit(1);

      // Auto-create a visit entry for tracking
      const visitQrToken = crypto.randomBytes(16).toString('hex');
      const [autoVisita] = await db.insert(visitas).values({
        condominioId: familiar.condominioId,
        residenteId: familiar.residenteId,
        familiarId: familiar.id,
        nombreVisitante: familiar.nombre,
        tipo: 'familiar',
        cantidadPersonas: 1,
        fechaEsperada: new Date(),
        qrToken: visitQrToken,
        estado: 'llegada',
        llegadaAt: new Date(),
      }).returning();

      logger.info(`Familiar QR scanned: ${familiar.nombre} (${familiar.id}) → auto-visit ${autoVisita.id}`);
      void notifyVisitCreated(autoVisita).catch((automationError) => {
        logger.error('Family visit automation failed:', automationError);
      });
      return res.status(200).json({
        status: 'success',
        message: `Familiar autorizado: ${familiar.nombre}`,
        tipo: 'familiar',
        familiar: { id: familiar.id, nombre: familiar.nombre, relacion: familiar.relacion },
        visita: autoVisita,
        residente: residente ? { nombre: residente.nombre, unidadId: residente.unidadId } : null,
      });
    }

    // Regular visit QR
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
    void notifyVisitStatusChanged(updatedVisita, visita).catch((automationError) => {
      logger.error('Visit status automation failed:', automationError);
    });
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
