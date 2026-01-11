
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entity/user';
import { Ecole } from '../entity/ecole';
import { socketService } from './SocketService';
import { logger } from '../config/logger';
import { DailyMetrics } from '../entity/DailyMetrics';

export interface SchoolStats {
    schoolId: string;
    schoolName: string;
    totalUsers: number;
    activeUsers: number; // Connectés dans les 7 derniers jours
    usageRate: number;
}

export interface GlobalStats {
    totalUsers: number;
    totalSchools: number;
    onlineUsers: number; // Temps réel via Socket
    activeUsers7Days: number; // Ayant un lastLogin < 7 jours
    usersByRole: { role: string; count: number }[];
}

export class AnalyticsService {
    private static instance: AnalyticsService;
    private userRepository = AppDataSource.getRepository(User);
    private schoolRepository = AppDataSource.getRepository(Ecole);
    private dailyMetricsRepository = AppDataSource.getRepository(DailyMetrics);

    private constructor() { }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /**
     * Récupère les statistiques globales
     */
    public async getGlobalStats(): Promise<GlobalStats> {
        const totalSchools = await this.schoolRepository.count();
        const totalUsers = await this.userRepository.count();

        // Utilisateurs actifs (lastLogin > 7 jours)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeUsers7Days = await this.userRepository
            .createQueryBuilder("user")
            .where("user.lastLogin >= :date", { date: sevenDaysAgo })
            .getCount();

        // Distribution par rôle
        const rolesDistribution = await this.userRepository
            .createQueryBuilder("user")
            .select("user.role", "role")
            .addSelect("COUNT(*)", "count")
            .groupBy("user.role")
            .getRawMany();

        return {
            totalUsers,
            totalSchools,
            onlineUsers: socketService.getOnlineUserCount(),
            activeUsers7Days,
            usersByRole: rolesDistribution.map((r: any) => ({ role: r.role, count: parseInt(r.count) }))
        };
    }

    /**
     * Récupère les statistiques par école
     */
    public async getSchoolStats(): Promise<SchoolStats[]> {
        const stats = await this.schoolRepository
            .createQueryBuilder("school")
            .leftJoin(User, "user", "user.school_id = school.id")
            .select("school.id", "schoolId")
            .addSelect("school.schoolName", "schoolName")
            .addSelect("COUNT(user.id)", "totalUsers")
            .addSelect("SUM(CASE WHEN user.lastLogin >= :date THEN 1 ELSE 0 END)", "activeUsers")
            .setParameter("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            .groupBy("school.id")
            .addGroupBy("school.schoolName")
            .getRawMany();

        return stats.map((s: any) => ({
            schoolId: s.schoolId,
            schoolName: s.schoolName,
            totalUsers: parseInt(s.totalUsers),
            activeUsers: parseInt(s.activeUsers || 0),
            usageRate: parseInt(s.totalUsers) > 0 ? Math.round((parseInt(s.activeUsers || 0) / parseInt(s.totalUsers)) * 100) : 0
        }));
    }

    /**
     * Archive les métriques journalières
     */
    public async archiveDailyMetrics(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];

        // Vérifier si déjà archivé
        const existing = await this.dailyMetricsRepository.findOne({ where: { date: today } });

        if (existing) {
            logger.info(`[Analytics] Metrics for ${today} already archived.`);
            return;
        }

        logger.info(`[Analytics] Archiving metrics for ${today}...`);

        const globalStats = await this.getGlobalStats();

        // Simuler des métriques de trafic (à connecter avec un vrai monitoring HTTP plus tard)
        const trafficMetrics = {
            totalRequests: Math.floor(Math.random() * 10000) + 1000, // Placeholder
            avgLatency: Math.random() * 200, // Placeholder
            maxRequestsPerMinute: Math.floor(Math.random() * 500) // Placeholder
        };

        const dailyMetric = this.dailyMetricsRepository.create({
            date: today,
            totalUsers: globalStats.totalUsers,
            totalSchools: globalStats.totalSchools,
            activeUsers: globalStats.activeUsers7Days,
            newUsers: 0, // À calculer via createdAt
            totalRequests: trafficMetrics.totalRequests,
            avgLatency: trafficMetrics.avgLatency,
            maxRequestsPerMinute: trafficMetrics.maxRequestsPerMinute,
            errorRate: Math.random() * 2, // Placeholder 2%
            statusCodes: { '2xx': 90, '4xx': 8, '5xx': 2 }, // Placeholder
            topEndpoints: [{ endpoint: '/api/users', count: 1500 }, { endpoint: '/api/auth/login', count: 800 }] // Placeholder
        });

        await this.dailyMetricsRepository.save(dailyMetric);
        logger.info(`[Analytics] Metrics archived successfully for ${today}`);
    }
}

export const analyticsService = AnalyticsService.getInstance();
