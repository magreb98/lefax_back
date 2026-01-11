// Analytics Persistence System
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entity/AuditLog';
import { SecurityEvent } from '../entity/SecurityEvent';
import { socketService } from './SocketService';
import { logger } from '../config/logger';

export class SecurityMonitoringService {
    private static instance: SecurityMonitoringService;
    private auditRepository = AppDataSource.getRepository(AuditLog);
    private securityRepository = AppDataSource.getRepository(SecurityEvent);

    // Cache pour limiter les écritures répétitives (DDoS)
    private failuresByIp = new Map<string, number>();
    private failuresByFingerprint = new Map<string, number>();

    private constructor() {
        // Nettoyage périodique du cache de limitation
        setInterval(() => this.cleanCache(), 3600000); // 1h
    }

    public static getInstance(): SecurityMonitoringService {
        if (!SecurityMonitoringService.instance) {
            SecurityMonitoringService.instance = new SecurityMonitoringService();
        }
        return SecurityMonitoringService.instance;
    }

    /**
     * Enregistre une tentative de login échouée
     */
    public async logLoginFailure(data: {
        email: string;
        ip: string;
        userAgent: string;
        reason: string;
        fingerprint?: string;
    }): Promise<void> {
        try {
            // Détection Brute Force (simple)
            const attempts = (this.failuresByIp.get(data.ip) || 0) + 1;
            this.failuresByIp.set(data.ip, attempts);

            let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
            if (attempts > 5) severity = 'MEDIUM';
            if (attempts > 10) severity = 'HIGH';
            if (attempts > 20) severity = 'CRITICAL';

            const event = this.securityRepository.create({
                type: 'LOGIN_FAILURE',
                severity,
                ip: data.ip,
                userAgent: data.userAgent,
                userEmail: data.email,
                details: { reason: data.reason, attempts, fingerprint: data.fingerprint }
            });

            await this.securityRepository.save(event);

            // Alerte temps réel si critique
            if (severity === 'HIGH' || severity === 'CRITICAL') {
                socketService.emitToDashboard('security:alert', {
                    type: 'BRUTE_FORCE_ATTEMPT',
                    message: `Suspicious activity from IP ${data.ip} (${attempts} attempts)`,
                    severity: 'HIGH'
                });
            }

            logger.warn(`[Security] Login failure logged for ${data.email} from ${data.ip}`);
        } catch (error) {
            logger.error('[Security] Failed to log security event:', error);
        }
    }

    /**
     * Enregistre une action d'audit
     */
    public async logAudit(data: {
        userId: string;
        userName: string;
        action: string;
        resource: string;
        resourceId?: string;
        ip: string;
        userAgent: string;
        details?: any;
    }): Promise<void> {
        try {
            const auditEntry = this.auditRepository.create({
                userId: data.userId,
                userName: data.userName,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                details: data.details,
                ip: data.ip,
                userAgent: data.userAgent
            });

            await this.auditRepository.save(auditEntry);

            // Notification temps réel
            socketService.emitToDashboard('audit:new', auditEntry);

        } catch (error) {
            logger.error('[Security] Failed to log audit entry:', error);
        }
    }

    /**
     * Récupère les derniers logs d'audit
     */
    public async getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
        return await this.auditRepository.find({
            order: { timestamp: 'DESC' },
            take: limit
        });
    }

    /**
     * Récupère les alertes de sécurité récentes
     */
    public async getRecentSecurityAlerts(limit: number = 20): Promise<SecurityEvent[]> {
        return await this.securityRepository.find({
            where: [
                { severity: 'MEDIUM' },
                { severity: 'HIGH' },
                { severity: 'CRITICAL' }
            ],
            order: { timestamp: 'DESC' },
            take: limit
        });
    }

    private cleanCache() {
        this.failuresByIp.clear();
        this.failuresByFingerprint.clear();
    }
}

export const securityMonitoringService = SecurityMonitoringService.getInstance();
