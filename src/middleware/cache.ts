import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Options pour le middleware de cache
 */
interface CacheOptions {
    ttl?: number; // Durée de vie en secondes
    keyGenerator?: (req: Request) => string; // Fonction pour générer la clé de cache
    condition?: (req: Request) => boolean; // Condition pour activer le cache
}

/**
 * Middleware de cache pour les routes GET
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
    const {
        ttl = 300, // 5 minutes par défaut
        keyGenerator = (req: Request) => `cache:${req.method}:${req.originalUrl}`,
        condition = (req: Request) => req.method === 'GET',
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        // Vérifier la condition
        if (!condition(req)) {
            return next();
        }

        // Générer la clé de cache
        const cacheKey = keyGenerator(req);

        try {
            // Chercher dans le cache
            const cachedData = await cacheService.get(cacheKey);

            if (cachedData) {
                logger.debug(`Cache hit: ${cacheKey}`);
                return res.json(cachedData);
            }

            logger.debug(`Cache miss: ${cacheKey}`);

            // Sauvegarder la méthode json originale
            const originalJson = res.json.bind(res);

            // Surcharger res.json pour mettre en cache
            res.json = function (data: any) {
                // Mettre en cache uniquement les réponses réussies
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    cacheService.set(cacheKey, data, ttl).catch((err) => {
                        logger.error('Erreur lors de la mise en cache:', err);
                    });
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            logger.error('Erreur dans le middleware de cache:', error);
            next();
        }
    };
};

/**
 * Middleware pour invalider le cache après modification
 */
export const invalidateCacheMiddleware = (patterns: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Sauvegarder la méthode json originale
        const originalJson = res.json.bind(res);

        // Surcharger res.json pour invalider le cache après la réponse
        res.json = function (data: any) {
            // Invalider le cache uniquement pour les modifications réussies
            if (res.statusCode >= 200 && res.statusCode < 300) {
                Promise.all(
                    patterns.map((pattern) => cacheService.deletePattern(pattern))
                ).catch((err) => {
                    logger.error('Erreur lors de l\'invalidation du cache:', err);
                });
            }
            return originalJson(data);
        };

        next();
    };
};
