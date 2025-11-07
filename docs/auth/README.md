# Authentification et Sécurité

## Système d'authentification

### JWT (JSON Web Tokens)

Le système utilise JWT pour l'authentification avec un système de refresh token.

#### Structure du Token

```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "iat": 1635432789,
    "exp": 1635519189
  }
}
```

### Flow d'authentification

1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Réponse :
```json
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

2. Utilisation du token
```http
GET /api/protected-route
Authorization: Bearer eyJhbG...
```

3. Refresh du token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbG..."
}
```

4. Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbG...
```

## Gestion des rôles

### Rôles disponibles

| Rôle | Description | Permissions |
|------|-------------|-------------|
| USER | Utilisateur standard | Lecture documents partagés |
| TEACHER | Enseignant | Upload + partage documents |
| ADMIN | Administrateur école | Gestion utilisateurs école |
| SUPER_ADMIN | Super administrateur | Toutes les permissions |

### Middleware de vérification des rôles

```typescript
export const roleMiddleware = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Non autorisé',
                error: 'FORBIDDEN'
            });
        }
        next();
    };
};
```

### Utilisation

```typescript
router.get('/admin-only',
    authMiddleware,
    roleMiddleware(['ADMIN', 'SUPER_ADMIN']),
    controller.adminAction
);
```

## Sécurité

### Protection contre les attaques courantes

1. **XSS (Cross-Site Scripting)**
   - Validation des entrées
   - Échappement des données
   - Headers de sécurité

2. **CSRF (Cross-Site Request Forgery)**
   - Tokens CSRF
   - SameSite cookies

3. **Injection SQL**
   - Utilisation de TypeORM
   - Paramètres préparés
   - Validation des entrées

4. **Upload de fichiers**
   - Validation des types MIME
   - Limite de taille
   - Renommage sécurisé
   - Stockage hors www

### Headers de sécurité

```typescript
app.use(helmet());
```

Configuration :
```javascript
{
  "contentSecurityPolicy": {
    "directives": {
      "defaultSrc": ["'self'"],
      "scriptSrc": ["'self'"],
      "styleSrc": ["'self'"],
      "imgSrc": ["'self'", "data:", "blob:"],
      "connectSrc": ["'self'"],
      "fontSrc": ["'self'"],
      "objectSrc": ["'none'"],
      "mediaSrc": ["'self'"],
      "frameSrc": ["'none'"]
    }
  }
}
```

### Rate Limiting

```typescript
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limite par IP
}));
```

### Validation des données

Utilisation de class-validator :

```typescript
export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}
```

### Stockage sécurisé des mots de passe

```typescript
// Hashage
const hashedPassword = await bcrypt.hash(password, 10);

// Vérification
const isValid = await bcrypt.compare(password, hashedPassword);
```

## Audit et Logs

### Logs de sécurité

```typescript
interface SecurityLog {
    timestamp: Date;
    action: string;
    userId: string;
    ip: string;
    userAgent: string;
    status: string;
    details?: any;
}
```

### Actions auditées

- Tentatives de connexion
- Modifications de permissions
- Accès aux documents sensibles
- Modifications de configuration
- Upload/suppression de fichiers

## Bonnes pratiques

1. **Gestion des sessions**
   - Timeout approprié
   - Invalidation après changement de mot de passe
   - Limite de sessions simultanées

2. **Mots de passe**
   - Règles de complexité
   - Historique des mots de passe
   - Délai de réutilisation

3. **Accès aux fichiers**
   - Validation des permissions
   - Logs d'accès
   - Vérification des chemins

4. **API**
   - Validation des entrées
   - Rate limiting
   - Authentification forte