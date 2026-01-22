import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { config } from '../config/env';

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
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(
        AppError.unauthorized('No se proporcionó token de autenticación')
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email: string;
        rol: string;
      };

      // Attach user to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        rol: decoded.rol,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(AppError.unauthorized('Token expirado'));
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return next(AppError.unauthorized('Token inválido'));
      }
      throw error;
    }
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

    if (!roles.includes(req.user.rol)) {
      return next(
        AppError.forbidden('No tienes permisos para realizar esta acción')
      );
    }

    next();
  };
};
