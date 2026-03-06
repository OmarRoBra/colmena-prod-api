import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { sesionesCarga, cargadores } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getSesionesByCondominio = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const result = await db.select().from(sesionesCarga)
      .where(eq(sesionesCarga.condominioId, req.params.condominioId))
      .orderBy(sesionesCarga.createdAt);
    res.status(200).json({ status: 'success', results: result.length, data: { sesiones: result } });
  } catch (error) {
    next(error);
  }
};

export const getSesionesByResidente = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const result = await db.select().from(sesionesCarga)
      .where(eq(sesionesCarga.residenteId, req.params.residenteId))
      .orderBy(sesionesCarga.createdAt);
    res.status(200).json({ status: 'success', results: result.length, data: { sesiones: result } });
  } catch (error) {
    next(error);
  }
};

export const getSesionesActivas = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const result = await db.select().from(sesionesCarga)
      .where(and(
        eq(sesionesCarga.condominioId, req.params.condominioId),
        eq(sesionesCarga.estado, 'activa')
      ));
    res.status(200).json({ status: 'success', results: result.length, data: { sesiones: result } });
  } catch (error) {
    next(error);
  }
};

export const getSesionById = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const [sesion] = await db.select().from(sesionesCarga).where(eq(sesionesCarga.id, req.params.id)).limit(1);
    if (!sesion) return next(AppError.notFound('Sesión no encontrada'));
    res.status(200).json({ status: 'success', data: { sesion } });
  } catch (error) {
    next(error);
  }
};

export const createSesion = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const { condominioId, cargadorId, residenteId, unidadId, modoCarga, cantidadSolicitada } = req.body;

    // Check charger availability
    const [cargador] = await db.select().from(cargadores).where(eq(cargadores.id, cargadorId)).limit(1);
    if (!cargador) return next(AppError.notFound('Cargador no encontrado'));
    if (cargador.estado !== 'disponible') {
      return next(AppError.badRequest(`Cargador no disponible. Estado actual: ${cargador.estado}`));
    }

    // Calculate estimated cost
    const precioKwh = parseFloat(cargador.precioPorKwh ?? '0');
    const potenciaKw = parseFloat(cargador.potenciaKw ?? '0');
    const cantidad = parseFloat(cantidadSolicitada);
    let kwhEstimados = cantidad;
    if (modoCarga === 'porcentaje') kwhEstimados = (cantidad / 100) * 60;
    else if (modoCarga === 'tiempo') kwhEstimados = (cantidad / 60) * potenciaKw;
    const costoEstimado = (kwhEstimados * precioKwh).toFixed(2);

    const [sesion] = await db.insert(sesionesCarga).values({
      condominioId,
      cargadorId,
      residenteId: residenteId ?? null,
      unidadId: unidadId ?? null,
      modoCarga,
      cantidadSolicitada,
      costoEstimado,
      estado: 'activa',
    }).returning();

    // Mark charger as in use
    await db.update(cargadores).set({ estado: 'en_uso', updatedAt: new Date() })
      .where(eq(cargadores.id, cargadorId));

    logger.info(`Sesión de carga iniciada: ${sesion.id}`);
    res.status(201).json({ status: 'success', data: { sesion } });
  } catch (error) {
    logger.error('Error creating sesión de carga:', error);
    next(error);
  }
};

export const updateSesion = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Validation error', errors.array()));

  try {
    const { estado, energiaEntregada, costoFinal, finDt } = req.body;
    const [existing] = await db.select().from(sesionesCarga).where(eq(sesionesCarga.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Sesión no encontrada'));

    const isCompleting = estado === 'completada' || estado === 'cancelada';

    const [sesion] = await db.update(sesionesCarga).set({
      ...(estado !== undefined && { estado }),
      ...(energiaEntregada !== undefined && { energiaEntregada }),
      ...(costoFinal !== undefined && { costoFinal }),
      finDt: isCompleting ? (finDt ? new Date(finDt) : new Date()) : undefined,
      updatedAt: new Date(),
    }).where(eq(sesionesCarga.id, req.params.id)).returning();

    // If completing/cancelling, free the charger
    if (isCompleting && existing.cargadorId) {
      await db.update(cargadores).set({ estado: 'disponible', updatedAt: new Date() })
        .where(eq(cargadores.id, existing.cargadorId));
    }

    res.status(200).json({ status: 'success', data: { sesion } });
  } catch (error) {
    next(error);
  }
};
