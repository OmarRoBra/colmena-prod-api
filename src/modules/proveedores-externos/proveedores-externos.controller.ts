import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { proveedoresExternos, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const createProveedorExterno = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId, nombre, razonSocial, rfc, email, telefono, regimenFiscal, usoCfdi, codigoPostalFiscal, notas } = req.body;

    const [condo] = await db.select({ id: condominios.id }).from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condo) return next(AppError.notFound('Condominio no encontrado'));

    // RFC duplicado en el mismo condominio
    const [dup] = await db
      .select({ id: proveedoresExternos.id })
      .from(proveedoresExternos)
      .where(and(eq(proveedoresExternos.condominioId, condominioId), eq(proveedoresExternos.rfc, rfc.toUpperCase())))
      .limit(1);
    if (dup) return next(AppError.conflict(`Ya existe un proveedor externo con RFC ${rfc} en este condominio`));

    const [nuevo] = await db.insert(proveedoresExternos).values({
      condominioId,
      nombre,
      razonSocial,
      rfc: rfc.toUpperCase(),
      email: email.toLowerCase(),
      telefono: telefono || null,
      regimenFiscal,
      usoCfdi: usoCfdi || 'G03',
      codigoPostalFiscal,
      notas: notas || null,
    }).returning();

    logger.info(`Proveedor externo creado: ${nuevo.id}`);
    res.status(201).json({ status: 'success', message: 'Proveedor externo creado', data: { proveedor: nuevo } });
  } catch (error) {
    logger.error('Error en createProveedorExterno:', error);
    next(error);
  }
};

export const getProveedoresExternos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId, activo } = req.query;

    const conditions = [eq(proveedoresExternos.condominioId, condominioId as string)];
    if (activo !== undefined) conditions.push(eq(proveedoresExternos.activo, activo === 'true'));

    const result = await db.select().from(proveedoresExternos).where(and(...conditions));
    res.status(200).json({ status: 'success', results: result.length, data: { proveedores: result } });
  } catch (error) {
    logger.error('Error en getProveedoresExternos:', error);
    next(error);
  }
};

export const getProveedorExternoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [proveedor] = await db.select().from(proveedoresExternos).where(eq(proveedoresExternos.id, req.params.id)).limit(1);
    if (!proveedor) return next(AppError.notFound('Proveedor externo no encontrado'));
    if (proveedor.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a este proveedor externo'));

    res.status(200).json({ status: 'success', data: { proveedor } });
  } catch (error) {
    logger.error('Error en getProveedorExternoById:', error);
    next(error);
  }
};

export const updateProveedorExterno = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { nombre, razonSocial, rfc, email, telefono, regimenFiscal, usoCfdi, codigoPostalFiscal, activo, notas } = req.body;

    const [existing] = await db.select().from(proveedoresExternos).where(eq(proveedoresExternos.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Proveedor externo no encontrado'));
    if (existing.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a este proveedor externo'));

    // Si cambia RFC, invalidar el facturapiClienteId para forzar recreación
    const rfcChanged = rfc && rfc.toUpperCase() !== existing.rfc;

    const [updated] = await db.update(proveedoresExternos).set({
      ...(nombre !== undefined && { nombre }),
      ...(razonSocial !== undefined && { razonSocial }),
      ...(rfc !== undefined && { rfc: rfc.toUpperCase() }),
      ...(email !== undefined && { email: email.toLowerCase() }),
      ...(telefono !== undefined && { telefono }),
      ...(regimenFiscal !== undefined && { regimenFiscal }),
      ...(usoCfdi !== undefined && { usoCfdi }),
      ...(codigoPostalFiscal !== undefined && { codigoPostalFiscal }),
      ...(activo !== undefined && { activo }),
      ...(notas !== undefined && { notas }),
      ...(rfcChanged && { facturapiClienteId: null }),
      updatedAt: new Date(),
    }).where(eq(proveedoresExternos.id, req.params.id)).returning();

    logger.info(`Proveedor externo actualizado: ${updated.id}`);
    res.status(200).json({ status: 'success', data: { proveedor: updated } });
  } catch (error) {
    logger.error('Error en updateProveedorExterno:', error);
    next(error);
  }
};

export const deleteProveedorExterno = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const [existing] = await db.select().from(proveedoresExternos).where(eq(proveedoresExternos.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Proveedor externo no encontrado'));
    if (existing.condominioId !== req.query.condominioId) return next(AppError.forbidden('No tienes acceso a este proveedor externo'));

    // Soft delete
    await db.update(proveedoresExternos).set({ activo: false, updatedAt: new Date() }).where(eq(proveedoresExternos.id, req.params.id));

    logger.info(`Proveedor externo desactivado: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Proveedor externo desactivado' });
  } catch (error) {
    logger.error('Error en deleteProveedorExterno:', error);
    next(error);
  }
};
