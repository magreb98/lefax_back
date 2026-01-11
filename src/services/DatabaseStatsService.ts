import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';

export interface DatabaseStats {
    connections: {
        active: number;
        idle: number;
    };
    timestamp: string;
}

export class DatabaseStatsService {
    private static instance: DatabaseStatsService;

    private constructor() { }

    public static getInstance(): DatabaseStatsService {
        if (!DatabaseStatsService.instance) {
            DatabaseStatsService.instance = new DatabaseStatsService();
        }
        return DatabaseStatsService.instance;
    }

    /**
     * Collecte les statistiques de la base de données
     */
    public async collectStats(): Promise<DatabaseStats> {
        try {
            // TypeORM ne fournit pas directement le nombre de connexions actives
            // On peut interroger MySQL directement pour obtenir ces infos
            const result = await AppDataSource.query(`
                SELECT 
                    COUNT(*) as total_connections,
                    SUM(CASE WHEN command = 'Sleep' THEN 1 ELSE 0 END) as idle_connections,
                    SUM(CASE WHEN command != 'Sleep' THEN 1 ELSE 0 END) as active_connections
                FROM information_schema.processlist
                WHERE db = DATABASE()
            `);

            const stats = result[0] || { active_connections: 0, idle_connections: 0 };

            return {
                connections: {
                    active: parseInt(stats.active_connections) || 0,
                    idle: parseInt(stats.idle_connections) || 0
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('[DatabaseStats] Error collecting database stats:', error);
            // Retourner des valeurs par défaut en cas d'erreur
            return {
                connections: {
                    active: 0,
                    idle: 0
                },
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const databaseStatsService = DatabaseStatsService.getInstance();
