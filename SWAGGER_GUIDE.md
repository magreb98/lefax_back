# 📖 Guide d'Utilisation de la Documentation Swagger

## 🌐 Accès à la Documentation

Une fois l'application démarrée, accédez à la documentation interactive Swagger :

```
http://localhost:3000/api/docs
```

## 🚀 Démarrage Rapide

### 1. Première Connexion

1. **Ouvrir Swagger UI** : Naviguez vers `http://localhost:3000/api/docs`
2. **Créer un compte** (si nécessaire) :
   - Déroulez la section **Authentication**
   - Cliquez sur `POST /api/auth/register`
   - Cliquez sur **"Try it out"**
   - Remplissez le formulaire :
     ```json
     {
       "firstName": "Jean",
       "lastName": "Dupont",
       "email": "jean.dupont@example.com",
       "password": "MotDePasse123!",
       "phoneNumber": "+33612345678"
     }
     ```
   - Cliquez sur **"Execute"**

3. **Se connecter** :
   - Cliquez sur `POST /api/auth/login`
   - Cliquez sur **"Try it out"**
   - Entrez vos identifiants :
     ```json
     {
       "email": "jean.dupont@example.com",
       "password": "MotDePasse123!"
     }
     ```
   - Cliquez sur **"Execute"**
   - **Copiez le token** retourné dans la réponse

### 2. Autorisation

1. **Cliquez sur le bouton "Authorize"** (🔓) en haut à droite de la page
2. **Collez votre token** dans le champ "Value"
3. **Cliquez sur "Authorize"** puis "Close"
4. **Vous êtes maintenant authentifié** ! Tous les endpoints protégés sont accessibles

### 3. Tester les Endpoints

#### Upload d'un Document

