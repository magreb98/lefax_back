# Lefax API

API RESTful pour la gestion des documents pédagogiques, des utilisateurs et des écoles.

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

3. Configurer les variables d'environnement
Créer un fichier `.env` à la racine du projet avec les variables suivantes :
```env
PORT=3000
JWT_SECRET=votre_secret_jwt
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=votre_mot_de_passe
DB_DATABASE=lefax
```

4. Démarrer l'application
```bash
npm run dev
```

## Documentation API

La documentation de l'API est disponible via Swagger UI à l'adresse :
```
http://localhost:3000/api/docs
```

## Endpoints principaux

### Authentication
- `POST /api/auth/login` - Authentification
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Profil utilisateur courant
- `POST /api/auth/refresh` - Rafraîchir le token

### Utilisateurs
- `POST /api/users/register` - Inscription
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `PUT /api/users/:id` - Mise à jour d'un utilisateur
- `DELETE /api/users/:id` - Suppression d'un utilisateur

### Groupes de partage
- `POST /api/users/groupes` - Créer un groupe
- `POST /api/users/groupes/:groupeId/users/:userId` - Ajouter un utilisateur
- `DELETE /api/users/groupes/:groupeId/users/:userId` - Retirer un utilisateur

## Structure du projet

```
src/
├── app.ts              # Point d'entrée de l'application
├── config/            # Configuration (base de données, etc.)
├── controllers/       # Contrôleurs
├── dtos/             # Data Transfer Objects
├── entity/           # Entités TypeORM
├── exceptions/       # Gestion des erreurs
├── middleware/       # Middlewares
├── routes/          # Routes
├── types/           # Types TypeScript
└── util/            # Utilitaires
```

## Génération de la collection Postman

Pour générer une collection Postman à partir de la documentation Swagger :

```bash
npx ts-node src/scripts/generatePostman.ts
```

Le fichier `postman-collection.json` sera créé à la racine du projet.