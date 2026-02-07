import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { usuarios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Register a new user profile
 * The user must already have a Supabase auth session (signed up via frontend).
 * This endpoint creates the corresponding row in the `usuarios` table.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validaci\u00f3n', errors.array())
      );
    }

    const supabaseUserId = req.user!.userId;
    const supabaseEmail = req.user!.email;
    const { nombre, apellido, telefono, rol } = req.body;

    // Check if profile already exists
    const existing = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, supabaseUserId))
      .limit(1);

    if (existing.length > 0) {
      return next(AppError.conflict('El perfil de usuario ya existe'));
    }

    const [newUser] = await db
      .insert(usuarios)
      .values({
        id: supabaseUserId,
        nombre,
        apellido,
        email: supabaseEmail,
        telefono,
        rol: rol || 'owner',
      })
      .returning();

    logger.info(`New user profile created: ${newUser.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Perfil de usuario creado exitosamente',
      data: {
        user: {
          id: newUser.id,
          nombre: newUser.nombre,
          apellido: newUser.apellido,
          email: newUser.email,
          rol: newUser.rol,
        },
      },
    });
  } catch (error) {
    logger.error('Error in register:', error);
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const [user] = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
        telefono: usuarios.telefono,
        rol: usuarios.rol,
        activo: usuarios.activo,
        createdAt: usuarios.createdAt,
      })
      .from(usuarios)
      .where(eq(usuarios.id, userId))
      .limit(1);

    if (!user) {
      return next(AppError.notFound('Usuario no encontrado'));
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    logger.error('Error in getProfile:', error);
    next(error);
  }
};
