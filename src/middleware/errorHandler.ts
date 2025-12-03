import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/AppError';
import { logger } from '../config/logger';

/**
 * Interface pour les réponses d'erreur standardisées
 */
interface ErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
        statusCode: number;
        stack?: string;
    };
}

/**
 * Middleware global de gestion des erreurs
 * Doit être le dernier middleware dans la chaîne
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Valeurs par défaut
    let statusCode = 500;
    let message = 'Erreur interne du serveur';
    let code = 'INTERNAL_SERVER_ERROR';
    let isOperational = false;

    // Si c'est une AppError personnalisée
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code || code;
        isOperational = err.isOperational;
    }

    // Log de l'erreur
    if (isOperational) {
        logger.warn({
            message: err.message,
            code,
            statusCode,
            path: req.path,
            method: req.method,
            ip: req.ip,
        });
    } else {
        logger.error({
            message: err.message,
            code,
            statusCode,
            path: req.path,
            method: req.method,
            ip: req.ip,
            stack: err.stack,
        });
    }

    // Construction de la réponse
    const errorResponse: ErrorResponse = {
        success: false,
        error: {
            message,
            code,
            statusCode,
        },
    };

    // Ajouter la stack trace en développement
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
    }

    // Envoyer la réponse
    res.status(statusCode).json(errorResponse);
};

/**
 * Middleware pour gérer les routes non trouvées (404)
 * ⚠️ IMPORTANT: Ce middleware doit être placé APRÈS toutes les routes définies
 * mais AVANT le errorHandler
 */
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // ✅ Vérifier si une réponse a déjà été envoyée
    if (res.headersSent) {
        return next();
    }

    const error = new AppError(
        `Route ${req.method} ${req.path} non trouvée`,
        404,
        true,
        'ROUTE_NOT_FOUND'
    );
    next(error);
};

/**
 * Wrapper pour les fonctions async dans les routes
 * Permet de capturer automatiquement les erreurs
 */
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};