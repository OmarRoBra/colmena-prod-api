import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { gastos, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getGastosByCondominio = async (
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
      .from(gastos)
      .where(eq(gastos.condominioId, condominioId));

    res.status(200).json({
      status: 'success',
      results: result.length,
      gastos: result,
    });
  } catch (error) {
    logger.error('Error in getGastosByCondominio:', error);
    next(error);
  }
};

export const getGastoById = async (
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
    const [gasto] = await db.select().from(gastos).where(eq(gastos.id, id)).limit(1);

    if (!gasto) {
      return next(AppError.notFound('Gasto no encontrado'));
    }

    res.status(200).json({ status: 'success', gasto });
  } catch (error) {
    logger.error('Error in getGastoById:', error);
    next(error);
  }
};

export const createGasto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId, concepto, descripcion, monto, categoria, fechaGasto, comprobante, notas } = req.body;

    const [condo] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const [newGasto] = await db
      .insert(gastos)
      .values({
        condominioId,
        concepto,
        descripcion,
        monto,
        categoria,
        fechaGasto: new Date(fechaGasto),
        comprobante,
        notas,
      })
      .returning();

    logger.info(`Gasto created: ${newGasto.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Gasto registrado exitosamente',
      gasto: newGasto,
    });
  } catch (error) {
    logger.error('Error in createGasto:', error);
    next(error);
  }
};

export const updateGasto = async (
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
    const { concepto, descripcion, monto, categoria, fechaGasto, comprobante, notas } = req.body;

    const [existing] = await db.select().from(gastos).where(eq(gastos.id, id)).limit(1);
    if (!existing) {
      return next(AppError.notFound('Gasto no encontrado'));
    }

    const [updated] = await db
      .update(gastos)
      .set({
        ...(concepto !== undefined && { concepto }),
        ...(descripcion !== undefined && { descripcion }),
        ...(monto !== undefined && { monto }),
        ...(categoria !== undefined && { categoria }),
        ...(fechaGasto && { fechaGasto: new Date(fechaGasto) }),
        ...(comprobante !== undefined && { comprobante }),
        ...(notas !== undefined && { notas }),
        updatedAt: new Date(),
      })
      .where(eq(gastos.id, id))
      .returning();

    logger.info(`Gasto updated: ${updated.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Gasto actualizado exitosamente',
      gasto: updated,
    });
  } catch (error) {
    logger.error('Error in updateGasto:', error);
    next(error);
  }
};

export const deleteGasto = async (
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

    const [existing] = await db.select().from(gastos).where(eq(gastos.id, id)).limit(1);
    if (!existing) {
      return next(AppError.notFound('Gasto no encontrado'));
    }

    await db.delete(gastos).where(eq(gastos.id, id));

    logger.info(`Gasto deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Gasto eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteGasto:', error);
    next(error);
  }
};
