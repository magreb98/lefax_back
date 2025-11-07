# Installation et Configuration

## Installation

1. Cloner le repository
```bash
git clone <repository-url>
cd lefax
```

2. Installer les dépendances
```bash
npm install
```

3. Configuration de l'environnement
Créer un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=lefax

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760 # 10MB
UPLOAD_DIR=src/uploads/
```

4. Initialiser la base de données
```bash
# Créer la base de données
mysql -u root -p
CREATE DATABASE lefax;

# Exécuter les migrations
npm run typeorm migration:run
```

5. Démarrer l'application
```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

## Structure des dossiers

```
src/
├── app.ts                  # Point d'entrée de l'application
├── swagger.ts             # Configuration Swagger
├── config/               # Configurations (BDD, etc.)
├── controllers/          # Contrôleurs REST
├── dtos/                # Data Transfer Objects
├── entity/              # Modèles de données TypeORM
├── middleware/          # Middlewares Express
├── routes/             # Définition des routes
├── services/           # Logique métier
├── types/              # Types TypeScript
└── util/              # Utilitaires

docs/                   # Documentation
tests/                 # Tests
```

## Scripts disponibles

- `npm run dev` : Démarre le serveur en mode développement
- `npm run build` : Compile le projet TypeScript
- `npm start` : Démarre le serveur en mode production
- `npm run generate-postman` : Génère une collection Postman
- `npm test` : Exécute les tests
- `npm run typeorm` : Utilitaire TypeORM

## Configuration du serveur Web

Pour un déploiement en production avec Nginx :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Sécurité

1. Assurez-vous que le fichier `.env` n'est pas commité dans git
2. Configurez les CORS selon vos besoins dans `app.ts`
3. Utilisez HTTPS en production
4. Définissez des limites appropriées pour l'upload de fichiers
5. Configurez correctement les permissions de dossier pour les uploads

## Maintenance

### Backup de la base de données

```bash
# Backup
mysqldump -u root -p lefax > backup.sql

# Restore
mysql -u root -p lefax < backup.sql
```

### Logs

Les logs sont écrits dans la console par défaut. En production, utilisez un service comme PM2 pour la gestion des logs :

```bash
# Installation de PM2
npm install -g pm2

# Démarrage avec PM2
pm2 start dist/app.js --name lefax
```

### Monitoring

Utilisez PM2 pour le monitoring de base :
```bash
pm2 monit
```

## Résolution des problèmes courants

### Erreur de connexion à la base de données
1. Vérifiez les credentials dans le fichier `.env`
2. Assurez-vous que MySQL est en cours d'exécution
3. Vérifiez les permissions de l'utilisateur MySQL

### Erreurs d'upload de fichiers
1. Vérifiez les permissions du dossier `uploads`
2. Assurez-vous que la taille du fichier ne dépasse pas la limite
3. Vérifiez la configuration de Multer

### Problèmes d'authentification
1. Vérifiez la validité du JWT_SECRET
2. Assurez-vous que l'horloge du serveur est synchronisée
3. Vérifiez la durée de validité des tokens