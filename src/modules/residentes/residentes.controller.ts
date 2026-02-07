import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { residentes, unidades } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all residents
 */
export const getAllResidents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allResidents = await db.select().from(residentes);

    res.status(200).json({
      status: 'success',
      results: allResidents.length,
      data: { residentes: allResidents },
    });
  } catch (error) {
    logger.error('Error in getAllResidents:', error);
    next(error);
  }
};

/**
 * Get resident by ID
 */
export const getResidentById = async (
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

    const [resident] = await db
      .select()
      .from(residentes)
      .where(eq(residentes.id, id))
      .limit(1);

    if (!resident) {
      return next(AppError.notFound('Residente no encontrado'));
    }

    res.status(200).json({
      status: 'success',
      data: { residente: resident },
    });
  } catch (error) {
    logger.error('Error in getResidentById:', error);
    next(error);
  }
};

/**
 * Get residents by unit ID
 */
export const getResidentsByUnit = async (
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

    const { unidadId } = req.params;

    // Verify unit exists
    const [unit] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, unidadId))
      .limit(1);

    if (!unit) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    const unitResidents = await db
      .select()
      .from(residentes)
      .where(eq(residentes.unidadId, unidadId));

    res.status(200).json({
      status: 'success',
      results: unitResidents.length,
      data: { residentes: unitResidents },
    });
  } catch (error) {
    logger.error('Error in getResidentsByUnit:', error);
    next(error);
  }
};

/**
 * Create a new resident
 */
export const createResident = async (
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
      unidadId,
      nombre,
      email,
      telefono,
      tipo,
      fechaIngreso,
      documentoIdentidad,
      contactoEmergencia,
      telefonoEmergencia,
      notas,
    } = req.body;

    // Verify unit exists
    const [unit] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, unidadId))
      .limit(1);

    if (!unit) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    // Check if email already exists for this unit
    const [existingResident] = await db
      .select()
      .from(residentes)
      .where(
        and(
          eq(residentes.unidadId, unidadId),
          eq(residentes.email, email.toLowerCase())
        )
      )
      .limit(1);

    if (existingResident) {
      return next(
        AppError.conflict(
          'Ya existe un residente con este email en la unidad'
        )
      );
    }

    // Create resident
    const [newResident] = await db
      .insert(residentes)
      .values({
        unidadId,
        nombre,
        email: email.toLowerCase(),
        telefono,
        tipo: tipo || 'Propietario',
        fechaIngreso: new Date(fechaIngreso),
        documentoIdentidad,
        contactoEmergencia,
        telefonoEmergencia,
        notas,
      })
      .returning();

    logger.info(
      `Resident created: ${newResident.nombre} in unit ${unidadId}`
    );

    res.status(201).json({
      status: 'success',
      message: 'Residente creado exitosamente',
      data: { residente: newResident },
    });
  } catch (error) {
    logger.error('Error in createResident:', error);
    next(error);
  }
};

/**
 * Update resident
 */
export const updateResident = async (
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
      email,
      telefono,
      tipo,
      fechaIngreso,
      documentoIdentidad,
      contactoEmergencia,
      telefonoEmergencia,
      notas,
      activo,
    } = req.body;

    // Check if resident exists
    const [existingResident] = await db
      .select()
      .from(residentes)
      .where(eq(residentes.id, id))
      .limit(1);

    if (!existingResident) {
      return next(AppError.notFound('Residente no encontrado'));
    }

    // If email is being updated, check for duplicates in the same unit
    if (email && email.toLowerCase() !== existingResident.email) {
      const [duplicateResident] = await db
        .select()
        .from(residentes)
        .where(
          and(
            eq(residentes.unidadId, existingResident.unidadId),
            eq(residentes.email, email.toLowerCase())
          )
        )
        .limit(1);

      if (duplicateResident) {
        return next(
          AppError.conflict(
            'Ya existe un residente con este email en la unidad'
          )
        );
      }
    }

    // Update resident
    const [updatedResident] = await db
      .update(residentes)
      .set({
        ...(nombre && { nombre }),
        ...(email && { email: email.toLowerCase() }),
        ...(telefono && { telefono }),
        ...(tipo && { tipo }),
        ...(fechaIngreso && { fechaIngreso: new Date(fechaIngreso) }),
        ...(documentoIdentidad !== undefined && { documentoIdentidad }),
        ...(contactoEmergencia !== undefined && { contactoEmergencia }),
        ...(telefonoEmergencia !== undefined && { telefonoEmergencia }),
        ...(notas !== undefined && { notas }),
        ...(activo !== undefined && { activo }),
        updatedAt: new Date(),
      })
      .where(eq(residentes.id, id))
      .returning();

    logger.info(`Resident updated: ${updatedResident.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Residente actualizado exitosamente',
      data: { residente: updatedResident },
    });
  } catch (error) {
    logger.error('Error in updateResident:', error);
    next(error);
  }
};

/**
 * Delete resident
 */
export const deleteResident = async (
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

    // Check if resident exists
    const [existingResident] = await db
      .select()
      .from(residentes)
      .where(eq(residentes.id, id))
      .limit(1);

    if (!existingResident) {
      return next(AppError.notFound('Residente no encontrado'));
    }

    // Hard delete the resident
    await db
      .delete(residentes)
      .where(eq(residentes.id, id));

    logger.info(`Resident deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Residente eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteResident:', error);
    next(error);
  }
};
