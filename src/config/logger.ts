import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Définir le format des logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Format pour la console (plus lisible)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(process.cwd(), 'logs');

// Configuration de la rotation des fichiers
const fileRotateTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
});

const errorFileRotateTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: logFormat,
});

// Créer le logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Fichiers avec rotation
        fileRotateTransport,
        errorFileRotateTransport,
    ],
    // Ne pas quitter sur les erreurs non gérées
    exitOnError: false,
});

// Ajouter la console en développement
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
        })
    );
}

// Logger pour les requêtes HTTP
export const httpLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'http-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d',
        }),
    ],
});

// Middleware pour logger les requêtes HTTP
export const requestLogger = (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        httpLogger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
    });

    next();
};

export default logger;
