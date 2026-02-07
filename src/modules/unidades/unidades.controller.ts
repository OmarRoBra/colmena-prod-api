import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { unidades, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all unidades
 */
export const getAllUnidades = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allUnidades = await db.select().from(unidades);

    res.status(200).json({
      status: 'success',
      results: allUnidades.length,
      data: { unidades: allUnidades },
    });
  } catch (error) {
    logger.error('Error in getAllUnidades:', error);
    next(error);
  }
};

/**
 * Get unidad by ID
 */
export const getUnidadById = async (
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

    const [unidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, id))
      .limit(1);

    if (!unidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    res.status(200).json({
      status: 'success',
      data: { unidad },
    });
  } catch (error) {
    logger.error('Error in getUnidadById:', error);
    next(error);
  }
};

/**
 * Get unidades by condominio ID
 */
export const getUnidadesByCondominio = async (
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

    const { condominiumId } = req.params;

    // Verify condominio exists
    const [condominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominiumId))
      .limit(1);

    if (!condominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const unidadesCondominio = await db
      .select()
      .from(unidades)
      .where(eq(unidades.condominiumId, condominiumId));

    res.status(200).json({
      status: 'success',
      results: unidadesCondominio.length,
      data: { unidades: unidadesCondominio },
    });
  } catch (error) {
    logger.error('Error in getUnidadesByCondominio:', error);
    next(error);
  }
};

/**
 * Create a new unidad
 */
export const createUnidad = async (
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
      condominiumId,
      numero,
      tipo,
      area,
      propietario,
      estado,
      habitaciones,
      banos,
      estacionamientos,
      cuotaMantenimiento,
      notas,
    } = req.body;

    // Verify condominio exists
    const [condominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominiumId))
      .limit(1);

    if (!condominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    // Check if unit number already exists in this condominio
    const [existingUnidad] = await db
      .select()
      .from(unidades)
      .where(
        and(
          eq(unidades.condominiumId, condominiumId),
          eq(unidades.numero, numero)
        )
      )
      .limit(1);

    if (existingUnidad) {
      return next(
        AppError.conflict(
          'Ya existe una unidad con este número en el condominio'
        )
      );
    }

    // Create unidad
    const [newUnidad] = await db
      .insert(unidades)
      .values({
        condominiumId,
        numero,
        tipo,
        area,
        propietario,
        estado: estado || 'Vacío',
        habitaciones: habitaciones || 0,
        banos: banos || 0,
        estacionamientos: estacionamientos || 0,
        cuotaMantenimiento,
        notas,
      })
      .returning();

    logger.info(
      `Unidad created: ${newUnidad.numero} in condominio ${condominiumId}`
    );

    res.status(201).json({
      status: 'success',
      message: 'Unidad creada exitosamente',
      data: { unidad: newUnidad },
    });
  } catch (error) {
    logger.error('Error in createUnidad:', error);
    next(error);
  }
};

/**
 * Update unidad
 */
export const updateUnidad = async (
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
      numero,
      tipo,
      area,
      propietario,
      estado,
      habitaciones,
      banos,
      estacionamientos,
      cuotaMantenimiento,
      notas,
    } = req.body;

    // Check if unidad exists
    const [existingUnidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, id))
      .limit(1);

    if (!existingUnidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    // If numero is being updated, check for duplicates
    if (numero && numero !== existingUnidad.numero) {
      const [duplicateUnidad] = await db
        .select()
        .from(unidades)
        .where(
          and(
            eq(unidades.condominiumId, existingUnidad.condominiumId),
            eq(unidades.numero, numero)
          )
        )
        .limit(1);

      if (duplicateUnidad) {
        return next(
          AppError.conflict(
            'Ya existe una unidad con este número en el condominio'
          )
        );
      }
    }

    // Update unidad
    const [updatedUnidad] = await db
      .update(unidades)
      .set({
        ...(numero && { numero }),
        ...(tipo && { tipo }),
        ...(area !== undefined && { area }),
        ...(propietario !== undefined && { propietario }),
        ...(estado !== undefined && { estado }),
        ...(habitaciones !== undefined && { habitaciones }),
        ...(banos !== undefined && { banos }),
        ...(estacionamientos !== undefined && { estacionamientos }),
        ...(cuotaMantenimiento !== undefined && { cuotaMantenimiento }),
        ...(notas !== undefined && { notas }),
        updatedAt: new Date(),
      })
      .where(eq(unidades.id, id))
      .returning();

    logger.info(`Unidad updated: ${updatedUnidad.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Unidad actualizada exitosamente',
      data: { unidad: updatedUnidad },
    });
  } catch (error) {
    logger.error('Error in updateUnidad:', error);
    next(error);
  }
};

/**
 * Delete unidad
 */
export const deleteUnidad = async (
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

    // Check if unidad exists
    const [existingUnidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, id))
      .limit(1);

    if (!existingUnidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    // Hard delete the unidad
    await db
      .delete(unidades)
      .where(eq(unidades.id, id));

    logger.info(`Unidad deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Unidad eliminada exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteUnidad:', error);
    next(error);
  }
};
