import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, count, and } from 'drizzle-orm';
import { db } from '../../db';
import { condominios, usuarios, unidades } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all condominios
 */
export const getAllCondominios = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get all condominios with occupation calculation
    const allCondominios = await db
      .select({
        id: condominios.id,
        nombre: condominios.nombre,
        direccion: condominios.direccion,
        ciudad: condominios.ciudad,
        estado: condominios.estado,
        codigoPostal: condominios.codigoPostal,
        telefono: condominios.telefono,
        email: condominios.email,
        totalUnidades: condominios.totalUnidades,
        gerenteId: condominios.gerenteId,
        thumbnail: condominios.thumbnail,
        statusCondominio: condominios.statusCondominio,
        activo: condominios.activo,
        createdAt: condominios.createdAt,
      })
      .from(condominios);

    // Calculate occupation for each condominio
    const condominiosWithOccupation = await Promise.all(
      allCondominios.map(async (condo) => {
        // Count occupied units (units with estado = 'occupied')
        const [occupiedCount] = await db
          .select({ count: count() })
          .from(unidades)
          .where(
            and(
              eq(unidades.condominiumId, condo.id),
              eq(unidades.estado, 'Ocupado')
            )
          );

        const occupied = occupiedCount?.count || 0;
        const total = condo.totalUnidades || 0;
        const occupationRate = total > 0 ? ((occupied / total) * 100).toFixed(2) : '0.00';

        return {
          ...condo,
          totalUnits: total,
          occupiedUnits: occupied,
          availableUnits: total - occupied,
          occupationRate: `${occupationRate}%`,
          status: condo.statusCondominio || (condo.activo ? 'activo' : 'inactivo'),
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: condominiosWithOccupation.length,
      data: { condominios: condominiosWithOccupation },
    });
  } catch (error) {
    logger.error('Error in getAllCondominios:', error);
    next(error);
  }
};

/**
 * Get condominio by ID
 */
export const getCondominioById = async (
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

    const [condominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, id))
      .limit(1);

    if (!condominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    // Calculate occupation
    const [occupiedCount] = await db
      .select({ count: count() })
      .from(unidades)
      .where(
        and(
          eq(unidades.condominiumId, condominio.id),
          eq(unidades.estado, 'Ocupado')
        )
      );

    const occupied = occupiedCount?.count || 0;
    const total = condominio.totalUnidades || 0;
    const occupationRate = total > 0 ? ((occupied / total) * 100).toFixed(2) : '0.00';

    const condominioWithOccupation = {
      ...condominio,
      totalUnits: total,
      occupiedUnits: occupied,
      availableUnits: total - occupied,
      occupationRate: `${occupationRate}%`,
      status: condominio.estado || (condominio.activo ? 'activo' : 'inactivo'),
    };

    res.status(200).json({
      status: 'success',
      data: { condominio: condominioWithOccupation },
    });
  } catch (error) {
    logger.error('Error in getCondominioById:', error);
    next(error);
  }
};

/**
 * Get condominios by gerente ID
 */
export const getCondominiosByGerente = async (
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

    const { gerenteId } = req.params;

    // Verify that the gerente exists
    const [gerente] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, gerenteId))
      .limit(1);

    if (!gerente) {
      return next(AppError.notFound('Gerente no encontrado'));
    }

    // Get all condominios managed by this gerente
    const condominiosList = await db
      .select({
        id: condominios.id,
        nombre: condominios.nombre,
        direccion: condominios.direccion,
        ciudad: condominios.ciudad,
        estado: condominios.estado,
        codigoPostal: condominios.codigoPostal,
        telefono: condominios.telefono,
        email: condominios.email,
        totalUnidades: condominios.totalUnidades,
        gerenteId: condominios.gerenteId,
        thumbnail: condominios.thumbnail,
        statusCondominio: condominios.statusCondominio,
        activo: condominios.activo,
        createdAt: condominios.createdAt,
      })
      .from(condominios)
      .where(eq(condominios.gerenteId, gerenteId));

    // Calculate occupation for each condominio
    const condominiosWithOccupation = await Promise.all(
      condominiosList.map(async (condo) => {
        // Count occupied units (units with estado = 'occupied')
        const [occupiedCount] = await db
          .select({ count: count() })
          .from(unidades)
          .where(
            and(
              eq(unidades.condominiumId, condo.id),
              eq(unidades.estado, 'Ocupado')
            )
          );

        const occupied = occupiedCount?.count || 0;
        const total = condo.totalUnidades || 0;
        const occupationRate = total > 0 ? ((occupied / total) * 100).toFixed(2) : '0.00';

        return {
          ...condo,
          totalUnits: total,
          occupiedUnits: occupied,
          availableUnits: total - occupied,
          occupationRate: `${occupationRate}%`,
          status: condo.statusCondominio || (condo.activo ? 'activo' : 'inactivo'),
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: condominiosWithOccupation.length,
      data: {
        gerente: {
          id: gerente.id,
          nombre: gerente.nombre,
          apellido: gerente.apellido,
          email: gerente.email,
          rol: gerente.rol,
        },
        condominios: condominiosWithOccupation
      },
    });
  } catch (error) {
    logger.error('Error in getCondominiosByGerente:', error);
    next(error);
  }
};

