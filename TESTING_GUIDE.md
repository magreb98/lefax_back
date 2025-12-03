# Guide de Test - Lefax Backend

## 📋 Vue d'ensemble

Ce guide explique comment exécuter et maintenir les tests pour l'API Lefax Backend.

## 🧪 Types de Tests

### 1. Tests Unitaires (`tests/unit/`)
Tests des fonctions et classes isolées sans dépendances externes.

**Fichiers:**
- `pagination.test.ts` - Tests du système de pagination

### 2. Tests d'Intégration (`tests/integration/`)
Tests des endpoints API complets avec base de données.

**Fichiers:**
- `app.test.ts` - Tests de base (health check, 404)
- `auth.test.ts` - Tests d'authentification (login, register, logout)
- `users.test.ts` - Tests des endpoints utilisateurs
- `documents.test.ts` - Tests des endpoints documents
- `all-endpoints.test.ts` - Tests de tous les endpoints (smoke tests)

## 🚀 Exécution des Tests

### Méthode 1: Scripts npm

```bash
# Tous les tests
npm test

# Mode watch (re-exécute automatiquement)
npm run test:watch

# Avec rapport de couverture
npm run test:coverage
```

### Méthode 2: Scripts automatisés

**Windows (PowerShell):**
```powershell
.\tests\run-all-tests.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x tests/run-all-tests.sh
./tests/run-all-tests.sh
```

### Méthode 3: Tests spécifiques

```bash
# Un seul fichier de test
npm test -- tests/integration/auth.test.ts

# Tests unitaires uniquement
npm test -- tests/unit

# Tests d'intégration uniquement
npm test -- tests/integration

# Avec pattern
npm test -- --testNamePattern="should login"
```

## 📊 Rapport de Couverture

Après avoir exécuté `npm run test:coverage`, consultez:

- **Terminal**: Résumé de la couverture
- **HTML**: `coverage/lcov-report/index.html` (ouvrir dans un navigateur)
- **LCOV**: `coverage/lcov.info` (pour CI/CD)

### Objectifs de Couverture

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  testTimeout: 10000
}
```

### Variables d'Environnement

Pour les tests, créez un fichier `.env.test`:

```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=test_user
DB_PASSWORD=test_password
DB_NAME=lefax_test_db
JWT_SECRET=test_secret_key
```

## 📝 Écrire de Nouveaux Tests

### Structure d'un Test

```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup: connexion DB, création de données de test
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    // Cleanup: fermeture DB, suppression données de test
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('GET /api/endpoint', () => {
    it('should return success', async () => {
      const response = await request(app)
        .get('/api/endpoint')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should fail without auth', async () => {
      const response = await request(app).get('/api/endpoint');
      expect(response.status).toBe(401);
    });
  });
});
```

### Bonnes Pratiques

1. **Nommage descriptif**: `should return 404 when user not found`
2. **Un test = une assertion**: Testez un comportement à la fois
3. **Arrange-Act-Assert**: Structure claire
4. **Isolation**: Chaque test doit être indépendant
5. **Cleanup**: Nettoyez les données de test après chaque suite

## 🎯 Tests par Endpoint

### Authentication (`/api/auth`)

- ✅ POST `/login` - Connexion réussie
- ✅ POST `/login` - Échec avec mauvais mot de passe
- ✅ POST `/register` - Inscription réussie
- ✅ POST `/register` - Échec avec email dupliqué
- ✅ GET `/me` - Récupération profil
- ✅ POST `/refresh` - Rafraîchissement token
- ✅ POST `/logout` - Déconnexion

### Users (`/api/users`)

- ✅ GET `/` - Liste avec pagination
- ✅ GET `/:id` - Détails utilisateur
- ✅ PUT `/:id` - Mise à jour
- ✅ DELETE `/:id` - Suppression
- ✅ POST `/groupes` - Création groupe

### Documents (`/api/documents`)

- ✅ POST `/upload` - Upload fichier
- ✅ GET `/` - Liste avec filtres
- ✅ GET `/:id` - Détails document
- ✅ PUT `/:id` - Mise à jour
- ✅ DELETE `/:id` - Suppression
- ✅ GET `/search` - Recherche
- ✅ GET `/stats/most-viewed` - Statistiques
- ✅ GET `/stats/most-downloaded` - Statistiques

### Ecoles (`/api/ecoles`)

- ✅ POST `/` - Création école
- ✅ GET `/` - Liste écoles
- ✅ GET `/:id` - Détails école
- ✅ PUT `/:id` - Mise à jour
- ✅ DELETE `/:id` - Suppression

### Filieres (`/api/filieres`)

- ✅ POST `/` - Création filière
- ✅ GET `/` - Liste filières
- ✅ GET `/:id` - Détails filière
- ✅ PUT `/:id` - Mise à jour
- ✅ DELETE `/:id` - Suppression

### Classes (`/api/classes`)

- ✅ POST `/` - Création classe
- ✅ GET `/` - Liste classes
- ✅ GET `/:id` - Détails classe
- ✅ PUT `/:id` - Mise à jour
- ✅ DELETE `/:id` - Suppression

### Categories (`/api/categories`)

- ✅ POST `/` - Création catégorie
- ✅ GET `/` - Liste catégories
- ✅ GET `/:id` - Détails catégorie
- ✅ PUT `/:id` - Mise à jour
- ✅ DELETE `/:id` - Suppression

### Notifications (`/api/notifications`)

- ✅ POST `/` - Création notification
- ✅ GET `/` - Liste avec pagination
- ✅ GET `/:id` - Détails notification
- ✅ PUT `/:id` - Mise à jour
- ✅ DELETE `/:id` - Suppression
- ✅ GET `/groupe/:groupeId` - Par groupe

## 🐛 Debugging des Tests

### Mode Verbose

```bash
npm test -- --verbose
```

### Un seul test

```bash
npm test -- --testNamePattern="should login successfully"
```

### Logs détaillés

Ajoutez dans votre test:
```typescript
console.log('Response:', response.body);
```

### Breakpoints (VS Code)

1. Ajoutez un breakpoint dans VS Code
2. Lancez le debugger avec la configuration Jest
3. Le test s'arrêtera au breakpoint

## 📈 CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 🔍 Troubleshooting

### Erreur: "Cannot find module"

```bash
npm install
```

### Erreur: "Database connection failed"

Vérifiez que:
1. MySQL est démarré
2. Les credentials dans `.env.test` sont corrects
3. La base de données de test existe

### Erreur: "Timeout"

Augmentez le timeout dans `jest.config.js`:
```javascript
testTimeout: 30000 // 30 secondes
```

### Tests qui échouent aléatoirement

- Vérifiez l'isolation des tests
- Nettoyez les données entre les tests
- Utilisez des IDs/emails uniques (avec `Date.now()`)

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## ✅ Checklist avant Commit

- [ ] Tous les tests passent (`npm test`)
- [ ] Couverture > 80% (`npm run test:coverage`)
- [ ] Pas de tests ignorés (`it.skip`, `describe.skip`)
- [ ] Pas de `console.log` oubliés
- [ ] Tests documentés et nommés clairement
