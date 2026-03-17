import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { condominios, gruposContacto } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getGruposByCondominio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId } = req.params;

    const grupos = await db
      .select()
      .from(gruposContacto)
      .where(eq(gruposContacto.condominioId, condominioId))
      .orderBy(desc(gruposContacto.updatedAt));

    res.status(200).json({
      status: 'success',
      results: grupos.length,
      grupos,
    });
  } catch (error) {
    logger.error('Error in getGruposByCondominio:', error);
    next(error);
  }
};

export const createGrupo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId, nombre, descripcion, miembros } = req.body;

    const [condominio] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);

    if (!condominio) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const [grupo] = await db
      .insert(gruposContacto)
      .values({
        condominioId,
        nombre,
        descripcion,
        miembros,
      })
      .returning();

    res.status(201).json({
      status: 'success',
      message: 'Grupo creado exitosamente',
      grupo,
    });
  } catch (error) {
    logger.error('Error in createGrupo:', error);
    next(error);
  }
};

export const updateGrupo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;
    const { nombre, descripcion, miembros } = req.body;

    const [existing] = await db
      .select()
      .from(gruposContacto)
      .where(eq(gruposContacto.id, id))
      .limit(1);

    if (!existing) {
      return next(AppError.notFound('Grupo no encontrado'));
    }

    const [grupo] = await db
      .update(gruposContacto)
      .set({
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(miembros !== undefined && { miembros }),
        updatedAt: new Date(),
      })
      .where(eq(gruposContacto.id, id))
      .returning();

    res.status(200).json({
      status: 'success',
      message: 'Grupo actualizado exitosamente',
      grupo,
    });
  } catch (error) {
    logger.error('Error in updateGrupo:', error);
    next(error);
  }
};

export const deleteGrupo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(gruposContacto)
      .where(eq(gruposContacto.id, id))
      .limit(1);

    if (!existing) {
      return next(AppError.notFound('Grupo no encontrado'));
    }

    await db.delete(gruposContacto).where(eq(gruposContacto.id, id));

    res.status(200).json({
      status: 'success',
      message: 'Grupo eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteGrupo:', error);
    next(error);
  }
};