/**
 * Create a new condominio
 */
export const createCondominio = async (
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
      nombre,
      direccion,
      ciudad,
      estado,
      codigoPostal,
      telefono,
      email,
      totalUnidades,
      gerenteId,
      thumbnail,
      statusCondominio,
    } = req.body;

    // If gerenteId is provided, verify it exists
    if (gerenteId) {
      const [gerente] = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, gerenteId))
        .limit(1);

      if (!gerente) {
        return next(AppError.notFound('Gerente no encontrado'));
      }

      if (gerente.rol !== 'condoAdmin' && gerente.rol !== 'admin') {
        return next(
          AppError.badRequest('El usuario debe tener rol de condoAdmin o admin')
        );
      }
    }

    // Create condominio
    const [newCondominio] = await db
      .insert(condominios)
      .values({
        nombre,
        direccion,
        ciudad,
        estado,
        codigoPostal,
        telefono,
        email: email?.toLowerCase(),
        totalUnidades: totalUnidades || 0,
        gerenteId,
        thumbnail,
        statusCondominio: statusCondominio || 'activo',
      })
      .returning();

    logger.info(`Condominio created: ${newCondominio.nombre}`);

    res.status(201).json({
      status: 'success',
      message: 'Condominio creado exitosamente',
      data: { condominio: newCondominio },
    });
  } catch (error) {
    logger.error('Error in createCondominio:', error);
    next(error);
  }
};

/**
 * Update condominio
 */
export const updateCondominio = async (
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
      direccion,
      ciudad,
      estado,
      codigoPostal,
      telefono,
      email,
      totalUnidades,
      gerenteId,
      thumbnail,
      statusCondominio,
      activo,
    } = req.body;

    // Check if condominio exists
    const [existingCondominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, id))
      .limit(1);

    if (!existingCondominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    // If gerenteId is provided, verify it exists
    if (gerenteId) {
      const [gerente] = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, gerenteId))
        .limit(1);

      if (!gerente) {
        return next(AppError.notFound('Gerente no encontrado'));
      }

      if (gerente.rol !== 'condoAdmin' && gerente.rol !== 'admin') {
        return next(
          AppError.badRequest('El usuario debe tener rol de condoAdmin o admin')
        );
      }
    }

    // Update condominio
    const [updatedCondominio] = await db
      .update(condominios)
      .set({
        ...(nombre && { nombre }),
        ...(direccion && { direccion }),
        ...(ciudad && { ciudad }),
        ...(estado !== undefined && { estado }),
        ...(codigoPostal !== undefined && { codigoPostal }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email: email?.toLowerCase() }),
        ...(totalUnidades !== undefined && { totalUnidades }),
        ...(gerenteId !== undefined && { gerenteId }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(statusCondominio !== undefined && { statusCondominio }),
        ...(activo !== undefined && { activo }),
        updatedAt: new Date(),
      })
      .where(eq(condominios.id, id))
      .returning();

    logger.info(`Condominio updated: ${updatedCondominio.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Condominio actualizado exitosamente',
      data: { condominio: updatedCondominio },
    });
  } catch (error) {
    logger.error('Error in updateCondominio:', error);
    next(error);
  }
};

/**
 * Delete condominio (soft delete)
 */
export const deleteCondominio = async (
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

    // Check if condominio exists
    const [existingCondominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, id))
      .limit(1);

    if (!existingCondominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    // Soft delete (deactivate condominio)
    await db
      .update(condominios)
      .set({
        activo: false,
        updatedAt: new Date(),
      })
      .where(eq(condominios.id, id));

    logger.info(`Condominio deactivated: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Condominio desactivado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteCondominio:', error);
    next(error);
  }
};
