import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { unidades, condominios, usuarios } from '../../db/schema';
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

    const { condominioId } = req.params;

    // Verify condominio exists
    const [condominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);

    if (!condominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const unidadesCondominio = await db
      .select()
      .from(unidades)
      .where(eq(unidades.condominioId, condominioId));

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
      condominioId,
      numero,
      propietarioId,
      tipo,
      metrosCuadrados,
      habitaciones,
      banos,
      estacionamientos,
      cuotaMantenimiento,
      estadoPago,
      notas,
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

    // If propietarioId is provided, verify it exists
    if (propietarioId) {
      const [propietario] = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, propietarioId))
        .limit(1);

      if (!propietario) {
        return next(AppError.notFound('Propietario no encontrado'));
      }
    }

    // Check if unit number already exists in this condominio
    const [existingUnidad] = await db
      .select()
      .from(unidades)
      .where(
        and(
          eq(unidades.condominioId, condominioId),
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
        condominioId,
        numero,
        propietarioId,
        tipo,
        metrosCuadrados,
        habitaciones,
        banos,
        estacionamientos: estacionamientos || 0,
        cuotaMantenimiento,
        estadoPago: estadoPago || 'al_corriente',
        notas,
      })
      .returning();

    logger.info(`Unidad created: ${newUnidad.numero} in condominio ${condominioId}`);

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
      propietarioId,
      tipo,
      metrosCuadrados,
      habitaciones,
      banos,
      estacionamientos,
      cuotaMantenimiento,
      estadoPago,
      notas,
      activo,
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

    // If propietarioId is provided, verify it exists
    if (propietarioId) {
      const [propietario] = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, propietarioId))
        .limit(1);

      if (!propietario) {
        return next(AppError.notFound('Propietario no encontrado'));
      }
    }

    // If numero is being updated, check for duplicates
    if (numero && numero !== existingUnidad.numero) {
      const [duplicateUnidad] = await db
        .select()
        .from(unidades)
        .where(
          and(
            eq(unidades.condominioId, existingUnidad.condominioId),
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
        ...(propietarioId !== undefined && { propietarioId }),
        ...(tipo && { tipo }),
        ...(metrosCuadrados !== undefined && { metrosCuadrados }),
        ...(habitaciones !== undefined && { habitaciones }),
        ...(banos !== undefined && { banos }),
        ...(estacionamientos !== undefined && { estacionamientos }),
        ...(cuotaMantenimiento !== undefined && { cuotaMantenimiento }),
        ...(estadoPago && { estadoPago }),
        ...(notas !== undefined && { notas }),
        ...(activo !== undefined && { activo }),
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
 * Delete unidad (soft delete)
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

    // Soft delete (deactivate unidad)
    await db
      .update(unidades)
      .set({
        activo: false,
        updatedAt: new Date(),
      })
      .where(eq(unidades.id, id));

    logger.info(`Unidad deactivated: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Unidad desactivada exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteUnidad:', error);
    next(error);
  }
};
