import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

/**
 * 404 Not Found middleware
 * Catches all unmatched routes and throws a 404 error
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = AppError.notFound(
    `Cannot ${req.method} ${req.originalUrl}`
  );
  next(error);
};
