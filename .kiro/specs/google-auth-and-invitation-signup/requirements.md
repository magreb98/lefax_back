# Requirements Document: Google OAuth Authentication and Invitation Signup

## Introduction

Ce document définit les exigences pour l'implémentation de deux fonctionnalités d'authentification dans le backend Laravel:
1. **Authentification Google OAuth**: Permettre aux utilisateurs de se connecter avec leur compte Google
2. **Inscription par lien d'invitation**: Permettre aux utilisateurs de rejoindre des groupes de partage via un token d'invitation avec enrôlement automatique dans la hiérarchie éducative

Ces fonctionnalités doivent être compatibles avec le frontend React existant et respecter l'architecture Laravel en place (Services, Controllers, FormRequests, Resources).

## Glossary

- **Google_OAuth_Service**: Service Laravel responsable de la vérification des Google ID Tokens et de la gestion de l'authentification Google
- **Auth_Controller**: Contrôleur Laravel gérant les endpoints d'authentification
- **Invitation_Service**: Service Laravel gérant la génération et validation des tokens d'invitation
- **Enrollment_Service**: Service Laravel gérant l'enrôlement automatique des utilisateurs dans la hiérarchie éducative
- **Google_ID_Token**: Token JWT émis par Google après authentification réussie de l'utilisateur
- **Application_JWT**: Token JWT émis par l'application Laravel (via Sanctum) pour authentifier les requêtes API
- **Invitation_Token**: Token unique généré pour permettre à un utilisateur de rejoindre un groupe de partage
- **Groupe_Partage**: Groupe de partage de documents pouvant être de type SCHOOL, FILIERE, CLASS, MATIERE ou CUSTOM
- **Hierarchical_Enrollment**: Processus d'enrôlement automatique d'un utilisateur dans la hiérarchie complète (école, filière, classe, matières)
- **User_Search_Preference**: Préférences de recherche par défaut créées lors de l'enrôlement d'un utilisateur

## Requirements

### Requirement 1: Google OAuth Authentication

**User Story:** En tant qu'utilisateur, je veux me connecter avec mon compte Google, afin d'accéder rapidement à l'application sans créer un nouveau mot de passe.

#### Acceptance Criteria

1. WHEN a valid Google ID Token is provided to the authentication endpoint, THE Google_OAuth_Service SHALL verify the token with Google's authentication library
2. WHEN the Google ID Token is invalid or expired, THE Google_OAuth_Service SHALL return an error with status 401 and error code "INVALID_TOKEN"
3. WHEN a verified Google user does not exist in the database, THE Auth_Controller SHALL create a new user account with the Google email, first name, last name, and Google ID
4. WHEN a verified Google user already exists (matched by email), THE Auth_Controller SHALL update the google_id field if it is null
5. WHEN a Google user successfully authenticates, THE Auth_Controller SHALL generate an Application_JWT using Laravel Sanctum
6. WHEN a Google user successfully authenticates, THE Auth_Controller SHALL update the last_login timestamp
7. WHEN a Google user account is suspended (is_suspended = true), THE Auth_Controller SHALL return an error with status 403 and error code "ACCOUNT_SUSPENDED"
8. WHEN a Google user account is inactive (is_active = false), THE Auth_Controller SHALL return an error with status 403 and error code "ACCOUNT_DISABLED"
9. WHEN a Google authentication succeeds, THE Auth_Controller SHALL return the user object with all relationships (school, classe, groupesPartage) and the Application_JWT

### Requirement 2: Invitation Token Generation

**User Story:** En tant que propriétaire ou administrateur d'un groupe de partage, je veux générer un lien d'invitation, afin de permettre à d'autres utilisateurs de rejoindre mon groupe.

#### Acceptance Criteria

1. WHEN an authorized user requests an invitation token for a groupe, THE Invitation_Service SHALL generate a unique random token of 64 characters
2. WHEN an invitation token is generated, THE Invitation_Service SHALL store it in the groupe_partages.invitation_token field
3. WHEN an invitation token is generated, THE Invitation_Service SHALL set the invitation_expires_at field to 7 days from the current timestamp
4. WHEN a non-owner and non-admin user attempts to generate an invitation token, THE Auth_Controller SHALL return an error with status 403 and error code "INSUFFICIENT_PERMISSIONS"
5. WHEN an invitation token is successfully generated, THE Auth_Controller SHALL return the token and expiration timestamp in ISO 8601 format

### Requirement 3: Join Group via Invitation Token

