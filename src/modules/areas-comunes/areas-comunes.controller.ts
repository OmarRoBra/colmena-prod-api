import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { areasComunes, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all areas comunes for a condominium
 */
export const getAreasByCondominio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { condominioId } = req.params;

    const areas = await db
      .select()
      .from(areasComunes)
      .where(eq(areasComunes.condominioId, condominioId));

    res.status(200).json({
      status: 'success',
      results: areas.length,
      data: { areasComunes: areas },
    });
  } catch (error) {
    logger.error('Error in getAreasByCondominio:', error);
    next(error);
  }
};

/**
 * Get area comun by ID
 */
export const getAreaById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const [area] = await db
      .select()
      .from(areasComunes)
      .where(eq(areasComunes.id, req.params.id))
      .limit(1);

    if (!area) {
      return next(AppError.notFound('Área común no encontrada'));
    }

    res.status(200).json({
      status: 'success',
      data: { areaComun: area },
    });
  } catch (error) {
    logger.error('Error in getAreaById:', error);
    next(error);
  }
};

/**
 * Create a new area comun
 */
export const createArea = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const {
      condominioId,
      nombre,
      descripcion,
      tipo,
      capacidad,
      costo,
      requiereAprobacion,
      horaApertura,
      horaCierre,
    } = req.body;

    // Verify condominio exists
    const [condominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);

    if (!condominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const [newArea] = await db
      .insert(areasComunes)
      .values({
        condominioId,
        nombre,
        descripcion,
        tipo,
        capacidad: capacidad || 0,
        costo: costo || '0',
        requiereAprobacion: requiereAprobacion ?? true,
        horaApertura: horaApertura || '08:00',
        horaCierre: horaCierre || '22:00',
      })
      .returning();

    logger.info(`Area comun created: ${newArea.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Área común creada exitosamente',
      data: { areaComun: newArea },
    });
  } catch (error) {
    logger.error('Error in createArea:', error);
    next(error);
  }
};

/**
 * Update area comun
 */
export const updateArea = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { id } = req.params;
    const {
      nombre,
      descripcion,
      tipo,
      capacidad,
      costo,
      requiereAprobacion,
      horaApertura,
      horaCierre,
      activo,
    } = req.body;

    const [existing] = await db
      .select()
      .from(areasComunes)
      .where(eq(areasComunes.id, id))
      .limit(1);

    if (!existing) {
      return next(AppError.notFound('Área común no encontrada'));
    }

    const [updated] = await db
      .update(areasComunes)
      .set({
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tipo !== undefined && { tipo }),
        ...(capacidad !== undefined && { capacidad }),
        ...(costo !== undefined && { costo }),
        ...(requiereAprobacion !== undefined && { requiereAprobacion }),
        ...(horaApertura !== undefined && { horaApertura }),
        ...(horaCierre !== undefined && { horaCierre }),
        ...(activo !== undefined && { activo }),
        updatedAt: new Date(),
      })
      .where(eq(areasComunes.id, id))
      .returning();

    logger.info(`Area comun updated: ${updated.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Área común actualizada',
      data: { areaComun: updated },
    });
  } catch (error) {
    logger.error('Error in updateArea:', error);
    next(error);
  }
};

/**
 * Delete area comun
 */
export const deleteArea = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(areasComunes)
      .where(eq(areasComunes.id, id))
      .limit(1);

    if (!existing) {
      return next(AppError.notFound('Área común no encontrada'));
    }

    await db.delete(areasComunes).where(eq(areasComunes.id, id));
    logger.info(`Area comun deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Área común eliminada',
    });
  } catch (error) {
    logger.error('Error in deleteArea:', error);
    next(error);
  }
};
