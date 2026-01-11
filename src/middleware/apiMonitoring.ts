import { Request, Response, NextFunction } from 'express';
import { socketService } from '../services/SocketService';
import { logger } from '../config/logger';

interface RequestMetric {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    timestamp: string;
    fingerprint?: string;
    ip: string;
    userAgent: string;
}

interface ApiMetrics {
    totalRequests: number;
    requestsPerMinute: number;
    averageLatency: number;
    errorRate: number;
    statusCodes: {
        '2xx': number;
        '4xx': number;
        '5xx': number;
    };
    topEndpoints: Array<{ endpoint: string; count: number; avgLatency: number }>;
    slowestEndpoints: Array<{ endpoint: string; avgLatency: number }>;
}

export class ApiMonitoringService {
    private static instance: ApiMonitoringService;
    private metrics: RequestMetric[] = [];
    private readonly MAX_METRICS = 1000; // Garder les 1000 dernières requêtes
    private readonly WINDOW_SIZE = 60000; // 1 minute en ms

    private endpointStats = new Map<string, { count: number; totalTime: number }>();

    private constructor() {
        // Nettoyer les vieilles métriques toutes les minutes
        setInterval(() => this.cleanOldMetrics(), 60000);
    }

    public static getInstance(): ApiMonitoringService {
        if (!ApiMonitoringService.instance) {
            ApiMonitoringService.instance = new ApiMonitoringService();
        }
        return ApiMonitoringService.instance;
    }

    /**
     * Enregistre une nouvelle métrique de requête
     */
    public recordRequest(metric: RequestMetric): void {
        this.metrics.push(metric);

        // Limiter la taille du tableau
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics.shift();
        }

        // Mettre à jour les stats par endpoint
        const key = `${metric.method} ${metric.endpoint}`;
        const stats = this.endpointStats.get(key) || { count: 0, totalTime: 0 };
        stats.count++;
        stats.totalTime += metric.responseTime;
        this.endpointStats.set(key, stats);

        // Émettre les métriques en temps réel
        this.emitMetrics();
    }

    /**
     * Calcule et émet les métriques actuelles
     */
    private emitMetrics(): void {
        const now = Date.now();
        const oneMinuteAgo = now - this.WINDOW_SIZE;

        // Filtrer les requêtes de la dernière minute
        const recentMetrics = this.metrics.filter(m =>
            new Date(m.timestamp).getTime() > oneMinuteAgo
        );

        if (recentMetrics.length === 0) return;

        // Calculer les KPIs
        const totalRequests = recentMetrics.length;
        const requestsPerMinute = totalRequests; // Sur 1 minute

        const totalLatency = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
        const averageLatency = Math.round(totalLatency / totalRequests);

        const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
        const errorRate = Math.round((errorCount / totalRequests) * 100 * 100) / 100;

        // Compter les status codes
        const statusCodes = {
            '2xx': recentMetrics.filter(m => m.statusCode >= 200 && m.statusCode < 300).length,
            '4xx': recentMetrics.filter(m => m.statusCode >= 400 && m.statusCode < 500).length,
            '5xx': recentMetrics.filter(m => m.statusCode >= 500).length
        };

        // Top endpoints (les plus utilisés)
        const endpointCounts = new Map<string, number>();
        recentMetrics.forEach(m => {
            const key = `${m.method} ${m.endpoint}`;
            endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
        });

        const topEndpoints = Array.from(endpointCounts.entries())
            .map(([endpoint, count]) => {
                const stats = this.endpointStats.get(endpoint) || { count: 0, totalTime: 0 };
                return {
                    endpoint,
                    count,
                    avgLatency: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Slowest endpoints
        const slowestEndpoints = Array.from(this.endpointStats.entries())
            .map(([endpoint, stats]) => ({
                endpoint,
                avgLatency: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0
            }))
            .filter(e => e.avgLatency > 0)
            .sort((a, b) => b.avgLatency - a.avgLatency)
            .slice(0, 5);

        const metrics: ApiMetrics = {
            totalRequests,
            requestsPerMinute,
            averageLatency,
            errorRate,
            statusCodes,
            topEndpoints,
            slowestEndpoints
        };

        // Émettre vers le dashboard
        socketService.emitToDashboard('stats:api', metrics);
    }

    /**
     * Nettoie les métriques trop anciennes
     */
    private cleanOldMetrics(): void {
        const fiveMinutesAgo = Date.now() - (5 * 60000);
        this.metrics = this.metrics.filter(m =>
            new Date(m.timestamp).getTime() > fiveMinutesAgo
        );
    }

    /**
     * Récupère les métriques actuelles
     */
    public getMetrics(): RequestMetric[] {
        return [...this.metrics];
    }
}

export const apiMonitoringService = ApiMonitoringService.getInstance();

/**
 * Middleware Express pour monitorer les requêtes API
 */
export const apiMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Capturer la réponse
    const originalSend = res.send;
    res.send = function (data: any) {
        const responseTime = Date.now() - startTime;

        // Enregistrer la métrique
        const metric: RequestMetric = {
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            timestamp: new Date().toISOString(),
            fingerprint: (req as any).fingerprint?.hash,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown'
        };

        apiMonitoringService.recordRequest(metric);

        return originalSend.call(this, data);
    };

    next();
};