1. Déroulez **Documents** → `POST /api/documents/upload`
2. Cliquez sur **"Try it out"**
3. Remplissez les champs :
   - **file** : Sélectionnez un fichier PDF
   - **documentName** : "Mon premier document"
   - **description** : "Test d'upload"
   - **categorieId** : (UUID d'une catégorie existante)
   - **isdownloadable** : true
4. Cliquez sur **"Execute"**
5. Vérifiez la réponse (status 201 = succès)

#### Lister les Documents

1. Déroulez **Documents** → `GET /api/documents`
2. Cliquez sur **"Try it out"**
3. (Optionnel) Ajustez les paramètres de filtrage
4. Cliquez sur **"Execute"**
5. Consultez la liste des documents retournés

#### Créer une École

1. Déroulez **Écoles** → `POST /api/ecoles`
2. Cliquez sur **"Try it out"**
3. Remplissez :
   ```json
   {
     "schoolName": "Université Test",
     "address": "123 Rue de Test",
     "schoolEmail": "contact@test.fr",
     "schoolPhone": "+33123456789",
     "schoolAdminId": "votre-user-id"
   }
   ```
4. Cliquez sur **"Execute"**

#### Créer un Groupe de Partage

1. Déroulez **Groupes de Partage** → `POST /api/groupes`
2. Cliquez sur **"Try it out"**
3. Remplissez :
   ```json
   {
     "groupeName": "Mon Groupe de TD",
     "description": "Groupe pour partager les TD",
     "userIds": []
   }
   ```
4. Cliquez sur **"Execute"**

## 📚 Fonctionnalités de Swagger UI

### Boutons Principaux

- **Try it out** : Active le mode test pour l'endpoint
- **Execute** : Envoie la requête au serveur
- **Clear** : Efface les paramètres
- **Cancel** : Annule le mode test

### Sections

- **Schemas** : Modèles de données utilisés par l'API
- **Responses** : Exemples de réponses pour chaque code HTTP
- **Request Body** : Structure attendue pour les requêtes POST/PUT

### Codes de Réponse

- **200** : Succès
- **201** : Créé avec succès
- **400** : Requête invalide
- **401** : Non authentifié
- **403** : Accès refusé
- **404** : Non trouvé
- **500** : Erreur serveur

## 🔍 Exemples de Scénarios

### Scénario 1 : Partage de Document

```
1. POST /auth/login → Obtenir token
2. Authorize → Coller token
3. POST /documents/upload → Upload fichier
4. POST /groupes → Créer groupe
5. POST /documents/add-to-groupe → Partager document
```

### Scénario 2 : Gestion d'École

```
1. POST /auth/login (SUPERADMIN)
2. POST /users/{id}/grant-school-creation → Donner permission
3. POST /ecoles → Créer école
4. POST /filieres → Créer filière
5. POST /classes → Créer classe
6. POST /users/add-to-classe → Ajouter étudiants
```

### Scénario 3 : Recherche de Documents

```
1. POST /auth/login
2. GET /documents → Lister tous
3. GET /documents/search?q=math → Rechercher
4. GET /documents/most-downloaded → Plus téléchargés
5. GET /documents/{id}/download → Télécharger
```

## 🎯 Conseils d'Utilisation

### 1. Tester les Erreurs

- Essayez d'appeler un endpoint sans token pour voir l'erreur 401
- Envoyez des données invalides pour voir l'erreur 400
- Testez avec un rôle insuffisant pour voir l'erreur 403

### 2. Explorer les Schémas

- Cliquez sur **"Schemas"** en bas de la page
- Consultez la structure de chaque modèle
- Utilisez les exemples fournis

### 3. Copier les Requêtes

- Après avoir testé un endpoint, copiez la commande cURL générée
- Utilisez-la dans vos scripts ou Postman
- Exemple de cURL généré :
  ```bash
  curl -X 'POST' \
    'http://localhost:3000/api/auth/login' \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","password":"test123"}'
  ```

### 4. Filtrage et Pagination

- Utilisez les paramètres `limit` et `offset` pour paginer
- Combinez plusieurs filtres pour affiner les résultats
- Exemple : `/documents?categorieId=xxx&limit=10&offset=20`

## 🔧 Dépannage

### Le token ne fonctionne pas

- Vérifiez que vous avez bien cliqué sur "Authorize"
- Assurez-vous de copier le token complet (sans guillemets)
- Le token expire après 24h, reconnectez-vous

### Upload échoue

- Vérifiez la taille du fichier (max 10MB)
- Assurez-vous que le `categorieId` existe
- Vérifiez que vous avez les permissions

### Erreur 403

- Vérifiez votre rôle utilisateur
- Certains endpoints nécessitent ADMIN ou SUPERADMIN
- Contactez un administrateur pour obtenir les permissions

### Erreur 500

- Vérifiez les logs serveur
- Assurez-vous que la base de données est accessible
- Vérifiez que tous les services sont démarrés

## 📱 Export Postman

Pour exporter la collection Swagger vers Postman :

1. Accédez à `http://localhost:3000/api/docs-json`
2. Copiez le JSON
3. Dans Postman : Import → Raw text → Collez le JSON
4. Ou utilisez directement l'URL : `http://localhost:3000/api/docs-json`

## 🎓 Ressources

- **Documentation complète** : Voir `DOCUMENTATION_COMPLETE.md`
- **Architecture** : Voir `ARCHITECTURE.md`
- **Déploiement** : Voir `DEPLOYMENT_GUIDE.md`
- **Swagger/OpenAPI** : https://swagger.io/docs/

## 💡 Astuces

1. **Utilisez les exemples** : Chaque endpoint a des exemples pré-remplis
2. **Testez en ordre** : Commencez par l'authentification
3. **Gardez votre token** : Copiez-le dans un fichier texte
4. **Explorez les tags** : Utilisez les filtres par tag (Authentication, Documents, etc.)
5. **Consultez les schémas** : Comprenez la structure des données avant de tester

---

**Bon test ! 🚀**

Pour toute question, consultez la documentation complète ou contactez l'équipe de développement.
