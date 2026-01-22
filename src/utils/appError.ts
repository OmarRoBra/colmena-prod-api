/**
 * Custom Application Error class for operational errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any[];

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: any[]
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Creates a 400 Bad Request error
   */
  static badRequest(message: string = 'Bad request', errors?: any[]): AppError {
    return new AppError(message, 400, true, errors);
  }

  /**
   * Creates a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, 401, true);
  }

  /**
   * Creates a 403 Forbidden error
   */
  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, 403, true);
  }

  /**
   * Creates a 404 Not Found error
   */
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, 404, true);
  }

  /**
   * Creates a 409 Conflict error
   */
  static conflict(message: string = 'Conflict'): AppError {
    return new AppError(message, 409, true);
  }

  /**
   * Creates a 422 Unprocessable Entity error
   */
  static unprocessableEntity(message: string = 'Unprocessable entity', errors?: any[]): AppError {
    return new AppError(message, 422, true, errors);
  }

  /**
   * Creates a 500 Internal Server Error
   */
  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, 500, false);
  }
}
