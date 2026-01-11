import { systemStatsService } from './SystemStatsService';
import { databaseStatsService } from './DatabaseStatsService';
import { socketService } from './SocketService';
import { logger } from '../config/logger';
import { analyticsService } from './AnalyticsService';

export class MonitoringService {
    private static instance: MonitoringService;
    private intervalId: NodeJS.Timeout | null = null;
    private analyticsIntervalId: NodeJS.Timeout | null = null; // Added for analytics interval
    private isRunning: boolean = false; // Added isRunning flag
    private readonly EMIT_INTERVAL = 5000; // 5 secondes

    private constructor() { }

    public static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    /**
     * Démarre la collecte et l'émission périodique des stats
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('[Monitoring] Service already running');
            return;
        }
        this.isRunning = true;

        logger.info('🚀 Monitoring Service Started');

        // Stats Système (Toutes les 5s)
        this.intervalId = setInterval(async () => {
            try {
                const systemStats = await systemStatsService.collectStats();
                const dbStats = await databaseStatsService.collectStats();

                socketService.emitToDashboard('stats:system', {
                    system: systemStats,
                    database: dbStats
                });
            } catch (error) {
                logger.error('[Monitoring] Error collecting system stats:', error);
            }
        }, 5000);

        // Stats Analytics / BI (Toutes les 30s)
        this.analyticsIntervalId = setInterval(async () => { // Storing analytics interval ID
            try {
                const globalStats = await analyticsService.getGlobalStats();
                const schoolStats = await analyticsService.getSchoolStats();

                socketService.emitToDashboard('stats:analytics', {
                    global: globalStats,
                    schools: schoolStats
                });
            } catch (error) {
                logger.error('[Monitoring] Error collecting analytics stats:', error);
            }
        }, 30000);

        logger.info(`✅ [Monitoring] Service started (system interval: 5000ms, analytics interval: 30000ms)`);
    }

    /**
     * Arrête la collecte périodique
     */
    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('[Monitoring] Service stopped');
        }
    }

    /**
     * Collecte et émet les statistiques
     */
    private async collectAndEmit(): Promise<void> {
        try {
            const [systemStats, dbStats] = await Promise.all([
                systemStatsService.collectStats(),
                databaseStatsService.collectStats()
            ]);

            // Émettre vers le dashboard
            socketService.emitToDashboard('stats:system', {
                system: systemStats,
                database: dbStats
            });

        } catch (error) {
            logger.error('[Monitoring] Error collecting/emitting stats:', error);
        }
    }
}

export const monitoringService = MonitoringService.getInstance();