**User Story:** En tant qu'utilisateur authentifié, je veux rejoindre un groupe de partage via un lien d'invitation, afin d'accéder aux documents partagés dans ce groupe.

#### Acceptance Criteria

1. WHEN a user provides an invitation token, THE Invitation_Service SHALL find the corresponding groupe by matching the token
2. WHEN the invitation token does not match any groupe, THE Auth_Controller SHALL return an error with status 404 and error code "INVALID_TOKEN"
3. WHEN the invitation token is expired (invitation_expires_at < current timestamp), THE Auth_Controller SHALL return an error with status 400 and error code "TOKEN_EXPIRED"
4. WHEN the invitation token is valid and the groupe type is CLASS or MATIERE, THE Enrollment_Service SHALL automatically enroll the user in the complete hierarchy
5. WHEN the invitation token is valid and the groupe type is FILIERE or SCHOOL, THE Auth_Controller SHALL return a list of available classes for user selection
6. WHEN the invitation token is valid and the groupe type is CUSTOM, THE Invitation_Service SHALL add the user to the groupe members
7. WHEN a user is successfully added to a groupe, THE Invitation_Service SHALL create a pivot record in groupe_partage_users table

### Requirement 4: Hierarchical Enrollment for CLASS and MATIERE Groups

**User Story:** En tant qu'utilisateur rejoignant un groupe de classe ou matière, je veux être automatiquement enrôlé dans la hiérarchie complète, afin d'accéder à tous les groupes pertinents sans actions supplémentaires.

#### Acceptance Criteria

1. WHEN a user joins a CLASS groupe via invitation, THE Enrollment_Service SHALL update the user's class_id field with the classe ID
2. WHEN a user joins a CLASS groupe via invitation, THE Enrollment_Service SHALL update the user's school_id field with the école ID from the classe hierarchy
3. WHEN a user joins a CLASS groupe via invitation, THE Enrollment_Service SHALL add the user to the SCHOOL groupe corresponding to the école
4. WHEN a user joins a CLASS groupe via invitation, THE Enrollment_Service SHALL add the user to the FILIERE groupe corresponding to the filière
5. WHEN a user joins a CLASS groupe via invitation, THE Enrollment_Service SHALL add the user to all MATIERE groupes associated with the classe
6. WHEN a user joins a MATIERE groupe via invitation, THE Enrollment_Service SHALL perform the same hierarchical enrollment as CLASS groupe
7. WHEN hierarchical enrollment is complete, THE Enrollment_Service SHALL create default User_Search_Preference records for the user
8. WHEN hierarchical enrollment is complete, THE Auth_Controller SHALL return the updated user object with all groupe memberships

### Requirement 5: Class Selection for FILIERE and SCHOOL Groups

**User Story:** En tant qu'utilisateur rejoignant un groupe d'école ou filière, je veux sélectionner ma classe spécifique, afin d'être enrôlé dans les bons groupes de partage.

#### Acceptance Criteria

1. WHEN a user joins a FILIERE groupe via invitation, THE Auth_Controller SHALL return a list of all classes belonging to that filière
2. WHEN a user joins a SCHOOL groupe via invitation, THE Auth_Controller SHALL return a list of all classes belonging to that école
3. WHEN the class list is returned, THE Auth_Controller SHALL include class name, filière name, and école name for each class
4. WHEN a user provides a selected class_id, THE Enrollment_Service SHALL validate that the class belongs to the invited groupe's hierarchy
5. WHEN the selected class is invalid, THE Auth_Controller SHALL return an error with status 400 and error code "INVALID_CLASS_SELECTION"
6. WHEN a valid class is selected, THE Enrollment_Service SHALL perform the complete hierarchical enrollment as defined in Requirement 4

### Requirement 6: Complete Enrollment Endpoint

**User Story:** En tant qu'utilisateur ayant sélectionné ma classe, je veux finaliser mon enrôlement, afin d'accéder à tous les groupes de partage pertinents.

#### Acceptance Criteria

