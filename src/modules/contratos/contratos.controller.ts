import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { contratos, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllContratos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db.select().from(contratos);

    res.status(200).json({
      status: 'success',
      results: result.length,
      contratos: result,
    });
  } catch (error) {
    logger.error('Error in getAllContratos:', error);
    next(error);
  }
};

export const getContratosByCondominio = async (
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

    const result = await db
      .select()
      .from(contratos)
      .where(eq(contratos.condominioId, condominioId));

    res.status(200).json({
      status: 'success',
      results: result.length,
      contratos: result,
    });
  } catch (error) {
    logger.error('Error in getContratosByCondominio:', error);
    next(error);
  }
};

export const getContratoById = async (
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
    const [contrato] = await db.select().from(contratos).where(eq(contratos.id, id)).limit(1);

    if (!contrato) {
      return next(AppError.notFound('Contrato no encontrado'));
    }

    res.status(200).json({ status: 'success', contrato });
  } catch (error) {
    logger.error('Error in getContratoById:', error);
    next(error);
  }
};

export const createContrato = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId, tipo, partes, monto, fechaInicio, fechaFin, estado, documento, notas } = req.body;

    const [condo] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const [newContrato] = await db
      .insert(contratos)
      .values({
        condominioId,
        tipo,
        partes,
        monto,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        estado: estado || 'activo',
        documento,
        notas,
      })
      .returning();

    logger.info(`Contrato created: ${newContrato.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Contrato creado exitosamente',
      contrato: newContrato,
    });
  } catch (error) {
    logger.error('Error in createContrato:', error);
    next(error);
  }
};

export const updateContrato = async (
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
    const { tipo, partes, monto, fechaInicio, fechaFin, estado, documento, notas } = req.body;

    const [existing] = await db.select().from(contratos).where(eq(contratos.id, id)).limit(1);
    if (!existing) {
      return next(AppError.notFound('Contrato no encontrado'));
    }

    const [updated] = await db
      .update(contratos)
      .set({
        ...(tipo !== undefined && { tipo }),
        ...(partes !== undefined && { partes }),
        ...(monto !== undefined && { monto }),
        ...(fechaInicio && { fechaInicio: new Date(fechaInicio) }),
        ...(fechaFin && { fechaFin: new Date(fechaFin) }),
        ...(estado !== undefined && { estado }),
        ...(documento !== undefined && { documento }),
        ...(notas !== undefined && { notas }),
        updatedAt: new Date(),
      })
      .where(eq(contratos.id, id))
      .returning();

    logger.info(`Contrato updated: ${updated.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Contrato actualizado exitosamente',
      contrato: updated,
    });
  } catch (error) {
    logger.error('Error in updateContrato:', error);
    next(error);
  }
};

export const deleteContrato = async (
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

    const [existing] = await db.select().from(contratos).where(eq(contratos.id, id)).limit(1);
    if (!existing) {
      return next(AppError.notFound('Contrato no encontrado'));
    }

    await db.delete(contratos).where(eq(contratos.id, id));

    logger.info(`Contrato deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Contrato eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteContrato:', error);
    next(error);
  }
};
