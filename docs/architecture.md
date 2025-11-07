# Architecture

## Vue d'ensemble

Lefax suit une architecture en couches basée sur les principes REST et utilise TypeScript pour assurer la sécurité des types.

## Diagramme d'architecture

```mermaid
graph TD
    Client[Client] --> API[API REST]
    API --> Controllers[Controllers]
    Controllers --> Services[Services]
    Services --> Repositories[Repositories]
    Repositories --> Database[(Database)]
    API --> Middleware[Middleware]
    Middleware --> Auth[Authentication]
    Middleware --> Validation[DTO Validation]
    API --> Upload[File Upload]
    Upload --> Storage[File Storage]
```

## Couches de l'application

### 1. Controllers (src/controllers/)
- Gestion des requêtes HTTP
- Validation des entrées
- Formatage des réponses
- Gestion des erreurs

### 2. Services (src/services/)
- Logique métier
- Orchestration des opérations
- Transactions
- Validation métier

### 3. Repositories (via TypeORM)
- Accès aux données
- Requêtes SQL
- Relations entre entités
- Cache de données

### 4. Entities (src/entity/)
- Modèles de données
- Relations
- Validation
- Hooks TypeORM

## Composants principaux

### Gestion des documents
```mermaid
graph LR
    Upload[Upload] --> Validation[Validation]
    Validation --> Storage[Storage]
    Storage --> Database[(Database)]
    Database --> GroupePartage[Groupe Partage]
```

### Gestion des utilisateurs
```mermaid
graph LR
    Auth[Authentication] --> JWT[JWT]
    JWT --> Roles[Roles]
    Roles --> Permissions[Permissions]
```

### Organisation pédagogique
```mermaid
graph TD
    Ecole[École] --> Filiere[Filière]
    Filiere --> Classe[Classe]
    Classe --> Matiere[Matière]
    Matiere --> Document[Document]
```

## Base de données

### Schéma relationnel
```mermaid
erDiagram
    USER ||--o{ DOCUMENT : uploads
    DOCUMENT ||--o{ GROUPE_PARTAGE : shared_in
    MATIERE ||--o{ DOCUMENT : belongs_to
    CATEGORIE ||--o{ DOCUMENT : categorized_as
    ECOLE ||--o{ FILIERE : has
    FILIERE ||--o{ CLASSE : contains
    USER ||--o{ GROUPE_PARTAGE : member_of
```

## Sécurité

### Authentification
- JWT pour l'authentification stateless
- Refresh tokens pour la persistance
- Validation des rôles par middleware

### Autorisation
```mermaid
graph TD
    Request[Request] --> AuthMiddleware[Auth Middleware]
    AuthMiddleware --> RoleMiddleware[Role Middleware]
    RoleMiddleware --> Controller[Controller]
```

### Validation des données
- DTOs avec class-validator
- Middleware de validation
- Sanitization des entrées

## Gestion des fichiers

### Upload
- Multer pour la gestion des fichiers
- Validation des types MIME
- Limitation de taille
- Stockage sécurisé

### Organisation
```
uploads/
├── documents/
│   ├── [date]/
│   │   └── [uuid].[ext]
└── temp/
```

## Cache et Performance

### Stratégies de cache
- Cache des requêtes fréquentes
- Cache des résultats de recherche
- Cache des documents populaires

### Optimisations
- Pagination des résultats
- Lazy loading des relations
- Indexation des recherches

## Monitoring et Logs

### Métriques collectées
- Temps de réponse API
- Utilisation mémoire/CPU
- Taux d'erreurs
- Statistiques d'utilisation

### Logs
- Logs d'accès
- Logs d'erreurs
- Logs d'audit
- Logs de performance

## Déploiement

### Production
```mermaid
graph TD
    Git[Git Repository] --> Build[Build]
    Build --> Test[Tests]
    Test --> Deploy[Deploy]
    Deploy --> PM2[PM2]
    PM2 --> Nginx[Nginx]
```

### Environnements
- Développement
- Staging
- Production

## Extensibilité

### Points d'extension
- Middlewares personnalisés
- Nouveaux types de documents
- Plugins de validation
- Intégrations externes