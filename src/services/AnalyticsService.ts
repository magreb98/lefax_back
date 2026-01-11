
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entity/user';
import { Ecole } from '../entity/ecole';
import { socketService } from './SocketService';

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
}

export const analyticsService = AnalyticsService.getInstance();
