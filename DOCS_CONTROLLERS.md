# Documentation complète des contrôleurs

Ce document fournit une documentation centralisée de tous les contrôleurs présents dans `src/controllers`, basée sur les entités (`src/entity/*`) et les routes (`src/routes/*`). Les chemins indiqués tiennent compte de `src/routes/index.ts` qui monte les routes sous `/api` dans l'application (par exemple `/api/users`, `/api/documents`, ...).

Pour chaque contrôleur : description, liste des endpoints, méthode HTTP, paramètres (path/query/body), schéma des données attendues, entités concernées et exemples de réponses.

---

## Préfixe commun
Dans `src/routes/index.ts` :
- `/api/auth` -> `AuthController`
- `/api/users` -> `UserController`
- `/api/categories` -> `CategoryController`
- `/api/documents` -> `DocumentController`
- `/api/ecoles` -> `EcoleController`
- `/api/filieres` -> `FiliereController`
- `/api/classes` -> `ClasseController`

---

## 1) AuthController
Chemin de base : `/api/auth`

Endpoints :
- POST /login
  - Body: { email: string, password: string }
  - Réponse 200: { user: { id, name, firstName, lastName, email, role, phone, isActive }, token: string }
  - Erreurs: 400 si champs manquants, 401 si identifiants invalides

- POST /logout
  - No body. Retourne simplement { message: 'Déconnexion réussie' }

- GET /me
  - Nécessite auth middleware. Retourne l'utilisateur courant (sélection : id, firstName, lastName, email, role, phoneNumber, isActive, createdAt) + champ `name`.

- POST /refresh
  - Nécessite auth middleware. Retourne un nouveau token JWT { token }

Entités impliquées : `User` (sélectionnée sans mot de passe)

Notes :
- JWT_SECRET et JWT_EXPIRES_IN contrôlent la génération des tokens.

---

## 2) UserController
Chemin de base : `/api/users`
Entité principale : `User`

Endpoints principaux (CRUD) :
- POST /register
  - Body: {
      firstName: string,
      lastName: string,
      email: string,
      password: string,
      phoneNumber?: string,
      role?: string
    }
  - Comportement: vérifie unicité email, hash du password, associe l'utilisateur au groupe "Public".
  - Réponse 201: { message }
  - Erreurs: 400 si email déjà pris ou champs manquants

- GET /
  - Query (optionnelles): role, isActive, schoolId
  - Réponse: liste des utilisateurs (champs sélectionnés: id, firstName, lastName, email, role, phoneNumber, createdAt)

- GET /:id
  - Params: id
  - Réponse: utilisateur (mêmes champs que ci-dessus) ou 404

- PUT /:id
  - Params: id
  - Body (optionnel): firstName, lastName, email, role, phoneNumber, password
  - Comportement: met à jour; retente de hasher le password si fourni
  - Réponse: message de succès

- DELETE /:id
  - Params: id
  - Réponse: 204 No Content (ou 404 si non trouvé)

Gestion des groupes de partage (GroupePartageService utilisé):
- POST /groupes
  - Body: { name: string, description?: string, userIds?: string[] }
  - Réponse 201: { message, groupe }

- POST /groupes/:groupeId/users/:userId
  - Params: groupeId, userId
  - Ajoute un utilisateur au groupe

- POST /groupes/:groupeId/users/bulk
  - Params: groupeId
  - Body: { userIds: string[] }
  - Ajoute plusieurs utilisateurs

- DELETE /groupes/:groupeId/users/:userId
  - Params: groupeId, userId
  - Supprime un utilisateur du groupe

- DELETE /groupes/:groupeId/users/bulk
  - Params: groupeId
  - Body: { userIds: string[] }

Recherche / consultations spécifiques :
- GET /enseignants/:enseignantId/groupes
  - Params: enseignantId
  - Retourne les groupes liés à l'enseignant

- GET /groupes/:groupeId/enseignants
  - Params: groupeId
  - Retourne les enseignants d'un groupe

