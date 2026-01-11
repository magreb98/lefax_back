import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { AppDataSource } from './config/database';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import { GroupePartage, GroupePartageType } from './entity/groupe.partage';
import { User } from './entity/user';
import { logger, requestLogger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
// import { redisClient } from './config/redis'; // DISABLED
import swaggerJsdoc from 'swagger-jsdoc';
import { createServer } from 'http';
import { socketService } from './services/SocketService';

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express(); // trigger restart

// ===== CONFIGURATION SWAGGER =====
import { swaggerOptions } from './config/swagger.config';

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ===== MIDDLEWARES DE SÉCURITÉ =====
// Helmet pour sécuriser les headers HTTP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['x-refresh-token'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Fingerprinting pour identifier les devices
const Fingerprint = require('express-fingerprint');
app.use(Fingerprint({
  parameters: [
    Fingerprint.useragent,
    Fingerprint.acceptHeaders,
    Fingerprint.geoip
  ]
}));

// API Monitoring (doit être après fingerprint)
import { apiMonitoringMiddleware } from './middleware/apiMonitoring';
app.use(apiMonitoringMiddleware);

// Logger HTTP
app.use(requestLogger);

// Rate limiting global
app.use('/api', apiLimiter);

// ===== ROUTES =====
// Documentation Swagger avec options personnalisées
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Lefax API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    }
  }
};

app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// JSON brut de la spec Swagger (pour import dans Postman, etc.)
app.get('/api/docs-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Middleware de debug - TEMPORAIRE
app.use((req, res, next) => {
  console.log('='.repeat(50));
  console.log(`📨 Requête reçue: ${req.method} ${req.path}`);
  console.log(`📍 URL complète: ${req.originalUrl}`);
  console.log(`🔍 Base URL: ${req.baseUrl}`);
  console.log('='.repeat(50));
  next();
});

// Routes API
app.use('/api', routes);

// Middleware pour vérifier si la route a été traitée
app.use((req, res, next) => {
  console.log('⚠️ Route non interceptée par /api:', req.method, req.path);
  next();
});

// ===== GESTION DES ERREURS =====
// ⚠️ CRITIQUE: Ces middlewares doivent être APRÈS toutes les routes
// Route non trouvée (404) - Attrape toutes les routes non définies
app.use(notFoundHandler);

// Gestionnaire d'erreurs global - TOUJOURS EN DERNIER
app.use(errorHandler);

// ===== INITIALISATION =====
const initializeApp = async () => {
  try {
    // Connexion à la base de données
    await AppDataSource.initialize();
    logger.info('✅ Base de données connectée avec succès');

    // Register background job listeners
    const { registerServiceListeners } = await import('./services/serviceListeners');
    registerServiceListeners();

    // Initialisation de l'index OpenSearch
    const { openSearchService } = await import('./services/OpenSearchService');
    await openSearchService.initializeIndex();

    // 🌱 Seed des utilisateurs par défaut
    const { seedDefaultUsers } = await import('./scripts/seedDefaultUsers');
    await seedDefaultUsers();

    // Initialisation du groupe public
    const groupeRepo = AppDataSource.getRepository(GroupePartage);
    const userRepo = AppDataSource.getRepository(User);

    // Créer ou récupérer l'utilisateur système
    let systemUser = await userRepo.findOne({
      where: { email: 'system@lefax.internal' }
    });

    if (!systemUser) {
      logger.info('⚙️ Création de l\'utilisateur système...');
      systemUser = userRepo.create({
        firstName: 'System',
        lastName: 'User',
        phoneNumber: '000000000',
        email: 'system@lefax.internal',
        password: 'SYSTEM_USER_NO_LOGIN',
        role: 'SUPERADMIN' as any
      });
      await userRepo.save(systemUser);
      logger.info('✅ Utilisateur système créé.');
    }

    let publicGroup = await groupeRepo.findOne({
      where: { groupeName: 'public' },
      relations: ['users', 'owner'],
    });

    if (!publicGroup) {
      logger.info('⚙️ Création du groupe de partage "public"...');
      publicGroup = groupeRepo.create({
        groupeName: 'public',
        description: 'Groupe de partage public par défaut contenant tous les utilisateurs.',
        type: GroupePartageType.CUSTOM,
        owner: systemUser
      });
      await groupeRepo.save(publicGroup);
      logger.info('✅ Groupe "public" créé.');
    } else if (!publicGroup.owner) {
      // Si le groupe existe mais n'a pas d'owner, assigner le système
      publicGroup.owner = systemUser;
      await groupeRepo.save(publicGroup);
      logger.info('✅ Propriétaire système assigné au groupe "public".');
    }

    const allUsers = await userRepo.find();
    if (allUsers.length > 0) {
      const newUsers = allUsers.filter(
        (user) => !publicGroup.users?.some((u) => u.id === user.id)
      );

      if (newUsers.length > 0) {
        publicGroup.users = [...(publicGroup.users || []), ...newUsers];
        await groupeRepo.save(publicGroup);
        logger.info(`✅ ${newUsers.length} utilisateur(s) ajouté(s) au groupe "public".`);
      } else {
        logger.info('ℹ️ Tous les utilisateurs sont déjà dans le groupe "public".');
      }
    } else {
      logger.info('ℹ️ Aucun utilisateur à ajouter pour le moment.');
    }

    // Démarrage du serveur HTTP (compatible Socket.io)
    const httpServer = createServer(app);

    httpServer.listen(PORT, async () => {
      logger.info(`🚀 Serveur HTTP & Socket.io démarré sur le port ${PORT}`);
      logger.info(`📘 Documentation Swagger: http://localhost:${PORT}/api/docs`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
      logger.info(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);

      // Initialiser le service Socket.io
      socketService.initialize(httpServer);

      // Démarrer le service de monitoring (émet stats toutes les 5s)
      const { monitoringService } = await import('./services/MonitoringService');
      monitoringService.start();

      // Log des routes principales pour debug
      logger.info('📍 Routes disponibles:');
      logger.info('   POST   /api/users/register');
      logger.info('   GET    /api/users');
      logger.info('   GET    /api/users/:id');
      logger.info('   ... voir /api/docs pour la liste complète');
    });
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
    process.exit(1);
  }
};

// Gestion des erreurs non gérées
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', async () => {
  logger.info('SIGTERM reçu, arrêt gracieux...');
  await AppDataSource.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT reçu, arrêt gracieux...');
  await AppDataSource.destroy();
  process.exit(0);
});

// Démarrer l'application
initializeApp();

export default app;