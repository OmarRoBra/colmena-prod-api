import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../utils/appError';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error(
      `${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`
    );

    return res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
      ...(err.isOperational && { errors: err.errors }),
    });
  }

  // Error de programación o desconocido
  logger.error(
    `500 - ${err.message} - ${req.originalUrl} - ${req.method}`,
    err
  );

  return res.status(500).json({
    status: 'error',
    statusCode: 500,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
};