- POST /groupes/sync/enseignement/:enseignementId
  - Params: enseignementId
  - Synchronise les groupes après une affectation d'enseignement

Notes :
- Les réponses d'erreur retournent souvent { message } ou { message, error }
- Le contrôleur s'appuie sur `GroupePartageService` pour la majorité des opérations sur groupes.

---

## 3) DocumentController
Chemin de base : `/api/documents`
Entité principale : `Document` (liens vers `DocumentCategorie`, `User`, `Matiere`, `GroupePartage`)

Upload / fichiers :
- POST /upload (multipart/form-data)
  - Fields:
    - file: fichier (required)
    - documentName: string (required)
    - description?: string
    - categorieId: string (required)
    - addedById: string (required)
    - matiereId?: string
    - groupePartageIds?: string[] (ou JSON string)
    - isdownloadable?: boolean ("true"/"false")
  - Réponse 201: { message, document }
  - Erreurs: 400 si champs manquants, suppression du fichier en cas d'erreur

- POST /upload-multiple (multipart/form-data)
  - Fields:
    - files: fichiers[] (max 20)
    - categorieId: string (required)
    - addedById: string (required)
    - matiereId?: string
    - groupePartageIds?: string[]
    - isdownloadable?: boolean
  - Réponse 201: détails des documents créés et erreurs individuelles si nécessaire

CRUD & gestion :
- GET / (query optionnelles: categorieId, matiereId, addedById, groupePartageId)
  - Réponse: { count, documents }

- GET /:id
  - Retourne le document (404 si non trouvé) et incrémente viewCount

- PUT /:id
  - Body: { documentName?, description?, categorieId?, matiereId? (ou 'null'), groupePartageIds?, isdownloadable? }
  - Réponse: { message, document }

- DELETE /:id
  - Supprime le document (et logiquement le fichier) via le service

- POST /delete-multiple
  - Body: { documentIds: string[] }
  - Supprime en boucle, retourne compte et erreurs éventuelles

Téléchargement et accès :
- GET /:id/download
  - Vérifie que `isdownloadable` est vrai et que le fichier existe
  - Incrémente download count et envoie le fichier

Gestion des groupes (single/multiple) :
- POST /groupe/add  -> { documentId, groupeId }
- POST /groupes/add -> { documentId, groupeIds: string[] }
- POST /groupe/remove -> { documentId, groupeId }
- POST /multiple/groupe/add -> { documentIds: string[], groupeId }
- POST /multiple/groupes/add -> { documentIds: string[], groupeIds: string[] }
- POST /multiple/groupe/remove -> { documentIds: string[], groupeId }

Récupérations spécialisées :
- GET /user/:userId
- GET /groupe/:groupeId
- GET /matiere/:matiereId
- GET /categorie/:categorieId
- GET /search?q=terme

Statistiques :
- GET /stats/most-downloaded?limit=10
- GET /stats/most-viewed?limit=10
- GET /stats/recent?limit=10

Notes :
- Les fichiers sont stockés dans `src/uploads/` par défaut.
- `documentUrl` en base de données contient le chemin fichier.

---

## 4) EcoleController
Chemin de base : `/api/ecoles`
Entité principale : `Ecole` (liens vers `GroupePartage`, `Filiere`, `User`)

Endpoints :
- POST /
  - Body: { schoolName: string, address?: string, schoolEmail: string, schoolPhone?: string, schoolAdmin: string }
  - Crée l'école et son `GroupePartage` via `GroupePartageService`
  - Réponse 201: { message, ecole }

- GET /
  - Retourne les écoles avec relations `groupePartage`, `groupePartage.users`, `filieres`
  - Réponse: { count, ecoles }

- GET /:id
  - Retourne école + relations (filieres, students, groupePartage)

- PUT /:id
  - Body: { schoolName?, address?, schoolEmail?, schoolPhone?, isActive? }
  - Met à jour l'école

- DELETE /:id
  - Supprime l'école (et logiquement son groupe de partage si cascade)

