import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { usuarios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { config } from '../../config/env';

/**
 * Register a new user
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { nombre, apellido, email, password, telefono, rol } = req.body;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return next(AppError.conflict('El email ya está registrado'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(usuarios)
      .values({
        nombre,
        apellido,
        email: email.toLowerCase(),
        password: hashedPassword,
        telefono,
        rol: rol || 'residente',
      })
      .returning();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, rol: newUser.rol },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration } as jwt.SignOptions
    );

    logger.info(`New user registered: ${newUser.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: newUser.id,
          nombre: newUser.nombre,
          apellido: newUser.apellido,
          email: newUser.email,
          rol: newUser.rol,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Error in register:', error);
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        AppError.unprocessableEntity('Errores de validación', errors.array())
      );
    }

    const { email, password } = req.body;

    // Find user
    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return next(AppError.unauthorized('Credenciales inválidas'));
    }

    // Check if user is active
    if (!user.activo) {
      return next(AppError.forbidden('Usuario desactivado'));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(AppError.unauthorized('Credenciales inválidas'));
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration } as jwt.SignOptions
    );

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          rol: user.rol,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Error in login:', error);
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
    const userId = (req as any).user?.userId;

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
        emailVerificado: usuarios.emailVerificado,
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

/**
 * Change password
 */
export const changePassword = async (
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

    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    // Get user
    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, userId))
      .limit(1);

    if (!user) {
      return next(AppError.notFound('Usuario no encontrado'));
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return next(AppError.unauthorized('Contraseña actual incorrecta'));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(usuarios)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, userId));

    logger.info(`Password changed for user: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    logger.error('Error in changePassword:', error);
    next(error);
  }
};
