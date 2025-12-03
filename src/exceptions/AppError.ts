/**
 * Classe d'erreur personnalisée pour l'application
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintient la stack trace correcte
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreur de validation (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, true, code || 'VALIDATION_ERROR');
  }
}

/**
 * Erreur d'authentification (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié', code?: string) {
    super(message, 401, true, code || 'AUTHENTICATION_ERROR');
  }
}

/**
 * Erreur d'autorisation (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Accès refusé', code?: string) {
    super(message, 403, true, code || 'AUTHORIZATION_ERROR');
  }
}

/**
 * Erreur de ressource non trouvée (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée', code?: string) {
    super(message, 404, true, code || 'NOT_FOUND');
  }
}

/**
 * Erreur de conflit (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 409, true, code || 'CONFLICT_ERROR');
  }
}

/**
 * Erreur de limite dépassée (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Trop de requêtes', code?: string) {
    super(message, 429, true, code || 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Erreur interne du serveur (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Erreur interne du serveur', code?: string) {
    super(message, 500, false, code || 'INTERNAL_SERVER_ERROR');
  }
}
