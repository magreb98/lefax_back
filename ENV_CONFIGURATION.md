# Configuration des Variables d'Environnement

Ce guide explique comment configurer les variables d'environnement pour les projets LEFAX (backend et frontend).

## 📋 Backend (lefax_back)

### Installation
1. Copiez le fichier `.env.example` en `.env` :
   ```bash
   cp .env.example .env
   ```

2. Modifiez le fichier `.env` avec vos valeurs

### Variables Requises

#### Environnement
- **NODE_ENV** : Environnement d'exécution (`development`, `production`, `test`)

#### Configuration Serveur
- **PORT** : Port sur lequel le serveur écoute (défaut: `3000`)
- **CORS_ORIGIN** : Origine autorisée pour CORS (URL du frontend)

#### Base de Données (MySQL)
- **DB_HOST** : Hôte de la base de données
- **DB_PORT** : Port de MySQL (défaut: `3306`)
- **DB_USERNAME** : Nom d'utilisateur MySQL
- **DB_PASSWORD** : Mot de passe MySQL
- **DB_NAME** / **DB_DATABASE** : Nom de la base de données

#### JWT (Authentification)
- **JWT_SECRET** : ⚠️ **IMPORTANT** : Clé secrète pour signer les tokens JWT (minimum 32 caractères)
- **JWT_EXPIRES_IN** : Durée de validité du token (ex: `24h`, `7d`)

#### Redis (Optionnel - pour le cache/sessions)
- **REDIS_HOST** : Hôte Redis
- **REDIS_PORT** : Port Redis (défaut: `6379`)
- **REDIS_PASSWORD** : Mot de passe Redis (optionnel)
- **REDIS_DB** : Numéro de la base Redis (défaut: `0`)

#### Logging
- **LOG_LEVEL** : Niveau de log (`error`, `warn`, `info`, `debug`)

### ⚠️ Sécurité

✅ **À FAIRE** :
- Changez `JWT_SECRET` en production avec une valeur complexe et unique
- Ne committez **JAMAIS** le fichier `.env` (déjà dans `.gitignore`)
- Utilisez des mots de passe forts pour la base de données en production

❌ **À NE PAS FAIRE** :
- Partager votre fichier `.env`
- Utiliser les valeurs par défaut en production
- Committer des secrets dans Git

---

## 🎨 Frontend (lefax-edplatform)

### Installation
1. Copiez le fichier `.env.example` en `.env` :
   ```bash
   cp .env.example .env
   ```

2. Modifiez le fichier `.env` si nécessaire

### Variables Requises

#### API Configuration
- **VITE_API_URL** : URL complète de l'API backend (ex: `http://localhost:3000/api`)

### Notes pour Vite
- Toutes les variables d'environnement pour Vite doivent commencer par `VITE_`
- Les changements nécessitent un redémarrage du serveur de développement

---

## 🚀 Déploiement

### Production Backend
Assurez-vous de définir :
```env
NODE_ENV=production
JWT_SECRET=une-cle-tres-securisee-et-longue-de-production
DB_PASSWORD=mot-de-passe-fort-production
CORS_ORIGIN=https://votre-domaine-frontend.com
```

### Production Frontend
```env
VITE_API_URL=https://api.votre-domaine.com/api
```

---

## 🔧 Dépannage

### Le backend ne démarre pas
- Vérifiez que MySQL est en cours d'exécution
- Vérifiez les identifiants de base de données
- Assurez-vous que la base de données existe

### Le frontend ne peut pas se connecter à l'API
- Vérifiez que `VITE_API_URL` pointe vers la bonne URL
- Vérifiez que le backend est démarré
- Vérifiez la configuration CORS du backend

### Erreurs JWT
- Assurez-vous que `JWT_SECRET` est défini et identique partout où il est utilisé
- Vérifiez que les tokens n'ont pas expiré