Opérations sur groupes :
- POST /groupes/:groupeId/ecoles/:ecoleId
  - Ajoute une école à un groupe
- DELETE /groupes/:groupeId/ecoles/:ecoleId
  - Retire une école d'un groupe
- POST /groupes/sync/ecole/:ecoleId
  - Synchronise le groupe de partage pour l'école

Notes :
- `createEcole` utilise `GroupePartageService.createEcoleWithGroupe`.
- Les méthodes de sync utilisent le service pour reconstruire/mettre à jour les memberships.

---

## 5) FiliereController
Chemin de base : `/api/filieres`
Entité principale : `Filiere` (liens vers `Ecole`, `Class`, `GroupePartage`)

Endpoints :
- POST /
  - Body: { name: string, description?: string, ecoleId: string }
  - Crée la filière et son groupe via service, puis sync du groupe de l'école
  - Réponse 201: { message, filiere }

- GET /
  - Retourne filières avec relations (groupePartage, users, school, classes)

- GET /:id
  - Retourne filière (relations incluses)

- PUT /:id
  - Body: { name?, description? }
  - Met à jour la filière

- DELETE /:id
  - Supprime la filière et relance sync du groupe de l'école associée

Opérations sur groupes :
- POST /groupes/:groupeId/filieres/:filiereId
- DELETE /groupes/:groupeId/filieres/:filiereId
- POST /groupes/sync/filiere/:filiereId

Notes :
- `filiere.school` est utilisé pour re-synchroniser les groupes d'école après suppression.

---

## 6) ClasseController
Chemin de base : `/api/classes`
Entité principale : `Class` (liens vers `Filiere`, `GroupePartage`, `Matiere`)

Endpoints :
- POST /
  - Body: { className: string, filiereId: string }
  - Crée la classe + groupe via service; sync filière et école
  - Réponse 201: { message, classe }

- GET /
  - Retourne classes (relations : groupePartage, users, filiere, filiere.school)

- GET /:id
  - Retourne classe (relations : groupePartage, users, filiere, matieres)

- PUT /:id
  - Body: { className? }
  - Met à jour la classe

- DELETE /:id
  - Supprime la classe et re-sync filière & école

Opérations sur groupes :
- POST /groupes/:groupeId/classes/:classeId
- DELETE /groupes/:groupeId/classes/:classeId
- POST /groupes/sync/classe/:classeId

Notes :
- `Class` est le nom d'entité (`src/entity/classe.ts`) mais dans le code la classe exportée est `Class`.

---

## 7) CategoryController
Chemin de base : `/api/categories` (routes montées sous `/categories`)
Entité principale : `DocumentCategorie`

Endpoints :
- GET /
  - Retourne toutes les catégories (avec `documents`)

- POST /
  - Body: { categorieName: string }
  - Crée une nouvelle catégorie

- GET /:id
  - Retourne la catégorie

- PUT /:id
  - Body: { categorieName: string }
  - Met à jour la catégorie

- DELETE /:id
  - Supprime la catégorie

Notes :
- Réponses: 201 pour la création, 204 pour suppression

---

## 8) GroupePartageController
Chemin de base : (pas monté dans index.ts séparément — potentiellement accessible via services ou routes selon implémentation future)
Entité : `GroupePartage`

Endpoints implémentés :
- getGroupesPartage : GET list
- createGroupePartage : POST
- deleteGroupePartage : DELETE /:id
- updateGroupePartage : PUT /:id
- getGroupePartageById : GET /:id

Notes :
- Retourne relations `documents` parfois
- `GroupePartageService` contient la logique métier avancée (création automatique de groupes pour écoles/filières/classes)

---

## 9) MatiereController
Chemin de base : (probablement `/api/matieres` si routée)
Entité : `Matiere` (liens vers `Class`, `Document`)

Endpoints :
- GET / (getMatieres)
  - Retourne matieres avec relations `classe`, `documents`

- POST / (createMatiere)
  - Body: { matiereName: string, classId: string }
  - Crée la matière et l'associe à une classe existante

