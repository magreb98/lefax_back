# Document d'Exigences

## Introduction

Cette spécification définit deux fonctionnalités pour la plateforme éducative Lefax :
1. L'ajout d'un champ "matricule" (numéro d'identification unique) pour les étudiants et enseignants
2. Un système d'import en masse d'utilisateurs via fichiers Excel (.xlsx) ou CSV

Ces fonctionnalités permettront aux administrateurs de gérer plus efficacement les utilisateurs en leur attribuant des identifiants uniques et en facilitant l'intégration de groupes d'utilisateurs via des imports de fichiers.

## Glossaire

- **System**: Le backend de la plateforme Lefax (Node.js/TypeScript, Express, TypeORM, MySQL)
- **Admin**: Utilisateur avec le rôle ADMIN ou SUPERADMIN
- **Matricule**: Numéro d'identification unique alphanumérique attribué à un étudiant ou enseignant
- **École**: Entité représentant un établissement scolaire dans le système
- **Classe**: Groupe d'étudiants au sein d'une école
- **Matière**: Discipline enseignée, associée à des enseignants
- **Import_File**: Fichier Excel (.xlsx) ou CSV contenant des données d'utilisateurs à importer
- **Import_Report**: Rapport détaillé généré après une opération d'import
- **Temporary_Password**: Mot de passe généré automatiquement lors de la création d'un utilisateur

## Exigences

### Exigence 1: Gestion du Champ Matricule

**User Story:** En tant qu'administrateur, je veux attribuer un matricule unique à chaque étudiant et enseignant, afin de pouvoir les identifier de manière fiable au sein de leur école.

#### Critères d'Acceptation

1. THE System SHALL store a matricule field for users with role ETUDIANT or ENSEIGNANT
2. WHEN an Admin creates a user manually, THE System SHALL allow the matricule field to be optional
3. WHEN a matricule is provided, THE System SHALL validate that it contains only alphanumeric characters
4. WHEN a matricule is provided for a user, THE System SHALL verify that no other user in the same school has the same matricule
5. WHEN a matricule uniqueness violation is detected, THE System SHALL reject the operation and return a descriptive error message
6. WHEN an Admin updates a user profile, THE System SHALL allow modification of the matricule field
7. WHEN displaying user lists or profiles, THE System SHALL include the matricule field in the response

### Exigence 2: Validation et Contraintes du Matricule

**User Story:** En tant qu'administrateur, je veux que le système garantisse l'unicité des matricules au sein de chaque école, afin d'éviter les conflits d'identification.

#### Critères d'Acceptation

1. THE System SHALL enforce matricule uniqueness within the scope of a single school
2. THE System SHALL allow the same matricule value to exist in different schools
3. WHEN validating a matricule, THE System SHALL accept values containing letters (a-z, A-Z) and digits (0-9)
4. WHEN validating a matricule, THE System SHALL reject values containing special characters or whitespace
5. THE System SHALL store matricule values in a case-sensitive manner

### Exigence 3: Import en Masse - Parsing de Fichiers

**User Story:** En tant qu'administrateur, je veux importer des étudiants et enseignants via des fichiers Excel ou CSV, afin de gagner du temps lors de l'intégration de nouveaux utilisateurs.

#### Critères d'Acceptation

1. WHEN an Admin uploads an Import_File, THE System SHALL accept files with .xlsx extension
2. WHEN an Admin uploads an Import_File, THE System SHALL accept files with .csv extension
3. WHEN parsing an Import_File for students, THE System SHALL expect columns: matricule, firstName, lastName, email, phoneNumber, classeId
4. WHEN parsing an Import_File for teachers, THE System SHALL expect columns: matricule, firstName, lastName, email, phoneNumber, matiereIds
5. WHEN parsing a CSV file, THE System SHALL use comma as the default delimiter
6. WHEN an Import_File exceeds 1000 rows, THE System SHALL reject the file and return an error message
7. WHEN an Import_File has missing required columns, THE System SHALL reject the file and return a descriptive error message

### Exigence 4: Import en Masse - Validation des Données

**User Story:** En tant qu'administrateur, je veux que le système valide chaque ligne du fichier d'import, afin d'identifier les erreurs avant la création des utilisateurs.

#### Critères d'Acceptation

1. WHEN processing an import row, THE System SHALL validate that the matricule field is present and non-empty
2. WHEN processing an import row, THE System SHALL validate that the email field contains a valid email format
3. WHEN processing an import row, THE System SHALL verify that the email is unique across the entire system
4. WHEN processing an import row for a student, THE System SHALL verify that the classeId references an existing class
5. WHEN processing an import row for a teacher, THE System SHALL verify that all matiereIds reference existing subjects
6. WHEN processing an import row, THE System SHALL validate that the matricule is unique within the school
7. WHEN a validation error occurs on a row, THE System SHALL continue processing remaining rows
8. WHEN a validation error occurs on a row, THE System SHALL record the error with the row number and field name

### Exigence 5: Import en Masse - Création des Utilisateurs

**User Story:** En tant qu'administrateur, je veux que le système crée automatiquement les comptes utilisateurs à partir des données validées, afin de simplifier le processus d'intégration.

#### Critères d'Acceptation

1. WHEN a row passes validation, THE System SHALL create a new user account with the provided data
2. WHEN creating a user from import, THE System SHALL generate a Temporary_Password automatically
3. WHEN creating a user from import, THE System SHALL assign the appropriate role (ETUDIANT or ENSEIGNANT)
4. WHEN creating a student from import, THE System SHALL associate the student with the specified class
5. WHEN creating a teacher from import, THE System SHALL associate the teacher with the specified subjects
6. WHEN creating a user from import, THE System SHALL set the user's school based on the Admin's school context
7. THE System SHALL create all valid users in a single database transaction

### Exigence 6: Import en Masse - Gestion des Erreurs et Rollback

**User Story:** En tant qu'administrateur, je veux que le système gère les erreurs de manière robuste, afin de maintenir l'intégrité des données.

#### Critères d'Acceptation

1. WHEN a critical database error occurs during import, THE System SHALL rollback all user creations from that import
2. WHEN validation errors occur on individual rows, THE System SHALL create users for valid rows only
3. WHEN a duplicate email is detected during import, THE System SHALL skip that row and record it as an error
4. WHEN a duplicate matricule is detected during import, THE System SHALL skip that row and record it as an error
5. THE System SHALL log all import operations with timestamp, admin user, and file name

### Exigence 7: Import en Masse - Rapport d'Import

**User Story:** En tant qu'administrateur, je veux recevoir un rapport détaillé après chaque import, afin de connaître le résultat de l'opération et identifier les problèmes.

#### Critères d'Acceptation

1. WHEN an import operation completes, THE System SHALL generate an Import_Report
2. THE Import_Report SHALL include the total number of rows processed
3. THE Import_Report SHALL include the number of users successfully created
4. THE Import_Report SHALL include the number of rows with validation errors
5. THE Import_Report SHALL include a list of errors with row numbers and error descriptions
6. THE Import_Report SHALL include a list of duplicate emails or matricules detected
7. WHEN an import completes, THE System SHALL return the Import_Report in the API response

### Exigence 8: Import en Masse - Notification par Email (Optionnel)

**User Story:** En tant qu'administrateur, je veux pouvoir envoyer automatiquement les identifiants aux nouveaux utilisateurs, afin qu'ils puissent accéder à la plateforme immédiatement.

#### Critères d'Acceptation

1. WHERE email notification is enabled, WHEN a user is created via import, THE System SHALL send an email to the user's email address
2. WHERE email notification is enabled, THE email SHALL include the user's email and Temporary_Password
3. WHERE email notification is enabled, THE email SHALL include instructions for first login
4. WHERE email notification fails for a user, THE System SHALL record the failure in the Import_Report but continue processing
5. THE System SHALL allow the Admin to enable or disable email notifications via an import parameter

### Exigence 9: Sécurité et Contrôle d'Accès

**User Story:** En tant que système, je veux restreindre l'accès aux fonctionnalités d'import et de gestion des matricules, afin de protéger les données sensibles.

#### Critères d'Acceptation

1. THE System SHALL restrict matricule creation and modification to users with role ADMIN or SUPERADMIN
2. THE System SHALL restrict import operations to users with role ADMIN or SUPERADMIN
3. WHEN a non-Admin user attempts to access import endpoints, THE System SHALL return a 403 Forbidden error
4. WHEN a non-Admin user attempts to modify a matricule, THE System SHALL return a 403 Forbidden error
5. THE System SHALL validate the Admin's authentication token before processing any import or matricule operation

### Exigence 10: Migration de Base de Données

**User Story:** En tant que développeur, je veux une migration de base de données pour ajouter le champ matricule, afin de maintenir la cohérence du schéma.

#### Critères d'Acceptation

1. THE System SHALL provide a TypeORM migration to add the matricule column to the User table
2. THE migration SHALL define the matricule column as nullable VARCHAR
3. THE migration SHALL create a unique index on (matricule, schoolId) combination
4. THE migration SHALL be reversible (support rollback)
5. WHEN the migration is executed, THE System SHALL preserve all existing user data
