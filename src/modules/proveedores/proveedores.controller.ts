import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { proveedores, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

export const getAllProveedores = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await db.select().from(proveedores);
    res.status(200).json({ status: 'success', results: all.length, data: { proveedores: all } });
  } catch (error) {
    logger.error('Error in getAllProveedores:', error);
    next(error);
  }
};

export const getProveedorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [proveedor] = await db.select().from(proveedores).where(eq(proveedores.id, req.params.id)).limit(1);
    if (!proveedor) return next(AppError.notFound('Proveedor no encontrado'));
    res.status(200).json({ status: 'success', data: { proveedor } });
  } catch (error) {
    logger.error('Error in getProveedorById:', error);
    next(error);
  }
};

export const createProveedor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const { condominioId, nombreEmpresa, nombreContacto, tipoServicio, email, telefono, estado, direccion, rfc, calificacion, inicioContrato, finContrato } = req.body;

    const [cond] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!cond) return next(AppError.notFound('Condominio no encontrado'));

    const [newProveedor] = await db.insert(proveedores).values({
      condominioId,
      nombreEmpresa,
      nombreContacto,
      tipoServicio,
      email: email?.toLowerCase(),
      telefono,
      estado: estado || 'active',
      direccion,
      rfc,
      calificacion: calificacion || 5,
      inicioContrato: inicioContrato ? new Date(inicioContrato) : null,
      finContrato: finContrato ? new Date(finContrato) : null,
    }).returning();

    logger.info(`Proveedor created: ${newProveedor.id}`);
    res.status(201).json({ status: 'success', message: 'Proveedor creado', data: { proveedor: newProveedor } });
  } catch (error) {
    logger.error('Error in createProveedor:', error);
    next(error);
  }
};

export const updateProveedor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const { nombreEmpresa, nombreContacto, tipoServicio, email, telefono, estado, direccion, rfc, calificacion, inicioContrato, finContrato } = req.body;

    const [existing] = await db.select().from(proveedores).where(eq(proveedores.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Proveedor no encontrado'));

    const [updated] = await db.update(proveedores).set({
      ...(nombreEmpresa && { nombreEmpresa }),
      ...(nombreContacto && { nombreContacto }),
      ...(tipoServicio && { tipoServicio }),
      ...(email && { email: email.toLowerCase() }),
      ...(telefono !== undefined && { telefono }),
      ...(estado && { estado }),
      ...(direccion !== undefined && { direccion }),
      ...(rfc !== undefined && { rfc }),
      ...(calificacion !== undefined && { calificacion }),
      ...(inicioContrato !== undefined && { inicioContrato: inicioContrato ? new Date(inicioContrato) : null }),
      ...(finContrato !== undefined && { finContrato: finContrato ? new Date(finContrato) : null }),
      updatedAt: new Date(),
    }).where(eq(proveedores.id, req.params.id)).returning();

    logger.info(`Proveedor updated: ${updated.id}`);
    res.status(200).json({ status: 'success', data: { proveedor: updated } });
  } catch (error) {
    logger.error('Error in updateProveedor:', error);
    next(error);
  }
};

export const deleteProveedor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    const [existing] = await db.select().from(proveedores).where(eq(proveedores.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Proveedor no encontrado'));

    await db.delete(proveedores).where(eq(proveedores.id, req.params.id));
    logger.info(`Proveedor deleted: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Proveedor eliminado' });
  } catch (error) {
    logger.error('Error in deleteProveedor:', error);
    next(error);
  }
};
