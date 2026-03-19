import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { supabaseAdmin } from '../config/supabase';
import { db } from '../db';
import { usuarios } from '../db/schema';
import { AppError } from '../utils/appError';

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        rol: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies Supabase JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(
        AppError.unauthorized(
          'No se proporcion\u00f3 token de autenticaci\u00f3n'
        )
      );
    }

    const token = authHeader.substring(7);

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return next(AppError.unauthorized('Token inv\u00e1lido o expirado'));
    }

    const supabaseUser = data.user;

    // Fetch custom role from our usuarios table
    let [dbUser] = await db
      .select({ rol: usuarios.rol, activo: usuarios.activo })
      .from(usuarios)
      .where(eq(usuarios.id, supabaseUser.id))
      .limit(1);

    if (dbUser && dbUser.activo === false) {
      return next(AppError.forbidden('Tu acceso al sistema está desactivado'));
    }

    // Auto-create profile on first login if it doesn't exist yet
    if (!dbUser) {
      const meta = supabaseUser.user_metadata ?? {};
      const fullName: string = meta.full_name || meta.name || '';
      const [firstName, ...rest] = fullName.split(' ');

      const [created] = await db
        .insert(usuarios)
        .values({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          nombre: meta.nombre || firstName || 'Usuario',
          apellido: meta.apellido || rest.join(' ') || '',
          rol: 'condoAdmin',
          activo: true,
        })
        .onConflictDoNothing()
        .returning({ rol: usuarios.rol, activo: usuarios.activo });

      dbUser = created ?? { rol: 'condoAdmin', activo: true };
    }

    if (dbUser && dbUser.activo === false) {
      return next(AppError.forbidden('Tu acceso al sistema está desactivado'));
    }

    req.user = {
      userId: supabaseUser.id,
      email: supabaseUser.email || '',
      rol: dbUser?.rol || 'condoAdmin',
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware factory
 * Checks if user has required role(s)
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('No autenticado'));
    }

    if (roles.length > 0 && !roles.includes(req.user.rol)) {
      return next(
        AppError.forbidden('No tienes permisos para realizar esta acci\u00f3n')
      );
    }

    next();
  };
};
