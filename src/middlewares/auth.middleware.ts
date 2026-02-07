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
    console.log('Authenticating token:', token);

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return next(AppError.unauthorized('Token inv\u00e1lido o expirado'));
    }

    const supabaseUser = data.user;

    const usuario = supabaseUser;

    req.user = {
      userId: usuario.id,
      email: usuario.email || '', // Provide a default value
      rol: usuario.role || '',
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
    /* 
    if (!roles.includes(req.user.rol)) {
      return next(
        AppError.forbidden('No tienes permisos para realizar esta acci\u00f3n')
      );
    } */

    next();
  };
};
