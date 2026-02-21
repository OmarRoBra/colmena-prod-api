import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { pagos, unidades, condominios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all pagos
 */
export const getAllPagos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allPagos = await db.select().from(pagos);

    res.status(200).json({
      status: 'success',
      results: allPagos.length,
      data: { pagos: allPagos },
    });
  } catch (error) {
    logger.error('Error in getAllPagos:', error);
    next(error);
  }
};

/**
 * Get pago by ID
 */
export const getPagoById = async (
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

    const [pago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!pago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    res.status(200).json({
      status: 'success',
      data: { pago },
    });
  } catch (error) {
    logger.error('Error in getPagoById:', error);
    next(error);
  }
};

/**
 * Get pagos by unidad ID
 */
export const getPagosByUnidad = async (
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

    // Verify unidad exists
    const [unidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, unidadId))
      .limit(1);

    if (!unidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    const pagosUnidad = await db
      .select()
      .from(pagos)
      .where(eq(pagos.unidadId, unidadId));

    res.status(200).json({
      status: 'success',
      results: pagosUnidad.length,
      data: { pagos: pagosUnidad },
    });
  } catch (error) {
    logger.error('Error in getPagosByUnidad:', error);
    next(error);
  }
};

/**
 * Create a new pago
 */
export const createPago = async (
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

    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const {
      unidadId,
      monto,
      concepto,
      metodoPago,
      referencia,
      comprobante,
      notas,
    } = req.body;

    // Verify unidad exists
    const [unidad] = await db
      .select()
      .from(unidades)
      .where(eq(unidades.id, unidadId))
      .limit(1);

    if (!unidad) {
      return next(AppError.notFound('Unidad no encontrada'));
    }

    // Create pago
    const [newPago] = await db
      .insert(pagos)
      .values({
        unidadId,
        usuarioId: userId,
        monto,
        concepto,
        metodoPago,
        referencia,
        comprobante,
        notas,
        estado: 'pendiente',
      })
      .returning();

    logger.info(`Pago created: ${newPago.id} for unidad ${unidadId}`);

    res.status(201).json({
      status: 'success',
      message: 'Pago registrado exitosamente',
      data: { pago: newPago },
    });
  } catch (error) {
    logger.error('Error in createPago:', error);
    next(error);
  }
};

/**
 * Update pago
 */
export const updatePago = async (
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
    const { estado, referencia, comprobante, notas } = req.body;

    // Check if pago exists
    const [existingPago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!existingPago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    // Update pago
    const [updatedPago] = await db
      .update(pagos)
      .set({
        ...(estado && { estado }),
        ...(referencia !== undefined && { referencia }),
        ...(comprobante !== undefined && { comprobante }),
        ...(notas !== undefined && { notas }),
        ...(estado === 'completado' && { fechaPago: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(pagos.id, id))
      .returning();

    logger.info(`Pago updated: ${updatedPago.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Pago actualizado exitosamente',
      data: { pago: updatedPago },
    });
  } catch (error) {
    logger.error('Error in updatePago:', error);
    next(error);
  }
};

/**
 * Delete pago
 */
export const deletePago = async (
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

    // Check if pago exists
    const [existingPago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, id))
      .limit(1);

    if (!existingPago) {
      return next(AppError.notFound('Pago no encontrado'));
    }

    // Delete pago (hard delete for payments)
    await db.delete(pagos).where(eq(pagos.id, id));

    logger.info(`Pago deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Pago eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deletePago:', error);
    next(error);
  }
};

/**
 * Get pagos by condominium
 */
export const getPagosByCondominium = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { condominioId } = req.params;

    // Get all units for the condominium
    const condoUnidades = await db
      .select({ id: unidades.id })
      .from(unidades)
      .where(eq(unidades.condominiumId, condominioId));

    if (condoUnidades.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { pagos: [] },
      });
    }

    // Get all pagos for those units
    const allPagos = [];
    for (const u of condoUnidades) {
      const unitPagos = await db
        .select()
        .from(pagos)
        .where(eq(pagos.unidadId, u.id));
      allPagos.push(...unitPagos);
    }

    res.status(200).json({
      status: 'success',
      results: allPagos.length,
      data: { pagos: allPagos },
    });
  } catch (error) {
    logger.error('Error in getPagosByCondominium:', error);
    next(error);
  }
};

/**
 * Generate maintenance fees for all units in a condominium
 */
export const generateMaintenanceFees = async (
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

    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const { condominioId, mes, anio } = req.body;

    // Verify condominium exists
    const [condo] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);

    if (!condo) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    // Get all units for the condominium
    const condoUnidades = await db
      .select()
      .from(unidades)
      .where(eq(unidades.condominiumId, condominioId));

    if (condoUnidades.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No hay unidades registradas en este condominio',
        data: { pagos: [], generated: 0 },
      });
    }

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const monthName = monthNames[mes - 1] || `Mes ${mes}`;

    const createdPagos = [];

    for (const unidad of condoUnidades) {
      const concepto = `Cuota Mantenimiento ${monthName} ${anio} - Unidad ${unidad.numero}`;

      const [newPago] = await db
        .insert(pagos)
        .values({
          unidadId: unidad.id,
          usuarioId: userId,
          monto: unidad.cuotaMantenimiento,
          concepto,
          metodoPago: 'pendiente',
          estado: 'pendiente',
        })
        .returning();

      createdPagos.push(newPago);
    }

    logger.info(
      `Generated ${createdPagos.length} maintenance fees for condominium ${condominioId} (${monthName} ${anio})`
    );

    res.status(201).json({
      status: 'success',
      message: `Se generaron ${createdPagos.length} cuotas de mantenimiento para ${monthName} ${anio}`,
      data: { pagos: createdPagos, generated: createdPagos.length },
    });
  } catch (error) {
    logger.error('Error in generateMaintenanceFees:', error);
    next(error);
  }
};
