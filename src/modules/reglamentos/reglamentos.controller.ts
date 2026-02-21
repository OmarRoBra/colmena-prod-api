import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { reglamentos, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllReglamentos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await db.select().from(reglamentos).orderBy(desc(reglamentos.createdAt));
    res.status(200).json({ status: 'success', results: all.length, data: { reglamentos: all } });
  } catch (error) {
    logger.error('Error in getAllReglamentos:', error);
    next(error);
  }
};

export const getReglamentoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [reglamento] = await db.select().from(reglamentos).where(eq(reglamentos.id, req.params.id)).limit(1);
    if (!reglamento) return next(AppError.notFound('Reglamento no encontrado'));
    res.status(200).json({ status: 'success', data: { reglamento } });
  } catch (error) {
    logger.error('Error in getReglamentoById:', error);
    next(error);
  }
};

/**
 * Get the active regulation for a condominium
 */
export const getActiveReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [activeReglamento] = await db
      .select()
      .from(reglamentos)
      .where(
        and(
          eq(reglamentos.condominioId, req.params.condominioId),
          eq(reglamentos.estado, 'active')
        )
      )
      .orderBy(desc(reglamentos.createdAt))
      .limit(1);

    res.status(200).json({ status: 'success', data: { reglamento: activeReglamento || null } });
  } catch (error) {
    logger.error('Error in getActiveReglamento:', error);
    next(error);
  }
};

/**
 * Get regulation history (all versions) for a condominium
 */
export const getReglamentosHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const history = await db
      .select()
      .from(reglamentos)
      .where(eq(reglamentos.condominioId, req.params.condominioId))
      .orderBy(desc(reglamentos.vigenciaDesde));

    res.status(200).json({ status: 'success', results: history.length, data: { history } });
  } catch (error) {
    logger.error('Error in getReglamentosHistory:', error);
    next(error);
  }
};

export const createReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const {
      condominioId,
      titulo,
      descripcion,
      contenido,
      categoria,
      version,
      vigenciaDesde,
      estado,
      documento,
      pages,
      fileSize,
      approvedBy,
    } = req.body;

    // Verify condominium exists
    const [cond] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!cond) return next(AppError.notFound('Condominio no encontrado'));

    // If creating a new active version, archive the previous active one
    if (estado === 'active' || !estado) {
      await db
        .update(reglamentos)
        .set({ estado: 'archived', activo: false, updatedAt: new Date() })
        .where(
          and(
            eq(reglamentos.condominioId, condominioId),
            eq(reglamentos.estado, 'active')
          )
        );
    }

    // Create the new regulation
    const [newReglamento] = await db
      .insert(reglamentos)
      .values({
        condominioId,
        titulo,
        descripcion: descripcion || null,
        contenido: contenido || null,
        categoria: categoria || null,
        version: version || 'v1.0',
        vigenciaDesde: new Date(vigenciaDesde),
        estado: estado || 'active',
        documento: documento || null,
        pages: pages || null,
        fileSize: fileSize || null,
        approvedBy: approvedBy || null,
        activo: (estado || 'active') === 'active',
      })
      .returning();

    logger.info(`Reglamento created: ${newReglamento.id}`);
    res.status(201).json({ status: 'success', message: 'Reglamento creado', data: { reglamento: newReglamento } });
  } catch (error) {
    logger.error('Error in createReglamento:', error);
    next(error);
  }
};

export const updateReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [existing] = await db.select().from(reglamentos).where(eq(reglamentos.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Reglamento no encontrado'));

    const {
      titulo,
      descripcion,
      contenido,
      categoria,
      version,
      vigenciaDesde,
      estado,
      documento,
      pages,
      fileSize,
      approvedBy,
      activo,
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = { updatedAt: new Date() };

    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (contenido !== undefined) updateData.contenido = contenido;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (version !== undefined) updateData.version = version;
    if (vigenciaDesde !== undefined) updateData.vigenciaDesde = new Date(vigenciaDesde);
    if (estado !== undefined) {
      updateData.estado = estado;
      updateData.activo = estado === 'active';
    }
    if (documento !== undefined) updateData.documento = documento;
    if (pages !== undefined) updateData.pages = pages;
    if (fileSize !== undefined) updateData.fileSize = fileSize;
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy;
    if (activo !== undefined) updateData.activo = activo;

    const [updated] = await db
      .update(reglamentos)
      .set(updateData)
      .where(eq(reglamentos.id, req.params.id))
      .returning();

    logger.info(`Reglamento updated: ${updated.id}`);
    res.status(200).json({ status: 'success', data: { reglamento: updated } });
  } catch (error) {
    logger.error('Error in updateReglamento:', error);
    next(error);
  }
};

/**
 * Archive a regulation (change status to archived)
 */
export const archiveReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [existing] = await db.select().from(reglamentos).where(eq(reglamentos.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Reglamento no encontrado'));

    const [archived] = await db
      .update(reglamentos)
      .set({ estado: 'archived', activo: false, updatedAt: new Date() })
      .where(eq(reglamentos.id, req.params.id))
      .returning();

    logger.info(`Reglamento archived: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Reglamento archivado', data: { reglamento: archived } });
  } catch (error) {
    logger.error('Error in archiveReglamento:', error);
    next(error);
  }
};

export const deleteReglamento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [existing] = await db.select().from(reglamentos).where(eq(reglamentos.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Reglamento no encontrado'));

    // Permanently delete the regulation
    await db.delete(reglamentos).where(eq(reglamentos.id, req.params.id));

    logger.info(`Reglamento deleted: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Reglamento eliminado' });
  } catch (error) {
    logger.error('Error in deleteReglamento:', error);
    next(error);
  }
};
