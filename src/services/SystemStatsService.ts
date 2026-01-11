import * as si from 'systeminformation';
import { logger } from '../config/logger';

export interface SystemStats {
    cpu: {
        usage: number;
        cores: number;
        model: string;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        usagePercent: number;
    };
    uptime: number;
    timestamp: string;
}

export class SystemStatsService {
    private static instance: SystemStatsService;

    private constructor() { }

    public static getInstance(): SystemStatsService {
        if (!SystemStatsService.instance) {
            SystemStatsService.instance = new SystemStatsService();
        }
        return SystemStatsService.instance;
    }

    /**
     * Collecte les statistiques système actuelles
     */
    public async collectStats(): Promise<SystemStats> {
        try {
            const [cpuData, memData, timeData] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.time()
            ]);

            const cpuInfo = await si.cpu();
            const osInfo = await si.osInfo();

            return {
                cpu: {
                    usage: Math.round(cpuData.currentLoad * 100) / 100,
                    cores: cpuInfo.cores,
                    model: cpuInfo.manufacturer + ' ' + cpuInfo.brand
                },
                memory: {
                    total: memData.total,
                    used: memData.used,
                    free: memData.free,
                    usagePercent: Math.round((memData.used / memData.total) * 100 * 100) / 100
                },
                uptime: timeData.uptime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('[SystemStats] Error collecting system stats:', error);
            throw error;
        }
    }
}

export const systemStatsService = SystemStatsService.getInstance();
