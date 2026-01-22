import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { usuarios } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

/**
 * Get all users
 */
export const getAllUsuarios = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allUsuarios = await db
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
      .from(usuarios);

    res.status(200).json({
      status: 'success',
      results: allUsuarios.length,
      data: { usuarios: allUsuarios },
    });
  } catch (error) {
    logger.error('Error in getAllUsuarios:', error);
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUsuarioById = async (
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

    const [usuario] = await db
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
        updatedAt: usuarios.updatedAt,
      })
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1);

    if (!usuario) {
      return next(AppError.notFound('Usuario no encontrado'));
    }

    res.status(200).json({
      status: 'success',
      data: { usuario },
    });
  } catch (error) {
    logger.error('Error in getUsuarioById:', error);
    next(error);
  }
};

/**
 * Create a new user
 */
export const createUsuario = async (
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

    const { nombre, apellido, email, password, telefono, rol } = req.body;

    // Check if email already exists
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
    const [newUsuario] = await db
      .insert(usuarios)
      .values({
        nombre,
        apellido,
        email: email.toLowerCase(),
        password: hashedPassword,
        telefono,
        rol: rol || 'residente',
      })
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
        telefono: usuarios.telefono,
        rol: usuarios.rol,
        activo: usuarios.activo,
        createdAt: usuarios.createdAt,
      });

    logger.info(`User created: ${newUsuario.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Usuario creado exitosamente',
      data: { usuario: newUsuario },
    });
  } catch (error) {
    logger.error('Error in createUsuario:', error);
    next(error);
  }
};

/**
 * Update user
 */
export const updateUsuario = async (
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
    const { nombre, apellido, telefono, rol, activo } = req.body;

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1);

    if (!existingUser) {
      return next(AppError.notFound('Usuario no encontrado'));
    }

    // Update user
    const [updatedUsuario] = await db
      .update(usuarios)
      .set({
        ...(nombre && { nombre }),
        ...(apellido && { apellido }),
        ...(telefono !== undefined && { telefono }),
        ...(rol && { rol }),
        ...(activo !== undefined && { activo }),
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, id))
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
        telefono: usuarios.telefono,
        rol: usuarios.rol,
        activo: usuarios.activo,
        updatedAt: usuarios.updatedAt,
      });

    logger.info(`User updated: ${updatedUsuario.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Usuario actualizado exitosamente',
      data: { usuario: updatedUsuario },
    });
  } catch (error) {
    logger.error('Error in updateUsuario:', error);
    next(error);
  }
};

/**
 * Delete user (soft delete)
 */
export const deleteUsuario = async (
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

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1);

    if (!existingUser) {
      return next(AppError.notFound('Usuario no encontrado'));
    }

    // Soft delete (deactivate user)
    await db
      .update(usuarios)
      .set({
        activo: false,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, id));

    logger.info(`User deactivated: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Usuario desactivado exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteUsuario:', error);
    next(error);
  }
};
