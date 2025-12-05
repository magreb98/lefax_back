# Seeding des Utilisateurs par Défaut

## Description

Script de seeding automatique qui crée des utilisateurs par défaut pour chaque rôle au démarrage de l'application. Facilite le développement et les tests en fournissant des comptes pré-configurés.

## Utilisateurs Créés

| Rôle | Email | Mot de passe | Téléphone |
|------|-------|--------------|-----------|
| **SUPERADMIN** | superadmin@lefax.com | SuperAdmin123! | +221771234567 |
| **ADMIN** | admin@lefax.com | Admin123! | +221772345678 |
| **ENSEIGNANT** | enseignant@lefax.com | Teacher123! | +221773456789 |
| **ETUDIANT** | etudiant@lefax.com | Student123! | +221774567890 |
| **USER** | user@lefax.com | User123! | +221775678901 |

## Caractéristiques

- ✅ Tous les utilisateurs sont **vérifiés** (`isVerified: true`)
- ✅ Tous les utilisateurs sont **actifs** (`isActive: true`)
- ✅ SUPERADMIN et ADMIN ont la permission `canCreateSchool: true`
- ✅ Les mots de passe sont **hashés** avec bcrypt avant l'insertion
- ✅ Le script vérifie l'existence avant de créer (pas de doublons)

## Utilisation

### Démarrage Automatique

Le seeding s'exécute **automatiquement** à chaque démarrage de l'application :

```bash
npm run dev
```

### Logs de Confirmation

Au démarrage, vous verrez :

```
✅ Base de données connectée avec succès
ℹ️  Utilisateur superadmin existe déjà: superadmin@lefax.com
✅ Utilisateur admin créé: admin@lefax.com
...

🎉 Seed terminé: 4 utilisateur(s) créé(s), 1 ignoré(s)

📝 Identifiants de connexion par défaut:
-----------------------------------
SUPERADMIN     | superadmin@lefax.com           | SuperAdmin123!
ADMIN          | admin@lefax.com                | Admin123!
ENSEIGNANT     | enseignant@lefax.com           | Teacher123!
ETUDIANT       | etudiant@lefax.com             | Student123!
USER           | user@lefax.com                 | User123!
-----------------------------------
```

## Connexion

Pour se connecter avec un compte par défaut, utilisez :

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "superadmin@lefax.com",
  "password": "SuperAdmin123!"
}
```

## Sécurité

⚠️ **IMPORTANT**: Ces utilisateurs sont prévus pour le **développement uniquement**.

En production :
1. Désactivez le seed automatique ou créez un script séparé
2. Changez immédiatement les mots de passe par défaut
3. Supprimez les comptes inutiles
4. Utilisez des mots de passe forts et uniques

## Modification

Pour personnaliser les utilisateurs par défaut, éditez :
```
src/scripts/seedDefaultUsers.ts
```

Le script est réexécuté à chaque redémarrage, mais ne crée pas de doublons (vérifie l'email).

## Désactivation

Pour désactiver le seeding automatique, commentez ces lignes dans `src/app.ts` :

```typescript
// const { seedDefaultUsers } = await import('./scripts/seedDefaultUsers');
// await seedDefaultUsers();
```
