# Guide de Démarrage - Lefax Backend

## 🚀 Installation et Configuration

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration de l'environnement

Copiez le fichier `.env.example` vers `.env` et configurez vos variables:

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos paramètres:

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=lefax_db

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

# Redis (optionnel pour le cache)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Configuration de la base de données

Créez la base de données MySQL:

```sql
CREATE DATABASE lefax_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Installation de Redis (optionnel mais recommandé)

**Windows:**
```bash
# Télécharger depuis https://github.com/microsoftarchive/redis/releases
# Ou utiliser WSL/Docker
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Mac
brew install redis
```

Démarrer Redis:
```bash
redis-server
```

## 🏃 Démarrage

### Mode développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### Mode production

```bash
# Build
npm run build

# Start
npm start
```

## 📚 Documentation API

Une fois le serveur démarré, accédez à:

- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## 🧪 Tests

```bash
# Exécuter tous les tests
npm test

# Mode watch
npm run test:watch

# Avec coverage
npm run test:coverage
```

## 🗄️ Migrations de Base de Données

### Générer une migration

```bash
npm run migration:generate -- src/migrations/MigrationName
```

### Exécuter les migrations

```bash
npm run migration:run
```

### Annuler la dernière migration

```bash
npm run migration:revert
```

## 📋 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarre le serveur en mode développement avec hot-reload |
| `npm run build` | Compile TypeScript vers JavaScript |
| `npm start` | Démarre le serveur en mode production |
| `npm test` | Exécute les tests |
| `npm run test:watch` | Exécute les tests en mode watch |
| `npm run test:coverage` | Génère un rapport de couverture |
| `npm run migration:generate` | Génère une nouvelle migration |
| `npm run migration:run` | Exécute les migrations |
| `npm run migration:revert` | Annule la dernière migration |
| `npm run generate-postman` | Génère une collection Postman |

## 🔒 Sécurité

### Fonctionnalités de sécurité implémentées:

- ✅ **Helmet.js** - Protection des headers HTTP
- ✅ **Rate Limiting** - Protection contre les abus
  - API générale: 100 req/15min
  - Authentification: 5 req/15min
  - Upload: 20 req/heure
- ✅ **CORS** - Configuration CORS sécurisée
- ✅ **Validation** - Validation stricte des entrées
- ✅ **JWT** - Authentification par tokens
- ✅ **Bcrypt** - Hashage des mots de passe

## 📊 Logging

Les logs sont automatiquement générés dans le dossier `logs/`:

- `application-YYYY-MM-DD.log` - Logs généraux (conservés 14 jours)
- `error-YYYY-MM-DD.log` - Logs d'erreurs (conservés 30 jours)
- `http-YYYY-MM-DD.log` - Logs HTTP (conservés 7 jours)

## 💾 Cache Redis

Le cache est automatiquement utilisé sur les endpoints GET. Configuration:

- TTL par défaut: 5 minutes
- Invalidation automatique lors des modifications
- Patterns de cache: `cache:METHOD:URL`

## 🏗️ Structure du Projet

```
src/
├── app.ts                    # Point d'entrée
├── config/                   # Configuration
│   ├── database.ts          # Configuration TypeORM
│   ├── dataSource.ts        # DataSource pour migrations
│   ├── logger.ts            # Configuration Winston
│   └── redis.ts             # Configuration Redis
├── controllers/             # Contrôleurs (10 fichiers)
├── dtos/                    # Data Transfer Objects
├── entity/                  # Entités TypeORM (10 fichiers)
├── exceptions/              # Classes d'erreurs personnalisées
├── middleware/              # Middlewares
│   ├── auth.ts             # Authentification JWT
│   ├── cache.ts            # Cache Redis
│   ├── errorHandler.ts     # Gestion globale des erreurs
│   ├── rateLimiter.ts      # Rate limiting
│   ├── role.ts             # Vérification des rôles
│   ├── upload.ts           # Upload de fichiers
│   └── validateDto.ts      # Validation des DTOs
├── routes/                  # Routes (9 fichiers)
├── services/                # Services métier (3 fichiers)
├── types/                   # Types TypeScript
└── util/                    # Utilitaires
    ├── helper.ts
    └── pagination.ts        # Utilitaire de pagination
```

## 🆕 Nouveautés Implémentées

### Sécurité
- Helmet.js pour les headers HTTP sécurisés
- Rate limiting sur tous les endpoints
- Validation stricte des fichiers uploadés
- CORS configuré

### Logging
- Winston avec rotation quotidienne des logs
- Logs HTTP automatiques
- Logs d'erreurs séparés
- Niveaux de log configurables

### Cache
- Redis pour le cache
- Middleware de cache automatique
- Invalidation intelligente du cache
- TTL configurable

### Gestion d'Erreurs
- Classes d'erreurs personnalisées
- Middleware global de gestion d'erreurs
- Réponses d'erreur standardisées
- Wrapper async pour les routes

### Pagination
- Utilitaire de pagination réutilisable
- Paramètres standardisés (page, limit)
- Métadonnées de pagination complètes
- Limite maximale configurable

### Tests
- Configuration Jest
- Tests unitaires
- Tests d'intégration
- Coverage reporting

### Notifications
- NotificationController complet
- Routes CRUD pour notifications
- Filtrage par type et groupe
- Pagination des notifications

### Migrations
- Configuration TypeORM pour migrations
- Scripts npm pour gérer les migrations
- Synchronize désactivé en production

## 🔧 Dépannage

### Erreur de connexion à la base de données

Vérifiez que:
1. MySQL est démarré
2. Les credentials dans `.env` sont corrects
3. La base de données existe

### Erreur de connexion à Redis

Si Redis n'est pas disponible, le serveur démarre quand même mais le cache ne fonctionnera pas.

Pour désactiver Redis temporairement, commentez l'import dans `app.ts`.

### Erreur de port déjà utilisé

Changez le port dans `.env`:
```env
PORT=3001
```

## 📞 Support

Pour toute question ou problème, consultez:
- Documentation Swagger: http://localhost:3000/api/docs
- Fichier DOCS_CONTROLLERS.md pour les détails des endpoints
- Fichier docs/architecture.md pour l'architecture

## 🚀 Prochaines Étapes

Pour aller plus loin:

1. **WebSockets** - Implémenter Socket.io pour les notifications temps réel
2. **Permissions** - Système de permissions granulaires
3. **Versioning** - Versioning des documents
4. **Analytics** - Dashboard d'analytics
5. **Monitoring** - Ajouter Prometheus/Grafana
6. **CI/CD** - Pipeline de déploiement automatisé
