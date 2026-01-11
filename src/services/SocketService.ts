import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import jwt from 'jsonwebtoken';
import { UserRole } from '../entity/user';

interface SocketAuthPayload {
    userId: string;
    role: UserRole;
}

export class SocketService {
    private static instance: SocketService;
    private io: Server | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public initialize(httpServer: HttpServer): void {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN || '*',
                methods: ['GET', 'POST'],
                credentials: true
            },
            path: '/socket.io'
        });

        // Middleware d'authentification
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }

                const secret = process.env.JWT_SECRET || 'your-secret-key';
                const decoded = jwt.verify(token, secret) as any;

                // Attacher les infos user à la socket
                (socket as any).user = {
                    userId: decoded.userId,
                    role: decoded.role
                };

                // Vérifier si SuperAdmin pour rejoindre le room dashboard
                // (On pourrait être plus permissif et filtrer les événements plus tard, mais sécurisons l'accès global pour l'instant)
                // if (decoded.role !== UserRole.SUPERADMIN) {
                //    return next(new Error('Unauthorized: SuperAdmin access only for now'));
                // }

                next();
            } catch (error) {
                logger.warn(`[Socket] Connection rejected: ${error}`);
                next(new Error('Authentication error: Invalid token'));
            }
        });

        this.io.on('connection', (socket: Socket) => {
            const user = (socket as any).user as SocketAuthPayload;
            logger.info(`[Socket] User connected: ${user.userId} (${user.role}) - ID: ${socket.id}`);

            // Rejoindre des rooms spécifiques selon le rôle
            if (user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN) {
                socket.join('dashboard-room');
                logger.info(`[Socket] User ${user.userId} joined dashboard-room`);
            }

            socket.on('disconnect', () => {
                logger.info(`[Socket] User disconnected: ${user.userId}`);
            });
        });
    }

    public getOnlineUserCount(): number {
        return this.io ? this.io.engine.clientsCount : 0;
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error('Socket.io not initialized. Call initialize first.');
        }
        return this.io;
    }

    /**
     * Emettre un événement vers le dashboard
     */
    public emitToDashboard(event: string, data: any): void {
        if (this.io) {
            this.io.to('dashboard-room').emit(event, data);
        }
    }

    /**
     * Emettre un message à tous les utilisateurs (Broadcast)
     */
    public broadcastMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
        if (this.io) {
            this.io.emit('admin:broadcast', {
                message,
                type,
                timestamp: new Date().toISOString()
            });
        }
    }
}

export const socketService = SocketService.getInstance();
