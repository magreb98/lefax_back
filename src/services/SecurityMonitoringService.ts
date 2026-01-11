import { socketService } from './SocketService';
import { logger } from '../config/logger';

export interface LoginFailure {
    userId?: string;
    email: string;
    ip: string;
    fingerprint?: string;
    userAgent: string;
    timestamp: string;
    reason: string;
}

export interface AuditLogEntry {
    userId: string;
    userName: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
    resource: string;
    resourceId?: string;
    details?: any;
    ip: string;
    fingerprint?: string;
    userAgent: string;
    timestamp: string;
}

export class SecurityMonitoringService {
    private static instance: SecurityMonitoringService;
    private loginFailures: LoginFailure[] = [];
    private auditLog: AuditLogEntry[] = [];
    private readonly MAX_ENTRIES = 500;

    // Tracking des tentatives par IP/Fingerprint
    private failuresByIp = new Map<string, number>();
    private failuresByFingerprint = new Map<string, number>();

    private constructor() {
        // Nettoyer les anciennes entrées toutes les heures
        setInterval(() => this.cleanOldEntries(), 3600000);
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
    public recordLoginFailure(failure: LoginFailure): void {
        this.loginFailures.push(failure);

        // Limiter la taille
        if (this.loginFailures.length > this.MAX_ENTRIES) {
            this.loginFailures.shift();
        }

        // Compter les échecs par IP
        const ipCount = (this.failuresByIp.get(failure.ip) || 0) + 1;
        this.failuresByIp.set(failure.ip, ipCount);

        // Compter les échecs par Fingerprint
        if (failure.fingerprint) {
            const fpCount = (this.failuresByFingerprint.get(failure.fingerprint) || 0) + 1;
            this.failuresByFingerprint.set(failure.fingerprint, fpCount);
        }

        // Émettre l'alerte
        socketService.emitToDashboard('security:login-failure', {
            failure,
            ipFailureCount: ipCount,
            fingerprintFailureCount: failure.fingerprint ? this.failuresByFingerprint.get(failure.fingerprint) : 0
        });

        // Alerte si bruteforce détecté
        if (ipCount >= 5 || (failure.fingerprint && this.failuresByFingerprint.get(failure.fingerprint)! >= 5)) {
            socketService.emitToDashboard('security:alert', {
                type: 'BRUTEFORCE_DETECTED',
                ip: failure.ip,
                fingerprint: failure.fingerprint,
                count: Math.max(ipCount, failure.fingerprint ? this.failuresByFingerprint.get(failure.fingerprint)! : 0),
                timestamp: new Date().toISOString()
            });

            logger.warn(`[Security] Bruteforce detected - IP: ${failure.ip}, Fingerprint: ${failure.fingerprint}`);
        }
    }

    /**
     * Enregistre une action dans l'audit log
     */
    public recordAuditLog(entry: AuditLogEntry): void {
        this.auditLog.push(entry);

        // Limiter la taille
        if (this.auditLog.length > this.MAX_ENTRIES) {
            this.auditLog.shift();
        }

        // Émettre vers le dashboard
        socketService.emitToDashboard('audit:log', entry);

        logger.info(`[Audit] ${entry.userName} (${entry.userId}) - ${entry.action} ${entry.resource} ${entry.resourceId || ''}`);
    }

    /**
     * Récupère les échecs de login récents
     */
    public getRecentLoginFailures(limit: number = 50): LoginFailure[] {
        return this.loginFailures.slice(-limit);
    }

    /**
     * Récupère l'audit log récent
     */
    public getRecentAuditLog(limit: number = 50): AuditLogEntry[] {
        return this.auditLog.slice(-limit);
    }

    /**
     * Récupère les IPs suspectes (avec le plus d'échecs)
     */
    public getSuspiciousIps(limit: number = 10): Array<{ ip: string; failureCount: number }> {
        return Array.from(this.failuresByIp.entries())
            .map(([ip, count]) => ({ ip, failureCount: count }))
            .sort((a, b) => b.failureCount - a.failureCount)
            .slice(0, limit);
    }

    /**
     * Nettoie les anciennes entrées
     */
    private cleanOldEntries(): void {
        const oneHourAgo = Date.now() - 3600000;

        this.loginFailures = this.loginFailures.filter(f =>
            new Date(f.timestamp).getTime() > oneHourAgo
        );

        this.auditLog = this.auditLog.filter(e =>
            new Date(e.timestamp).getTime() > oneHourAgo
        );

        // Réinitialiser les compteurs
        this.failuresByIp.clear();
        this.failuresByFingerprint.clear();
    }
}

export const securityMonitoringService = SecurityMonitoringService.getInstance();
