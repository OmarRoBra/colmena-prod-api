import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { comites, comiteMiembros, condominios, residentes } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

// GET /api/v1/comites/condominio/:condominioId
export const getComitesByCondominio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { condominioId } = req.params;

    const allComites = await db
      .select()
      .from(comites)
      .where(eq(comites.condominioId, condominioId));

    // For each comite, fetch members with resident details
    const comitesWithMembers = await Promise.all(
      allComites.map(async (comite) => {
        const members = await db
          .select({
            id: comiteMiembros.id,
            role: comiteMiembros.role,
            fechaIngreso: comiteMiembros.fechaIngreso,
            activo: comiteMiembros.activo,
            residente: {
              id: residentes.id,
              nombre: residentes.nombre,
              email: residentes.email,
            },
          })
          .from(comiteMiembros)
          .leftJoin(residentes, eq(comiteMiembros.residenteId, residentes.id))
          .where(and(eq(comiteMiembros.comiteId, comite.id), eq(comiteMiembros.activo, true)));

        return {
          ...comite,
          miembrosCount: members.length,
          miembros: members,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: comitesWithMembers.length,
      data: { comites: comitesWithMembers },
    });
  } catch (error) {
    logger.error('Error in getComitesByCondominio:', error);
    next(error);
  }
};

// GET /api/v1/comites/:id
export const getComiteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const [comite] = await db.select().from(comites).where(eq(comites.id, req.params.id)).limit(1);
    if (!comite) return next(AppError.notFound('Comité no encontrado'));

    // Fetch members with resident details
    const members = await db
      .select({
        id: comiteMiembros.id,
        role: comiteMiembros.role,
        fechaIngreso: comiteMiembros.fechaIngreso,
        activo: comiteMiembros.activo,
        residente: {
          id: residentes.id,
          nombre: residentes.nombre,
          email: residentes.email,
        },
      })
      .from(comiteMiembros)
      .leftJoin(residentes, eq(comiteMiembros.residenteId, residentes.id))
      .where(eq(comiteMiembros.comiteId, req.params.id));

    res.status(200).json({
      status: 'success',
      data: {
        comite: {
          ...comite,
          miembros: members,
        },
      },
    });
  } catch (error) {
    logger.error('Error in getComiteById:', error);
    next(error);
  }
};

// POST /api/v1/comites
export const createComite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId, nombre, descripcion, tipo, fechaFormacion } = req.body;

    // Verify condominio exists
    const [condominio] = await db.select().from(condominios).where(eq(condominios.id, condominioId)).limit(1);
    if (!condominio) return next(AppError.notFound('Condominio no encontrado'));

    const [newComite] = await db.insert(comites).values({
      condominioId,
      nombre,
      descripcion,
      tipo,
      fechaFormacion,
      estado: 'activo',
    }).returning();

    logger.info(`Comité created: ${newComite.id}`);
    res.status(201).json({
      status: 'success',
      message: 'Comité creado exitosamente',
      data: { comite: newComite },
    });
  } catch (error) {
    logger.error('Error in createComite:', error);
    next(error);
  }
};

// PUT /api/v1/comites/:id
export const updateComite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { nombre, descripcion, tipo, fechaFormacion, estado } = req.body;

    const [existing] = await db.select().from(comites).where(eq(comites.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Comité no encontrado'));

    const [updated] = await db.update(comites).set({
      ...(nombre && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(tipo && { tipo }),
      ...(fechaFormacion && { fechaFormacion }),
      ...(estado && { estado }),
      updatedAt: new Date(),
    }).where(eq(comites.id, req.params.id)).returning();

    logger.info(`Comité updated: ${updated.id}`);
    res.status(200).json({
      status: 'success',
      message: 'Comité actualizado',
      data: { comite: updated },
    });
  } catch (error) {
    logger.error('Error in updateComite:', error);
    next(error);
  }
};

// DELETE /api/v1/comites/:id
export const deleteComite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const [existing] = await db.select().from(comites).where(eq(comites.id, req.params.id)).limit(1);
    if (!existing) return next(AppError.notFound('Comité no encontrado'));

    await db.delete(comites).where(eq(comites.id, req.params.id));
    logger.info(`Comité deleted: ${req.params.id}`);
    res.status(200).json({ status: 'success', message: 'Comité eliminado' });
  } catch (error) {
    logger.error('Error in deleteComite:', error);
    next(error);
  }
};

// POST /api/v1/comites/:id/miembros
export const addMiembro = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id: comiteId } = req.params;
    const { residenteId, role, fechaIngreso } = req.body;

    // Verify comite exists
    const [comite] = await db.select().from(comites).where(eq(comites.id, comiteId)).limit(1);
    if (!comite) return next(AppError.notFound('Comité no encontrado'));

    // Verify residente exists
    const [residente] = await db.select().from(residentes).where(eq(residentes.id, residenteId)).limit(1);
    if (!residente) return next(AppError.notFound('Residente no encontrado'));

    // Check if already member
    const [existing] = await db
      .select()
      .from(comiteMiembros)
      .where(and(eq(comiteMiembros.comiteId, comiteId), eq(comiteMiembros.residenteId, residenteId)))
      .limit(1);

    if (existing) {
      return next(AppError.badRequest('El residente ya es miembro de este comité'));
    }

    const [newMiembro] = await db.insert(comiteMiembros).values({
      comiteId,
      residenteId,
      role,
      fechaIngreso,
      activo: true,
    }).returning();

    logger.info(`Member added to comité ${comiteId}: ${newMiembro.id}`);
    res.status(201).json({
      status: 'success',
      message: 'Miembro agregado exitosamente',
      data: { miembro: newMiembro },
    });
  } catch (error) {
    logger.error('Error in addMiembro:', error);
    next(error);
  }
};

// PUT /api/v1/comites/:id/miembros/:miembroId
export const updateMiembroRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id: comiteId, miembroId } = req.params;
    const { role } = req.body;

    const [existing] = await db
      .select()
      .from(comiteMiembros)
      .where(and(eq(comiteMiembros.id, miembroId), eq(comiteMiembros.comiteId, comiteId)))
      .limit(1);

    if (!existing) return next(AppError.notFound('Miembro no encontrado'));

    const [updated] = await db.update(comiteMiembros).set({
      role,
      updatedAt: new Date(),
    }).where(eq(comiteMiembros.id, miembroId)).returning();

    logger.info(`Member role updated in comité ${comiteId}: ${miembroId} -> ${role}`);
    res.status(200).json({
      status: 'success',
      message: 'Rol actualizado',
      data: { miembro: updated },
    });
  } catch (error) {
    logger.error('Error in updateMiembroRole:', error);
    next(error);
  }
};

// DELETE /api/v1/comites/:id/miembros/:miembroId
export const removeMiembro = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id: comiteId, miembroId } = req.params;

    const [existing] = await db
      .select()
      .from(comiteMiembros)
      .where(and(eq(comiteMiembros.id, miembroId), eq(comiteMiembros.comiteId, comiteId)))
      .limit(1);

    if (!existing) return next(AppError.notFound('Miembro no encontrado'));

    await db.delete(comiteMiembros).where(eq(comiteMiembros.id, miembroId));

    logger.info(`Member removed from comité ${comiteId}: ${miembroId}`);
    res.status(200).json({ status: 'success', message: 'Miembro removido' });
  } catch (error) {
    logger.error('Error in removeMiembro:', error);
    next(error);
  }
};