- PUT /:id (updateMatiere)
  - Body: { matiereName?, classId? }
  - Permet de changer la classe (vérifie existence)

- DELETE /:id (deleteMatiere)
  - Supprime la matière et supprime d'abord les documents associés

Notes :
- Supprime explicitement les documents liés avant de supprimer la matière

---

## 10) NotificationController
Contrôleur présent mais vide (`export class NotificationController {}`)
- Pas d'endpoints implémentés pour l'instant.
- Entité liée : `Notification` (type, message, groupePartage)

---

# Schémas d'entités récapitulatifs (champs principaux)

- User
  - id, firstName, lastName, email (unique), phoneNumber, isActive (bool), isSuspended (bool), role (enum), isVerified (bool), password (hashed), createdAt, updatedAt
  - Relations: school (Ecole), groupesPartage (many-to-many), classe (Class), enseignements

- Document
  - id, documentName, documentUrl, description, isdownloadable, downaloadCount, fileSize, fileType, viewCount, createdAt, updatedAt
  - Relations: categorie (DocumentCategorie), addedBy (User), matiere (Matiere), groupesPartage (many-to-many)

- Filiere
  - id, name, description, createdAt, updatedAt
  - Relations: groupePartage (one-to-one), school (Ecole), classes

- Class
  - id, className, createdAt, updatedAt
  - Relations: groupePartage (one-to-one), filiere, matieres, etudiants

- Ecole
  - id, schoolName, address, schoolEmail, schoolPhone, schoolAdmin, isActive, createdAt, updatedAt
  - Relations: groupePartage (one-to-one), students, filieres

- GroupePartage
  - id, name, description, type (enum: ecole|filiere|classe|custom), createdAt, updatedAt
  - Relations: owner (User), documents (many-to-many), notifications, users (many-to-many)

- Matiere
  - id, matiereName, createdAt, updatedAt
  - Relations: classe, documents

- Notification
  - id, type (enum), message, sharedAt, groupePartage

---

# Exemples JSON utiles pour tests

- Register user (POST /api/users/register)
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "password": "Password123!",
  "phoneNumber": "0612345678",
  "role": "etudiant"
}

- Create école (POST /api/ecoles)
{
  "schoolName": "Lycée Exemple",
  "address": "12 rue Exemple",
  "schoolEmail": "contact@exemple.edu",
  "schoolPhone": "0123456789",
  "schoolAdmin": "admin@exemple.edu"
}

- Create filière (POST /api/filieres)
{
  "name": "Informatique",
  "description": "Filière Informatique",
  "ecoleId": "<ecole-id>"
}

- Create classe (POST /api/classes)
{
  "className": "Terminale S",
  "filiereId": "<filiere-id>"
}

- Create catégorie (POST /api/categories)
{ "categorieName": "Mathématiques" }

- Create matière (POST /api/matieres)
{ "matiereName": "Algèbre", "classId": "<class-id>" }

- Upload document (multipart/form-data) to POST /api/documents/upload
  - file: <fichier>
  - documentName: "TD1 - Algèbre"
  - categorieId: "<categorie-id>"
  - addedById: "<user-id>"
  - matiereId: "<matiere-id>" (optionnel)
  - groupePartageIds: JSON string '["<groupeId1>", "<groupeId2>"]' (optionnel)
  - isdownloadable: "true"

---

# Suggestions / next steps (proactifs)
- Générer automatiquement un fichier Postman / Insomnia collection à partir de ces routes (je peux le faire si vous le souhaitez).
- Ajouter des types TypeScript pour les bodies attendus (DTOs) afin d'améliorer l'autodocumentation et la validation (class-validator).
- Implémenter des contrôleurs manquants (NotificationController) si nécessaire.

---

Si vous voulez que je crée un fichier README dans `src` ou `docs/` avec cette documentation, ou si vous préférez une collection Postman/OpenAPI (Swagger) générée automatiquement, dites-moi lequel et je le génère.
