import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { documentos, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllDocumentos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db.select().from(documentos);

    res.status(200).json({
      status: 'success',
      results: result.length,
      documentos: result,
    });
  } catch (error) {
    logger.error('Error in getAllDocumentos:', error);
    next(error);
  }
};

export const getDocumentosByCondominio = async (
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
      .from(documentos)
      .where(eq(documentos.condominioId, condominioId));

    res.status(200).json({
      status: 'success',
      results: result.length,
      documentos: result,
    });
  } catch (error) {
    logger.error('Error in getDocumentosByCondominio:', error);
    next(error);
  }
};

export const getDocumentoById = async (
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
    const [documento] = await db.select().from(documentos).where(eq(documentos.id, id)).limit(1);

    if (!documento) {
      return next(AppError.notFound('Documento no encontrado'));
    }

    res.status(200).json({ status: 'success', documento });
  } catch (error) {
    logger.error('Error in getDocumentoById:', error);
    next(error);
  }
};

export const createDocumento = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId, nombre, categoria, tamano, tipoArchivo, url, subidoPor } = req.body;

    const [condo] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const [newDocumento] = await db
      .insert(documentos)
      .values({
        condominioId,
        nombre,
        categoria,
        tamano,
        tipoArchivo,
        url,
        subidoPor,
      })
      .returning();

    logger.info(`Documento created: ${newDocumento.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Documento creado exitosamente',
      documento: newDocumento,
    });
  } catch (error) {
    logger.error('Error in createDocumento:', error);
    next(error);
  }
};

export const deleteDocumento = async (
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

    const [existing] = await db.select().from(documentos).where(eq(documentos.id, id)).limit(1);
    if (!existing) {
      return next(AppError.notFound('Documento no encontrado'));
    }

    await db.delete(documentos).where(eq(documentos.id, id));

    logger.info(`Documento deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Documento eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteDocumento:', error);
    next(error);
  }
};
