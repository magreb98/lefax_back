import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../exceptions/AppError';

/**
 * Rate limiter général pour l'API
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000000, // Limite de 100 requêtes par fenêtre
    message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.',
    standardHeaders: true, // Retourner les informations dans les headers `RateLimit-*`
    legacyHeaders: false, // Désactiver les headers `X-RateLimit-*`
    handler: (req, res) => {
        throw new RateLimitError('Trop de requêtes, veuillez réessayer plus tard.');
    },
});

/**
 * Rate limiter strict pour l'authentification
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limite de 5 tentatives de connexion
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
    skipSuccessfulRequests: true, // Ne pas compter les requêtes réussies
    handler: (req, res) => {
        throw new RateLimitError('Trop de tentatives de connexion. Veuillez réessayer plus tard.');
    },
});

/**
 * Rate limiter pour les uploads de fichiers
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 20, // Limite de 20 uploads par heure
    message: 'Trop d\'uploads de fichiers, veuillez réessayer plus tard.',
    handler: (req, res) => {
        throw new RateLimitError('Limite d\'upload atteinte. Veuillez réessayer plus tard.');
    },
});

/**
 * Rate limiter pour la création de ressources
 */
export const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 30, // Limite de 30 créations par heure
    message: 'Trop de créations de ressources, veuillez réessayer plus tard.',
    handler: (req, res) => {
        throw new RateLimitError('Limite de création atteinte. Veuillez réessayer plus tard.');
    },
});
