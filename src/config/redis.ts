import Redis from 'ioredis';
import { logger } from './logger';

// Configuration Redis
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};

// Créer le client Redis
export const redisClient = new Redis(redisConfig);

// Gestion des événements Redis
redisClient.on('connect', () => {
    logger.info('✅ Redis connecté avec succès');
});

redisClient.on('error', (err) => {
    logger.error('❌ Erreur Redis:', err);
});

redisClient.on('ready', () => {
    logger.info('✅ Redis prêt à recevoir des commandes');
});

/**
 * Service de cache avec Redis
 */
export class CacheService {
    private client: Redis;
    private defaultTTL: number = 3600; // 1 heure par défaut

    constructor(client: Redis) {
        this.client = client;
    }

    /**
     * Récupérer une valeur du cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error('Erreur lors de la récupération du cache:', error);
            return null;
        }
    }

    /**
     * Définir une valeur dans le cache
     */
    async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
        try {
            const serialized = JSON.stringify(value);
            await this.client.setex(key, ttl, serialized);
            return true;
        } catch (error) {
            logger.error('Erreur lors de la mise en cache:', error);
            return false;
        }
    }

    /**
     * Supprimer une clé du cache
     */
    async delete(key: string): Promise<boolean> {
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error('Erreur lors de la suppression du cache:', error);
            return false;
        }
    }

    /**
     * Supprimer plusieurs clés par pattern
     */
    async deletePattern(pattern: string): Promise<number> {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) return 0;
            return await this.client.del(...keys);
        } catch (error) {
            logger.error('Erreur lors de la suppression par pattern:', error);
            return 0;
        }
    }

    /**
     * Vérifier si une clé existe
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error('Erreur lors de la vérification du cache:', error);
            return false;
        }
    }

    /**
     * Définir un TTL sur une clé existante
     */
    async expire(key: string, ttl: number): Promise<boolean> {
        try {
            await this.client.expire(key, ttl);
            return true;
        } catch (error) {
            logger.error('Erreur lors de la définition du TTL:', error);
            return false;
        }
    }

    /**
     * Incrémenter une valeur
     */
    async increment(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (error) {
            logger.error('Erreur lors de l\'incrémentation:', error);
            return 0;
        }
    }

    /**
     * Vider tout le cache
     */
    async flush(): Promise<boolean> {
        try {
            await this.client.flushdb();
            return true;
        } catch (error) {
            logger.error('Erreur lors du vidage du cache:', error);
            return false;
        }
    }
}

// Instance singleton du service de cache
export const cacheService = new CacheService(redisClient);

export default cacheService;