1. WHEN a user submits a class selection, THE Enrollment_Service SHALL validate the groupe_id and class_id parameters
2. WHEN the groupe_id is invalid, THE Auth_Controller SHALL return an error with status 404 and error code "GROUPE_NOT_FOUND"
3. WHEN the class_id is invalid, THE Auth_Controller SHALL return an error with status 404 and error code "CLASS_NOT_FOUND"
4. WHEN the selected class does not belong to the groupe's hierarchy, THE Auth_Controller SHALL return an error with status 400 and error code "CLASS_NOT_IN_HIERARCHY"
5. WHEN the enrollment is valid, THE Enrollment_Service SHALL update user's class_id and school_id fields
6. WHEN the enrollment is valid, THE Enrollment_Service SHALL add the user to all relevant groupes (SCHOOL, FILIERE, CLASS, MATIERE)
7. WHEN the enrollment is complete, THE Enrollment_Service SHALL create default User_Search_Preference records
8. WHEN the enrollment is complete, THE Auth_Controller SHALL return the updated user object with all groupe memberships and a success message

### Requirement 7: Default Search Preferences Creation

**User Story:** En tant qu'utilisateur nouvellement enrôlé, je veux avoir des préférences de recherche par défaut configurées, afin de voir les documents pertinents dès ma première recherche.

#### Acceptance Criteria

1. WHEN a user completes hierarchical enrollment, THE Enrollment_Service SHALL create a User_Search_Preference record with preference_type "search_settings"
2. WHEN creating default search preferences, THE Enrollment_Service SHALL include all groupe IDs the user is now member of in the preferred_groupe_ids array
3. WHEN creating default search preferences, THE Enrollment_Service SHALL set is_default to true
4. WHEN a User_Search_Preference already exists for the user, THE Enrollment_Service SHALL update the existing record instead of creating a duplicate

### Requirement 8: API Endpoint Structure

**User Story:** En tant que développeur frontend, je veux des endpoints API cohérents et bien documentés, afin d'intégrer facilement l'authentification Google et l'inscription par invitation.

#### Acceptance Criteria

1. THE Auth_Controller SHALL expose a POST endpoint at /api/auth/google accepting a Google ID Token
2. THE Auth_Controller SHALL expose a POST endpoint at /api/groupes-partage/:groupeId/invitation for generating invitation tokens
3. THE Auth_Controller SHALL expose a POST endpoint at /api/groupes-partage/join accepting an invitation_token parameter
4. THE Auth_Controller SHALL expose a POST endpoint at /api/groupes-partage/:groupeId/complete-enrollment accepting a class_id parameter
5. WHEN any endpoint receives invalid JSON, THE Auth_Controller SHALL return an error with status 422 and validation error details
6. WHEN any endpoint is called without authentication (except /api/auth/google), THE Auth_Controller SHALL return an error with status 401
7. THE Auth_Controller SHALL return all responses in JSON format with consistent structure (success, data, message, error fields)

### Requirement 9: Security and Validation

**User Story:** En tant qu'administrateur système, je veux que toutes les entrées utilisateur soient validées et sécurisées, afin de protéger l'application contre les attaques et les données invalides.

#### Acceptance Criteria

1. WHEN validating a Google ID Token, THE Google_OAuth_Service SHALL use the official Google Auth Library for PHP
2. WHEN generating invitation tokens, THE Invitation_Service SHALL use cryptographically secure random generation
3. WHEN accepting user input, THE Auth_Controller SHALL use Laravel FormRequest classes for validation
4. WHEN a validation error occurs, THE Auth_Controller SHALL return detailed validation error messages with status 422
5. WHEN checking user permissions, THE Auth_Controller SHALL verify user roles (superadmin, admin, owner) before allowing privileged operations
6. WHEN storing Google ID, THE Auth_Controller SHALL ensure the google_id field is unique in the database
7. WHEN creating new users via Google OAuth, THE Auth_Controller SHALL set default values (is_active = true, role = "student")

### Requirement 10: Compatibility with Existing System

**User Story:** En tant que développeur, je veux que les nouvelles fonctionnalités s'intègrent parfaitement avec le système existant, afin de maintenir la cohérence et éviter les régressions.

#### Acceptance Criteria

1. THE Google_OAuth_Service SHALL follow the existing Laravel service pattern used in AuthService, UserService, etc.
2. THE Auth_Controller SHALL use existing UserResource and GroupePartageResource for response formatting
3. THE Enrollment_Service SHALL use the existing AutoGroupEnrollmentService if applicable
4. WHEN creating audit logs, THE Auth_Controller SHALL use the existing AuditLogService
5. WHEN sending notifications, THE Enrollment_Service SHALL use the existing NotificationService
6. THE Auth_Controller SHALL respect the existing EnsureUserActive middleware for protected routes
7. THE Auth_Controller SHALL maintain compatibility with the existing frontend API calls in auth.service.ts and groupe.service.ts
