# Requirements Document: Node.js to Laravel Migration

## Introduction

This document specifies the requirements for migrating a Node.js/Express/TypeORM backend application to Laravel 12 (PHP 8.3+). The migration involves converting a multi-tenant educational platform with role-based access control, document management, real-time notifications, and search functionality from TypeScript to PHP while maintaining feature parity and improving code maintainability through Laravel's conventions.

## Glossary

- **Migration_System**: The Laravel 12 application being developed to replace the Node.js backend
- **Source_System**: The existing Node.js/Express/TypeORM backend (lefax_back)
- **Tenant**: A school (Ecole) that represents an isolated data boundary in the multi-tenant architecture
- **User_Role**: One of SUPERADMIN, ADMIN, ENSEIGNANT (teacher), or ETUDIANT (student)
- **Sharing_Group**: A GroupePartage entity that controls document visibility (SCHOOL, CLASS, CUSTOM, MATIERE, FILIERE types)
- **Authentication_Token**: JWT token in Source_System, Sanctum token in Migration_System
- **Eloquent**: Laravel's ORM (Object-Relational Mapping) system
- **FormRequest**: Laravel's validation class for incoming HTTP requests
- **API_Resource**: Laravel's transformation layer for JSON responses
- **Service_Class**: Business logic layer in Laravel (equivalent to TypeScript services)
- **Middleware**: HTTP request filtering layer (exists in both systems)
- **Migration_File**: Laravel database migration file defining schema changes
- **Seeder**: Laravel class for populating database with initial data
- **OpenSearch_Client**: Search engine integration for document content search
- **Broadcasting**: Laravel's real-time event system (replaces Socket.io)
- **Audit_Log**: Security tracking entity recording user actions

## Requirements

### Requirement 1: Database Schema Migration

**User Story:** As a system architect, I want to migrate the TypeORM entity schema to Laravel migrations, so that the database structure is properly versioned and can be deployed consistently.

#### Acceptance Criteria

1. WHEN creating migration files, THE Migration_System SHALL define all tables from Source_System entities (User, Ecole, Classe, Document, GroupePartage, Matiere, Enseignement, Notification, AuditLog, SecurityEvent, DailyMetrics, DocumentCategorie, DocumentMetadata, Filiere, UserSearchPreference)
2. WHEN defining foreign keys, THE Migration_System SHALL enforce referential integrity with ON DELETE and ON UPDATE constraints matching Source_System behavior
3. WHEN defining columns, THE Migration_System SHALL use appropriate Laravel column types (uuid, string, text, timestamp, enum, boolean, integer) matching TypeORM definitions
4. WHEN creating pivot tables, THE Migration_System SHALL define many-to-many relationships (document_groupes_partage, groupe_partage_users, groupe_partage_allowed_publishers)
5. WHEN defining indexes, THE Migration_System SHALL create indexes on foreign keys and frequently queried columns (email, googleId, matricule, invitationToken)
6. WHEN defining unique constraints, THE Migration_System SHALL enforce uniqueness on email, googleId, and matricule columns
7. WHEN defining enum columns, THE Migration_System SHALL use Laravel enum casting for UserRole and GroupePartageType

### Requirement 2: Eloquent Model Implementation

**User Story:** As a developer, I want to create Eloquent models with proper relationships, so that I can query data using Laravel's ORM conventions.

#### Acceptance Criteria

1. WHEN defining model relationships, THE Migration_System SHALL implement all TypeORM relations as Eloquent relationships (hasMany, belongsTo, belongsToMany, hasOne)
2. WHEN defining fillable attributes, THE Migration_System SHALL specify mass-assignable fields following Laravel security best practices
3. WHEN defining hidden attributes, THE Migration_System SHALL hide sensitive fields (password, resetPasswordToken) from JSON serialization
4. WHEN defining casts, THE Migration_System SHALL cast attributes to appropriate types (datetime, boolean, array, enum)
5. WHEN implementing User model, THE Migration_System SHALL include relations for school, classe, addedDocuments, groupesPartage, enseignements, ownedGroupesPartage, searchPreferences, ecoles
6. WHEN implementing Ecole model, THE Migration_System SHALL include relations for schoolAdmin, students, filieres, enseignementAssignments, groupePartage
7. WHEN implementing Document model, THE Migration_System SHALL include relations for categorie, addedBy, matiere, groupesPartage
8. WHEN implementing GroupePartage model, THE Migration_System SHALL include relations for owner, users, allowedPublishers, documents, classe, ecole, filiere, matiere, notifications
9. WHEN defining model events, THE Migration_System SHALL implement BeforeInsert logic (e.g., User setRoleAsStudent) using Eloquent observers or boot methods

### Requirement 3: Authentication System Migration

**User Story:** As a user, I want to authenticate using Laravel Sanctum, so that I can securely access the API with token-based authentication.

#### Acceptance Criteria

1. WHEN a user logs in with valid credentials, THE Migration_System SHALL generate a Sanctum token and return it in the response
2. WHEN a user provides an invalid token, THE Migration_System SHALL return a 401 Unauthorized response with error code
3. WHEN a user account is suspended (isSuspended = true), THE Migration_System SHALL reject authentication with 403 Forbidden and error code ACCOUNT_SUSPENDED
4. WHEN a user account is inactive (isActive = false), THE Migration_System SHALL reject authentication with 403 Forbidden and error code ACCOUNT_DISABLED
5. WHEN a token expires, THE Migration_System SHALL return a 401 Unauthorized response with error code TOKEN_EXPIRED
6. WHEN authenticating requests, THE Migration_System SHALL load user relationships (school, classe, groupesPartage, enseignements, ecoles) for authorization checks
7. WHEN a user's role changes, THE Migration_System SHALL reflect the new role in subsequent authenticated requests without requiring re-login

### Requirement 4: Role-Based Access Control

**User Story:** As a system administrator, I want to enforce role-based permissions, so that users can only access resources appropriate to their role.

#### Acceptance Criteria

1. WHEN a SUPERADMIN user accesses any endpoint, THE Migration_System SHALL grant access without tenant restrictions
2. WHEN an ADMIN user accesses school-scoped endpoints, THE Migration_System SHALL restrict access to their assigned school
3. WHEN an ENSEIGNANT user accesses class-scoped endpoints, THE Migration_System SHALL restrict access to classes they teach (via enseignements relation)
4. WHEN an ETUDIANT user accesses document endpoints, THE Migration_System SHALL restrict access to documents in their sharing groups
5. WHEN a user lacks required role, THE Migration_System SHALL return 403 Forbidden with error code INSUFFICIENT_ROLE and include required and current roles
6. WHEN checking resource access, THE Migration_System SHALL verify user membership in resource sharing groups
7. WHEN a user has canViewAllGroups permission, THE Migration_System SHALL grant access to all sharing groups within their tenant

### Requirement 5: Multi-Tenant Data Isolation

**User Story:** As a school administrator, I want data isolation between schools, so that users from one school cannot access another school's data.

#### Acceptance Criteria

1. WHEN querying users, THE Migration_System SHALL filter results by the authenticated user's school unless the user is SUPERADMIN
2. WHEN querying documents, THE Migration_System SHALL filter results by sharing groups accessible to the authenticated user
3. WHEN creating a school, THE Migration_System SHALL automatically create a SCHOOL-type GroupePartage linked to the school
4. WHEN creating a class, THE Migration_System SHALL automatically create a CLASS-type GroupePartage linked to the class
5. WHEN a user is assigned to a school, THE Migration_System SHALL automatically add them to the school's GroupePartage
6. WHEN a user is assigned to a class, THE Migration_System SHALL automatically add them to the class's GroupePartage and set role to ETUDIANT
7. WHEN a SUPERADMIN queries data, THE Migration_System SHALL not apply tenant filtering

### Requirement 6: User Management API

**User Story:** As an administrator, I want to manage users through API endpoints, so that I can create, update, and delete user accounts.

#### Acceptance Criteria

1. WHEN creating a user with valid data, THE Migration_System SHALL validate input using FormRequest and return 201 Created with user resource
2. WHEN creating a user with duplicate email, THE Migration_System SHALL return 422 Unprocessable Entity with validation error
3. WHEN updating a user, THE Migration_System SHALL validate permissions (ADMIN can update users in their school, SUPERADMIN can update any user)
4. WHEN suspending a user, THE Migration_System SHALL set isSuspended to true and revoke active tokens
5. WHEN deleting a user, THE Migration_System SHALL soft delete the record (if using soft deletes) or prevent deletion if user has associated documents
6. WHEN assigning a user to a class, THE Migration_System SHALL automatically set role to ETUDIANT and enroll in class GroupePartage
7. WHEN listing users, THE Migration_System SHALL paginate results and apply tenant filtering based on authenticated user's role
8. WHEN searching users, THE Migration_System SHALL filter by firstName, lastName, email, matricule, and role

### Requirement 7: Document Management System

**User Story:** As a teacher, I want to upload and share documents with specific groups, so that students can access course materials.

#### Acceptance Criteria

1. WHEN uploading a document, THE Migration_System SHALL validate file type, size, and store using Laravel Storage facade
2. WHEN creating a document record, THE Migration_System SHALL extract metadata (fileSize, fileType, documentName) and associate with authenticated user as addedBy
3. WHEN sharing a document, THE Migration_System SHALL validate user has permission to publish to target GroupePartage (owner, allowedPublisher, or admin)
4. WHEN retrieving documents, THE Migration_System SHALL filter by user's accessible GroupePartage memberships
5. WHEN downloading a document, THE Migration_System SHALL increment downloadCount and log access in AuditLog
6. WHEN viewing a document, THE Migration_System SHALL increment viewCount
7. WHEN deleting a document, THE Migration_System SHALL remove file from storage and database record (with permission check)
8. WHEN listing documents, THE Migration_System SHALL paginate results and eager load relations (categorie, addedBy, matiere, groupesPartage) to prevent N+1 queries

### Requirement 8: Sharing Groups Management

**User Story:** As a teacher, I want to create custom sharing groups, so that I can share documents with specific sets of students.

#### Acceptance Criteria

1. WHEN creating a CUSTOM GroupePartage, THE Migration_System SHALL set authenticated user as owner
2. WHEN creating a SCHOOL or CLASS GroupePartage, THE Migration_System SHALL only allow ADMIN or SUPERADMIN roles
3. WHEN adding users to a GroupePartage, THE Migration_System SHALL validate owner or admin permissions
4. WHEN adding allowedPublishers to a GroupePartage, THE Migration_System SHALL validate owner or admin permissions
5. WHEN generating an invitation token, THE Migration_System SHALL create a unique token with expiration timestamp
6. WHEN a user joins via invitation token, THE Migration_System SHALL validate token is not expired and add user to GroupePartage
7. WHEN listing GroupePartage, THE Migration_System SHALL filter by user membership or ownership
8. WHEN deleting a CUSTOM GroupePartage, THE Migration_System SHALL validate owner or admin permissions and remove associated pivot records

### Requirement 9: File Storage Migration

**User Story:** As a system administrator, I want to migrate file storage to Laravel Storage, so that files are managed consistently with Laravel conventions.

#### Acceptance Criteria

1. WHEN storing uploaded files, THE Migration_System SHALL use Laravel Storage facade with configurable disk (local, s3, etc.)
2. WHEN generating file paths, THE Migration_System SHALL organize by tenant and document type (e.g., schools/{schoolId}/documents/{filename})
3. WHEN serving files, THE Migration_System SHALL validate user access permissions before generating download URL
4. WHEN deleting documents, THE Migration_System SHALL remove files from storage disk
5. WHEN migrating existing files, THE Migration_System SHALL provide a command to copy files from Source_System uploads directory to Laravel storage structure

### Requirement 10: Search Functionality

**User Story:** As a user, I want to search documents by content and metadata, so that I can quickly find relevant materials.

#### Acceptance Criteria

1. WHEN indexing a document, THE Migration_System SHALL send document content and metadata to OpenSearch_Client
2. WHEN searching documents, THE Migration_System SHALL query OpenSearch_Client and filter results by user's accessible GroupePartage
3. WHEN updating a document, THE Migration_System SHALL re-index the document in OpenSearch_Client
4. WHEN deleting a document, THE Migration_System SHALL remove the document from OpenSearch_Client index
5. WHEN search returns results, THE Migration_System SHALL include highlighting of matched terms
6. WHEN OpenSearch_Client is unavailable, THE Migration_System SHALL fallback to database LIKE queries with degraded functionality
7. WHEN saving search preferences, THE Migration_System SHALL store UserSearchPreference records for personalized search

### Requirement 11: Real-Time Notifications

**User Story:** As a user, I want to receive real-time notifications, so that I am informed of new documents and updates.

#### Acceptance Criteria

1. WHEN a document is shared to a GroupePartage, THE Migration_System SHALL create Notification records for all group members
2. WHEN broadcasting notifications, THE Migration_System SHALL use Laravel Broadcasting with Reverb or Pusher driver
3. WHEN a user connects to real-time channel, THE Migration_System SHALL authenticate using Sanctum token
4. WHEN a notification is created, THE Migration_System SHALL broadcast to user-specific channel (e.g., user.{userId})
5. WHEN marking notifications as read, THE Migration_System SHALL update notification status
6. WHEN listing notifications, THE Migration_System SHALL paginate and filter by read/unread status

### Requirement 12: API Validation

**User Story:** As a developer, I want to validate API requests using FormRequests, so that invalid data is rejected before reaching controllers.

#### Acceptance Criteria

1. WHEN receiving a request, THE Migration_System SHALL validate using FormRequest classes with defined rules
2. WHEN validation fails, THE Migration_System SHALL return 422 Unprocessable Entity with detailed error messages
3. WHEN validating user creation, THE Migration_System SHALL enforce rules (email format, password strength, required fields)
4. WHEN validating document upload, THE Migration_System SHALL enforce file type whitelist (pdf, doc, docx, ppt, pptx, xls, xlsx) and max size
5. WHEN validating nested data, THE Migration_System SHALL validate array items (e.g., bulk user import)
6. WHEN authorization fails in FormRequest, THE Migration_System SHALL return 403 Forbidden

### Requirement 13: API Response Formatting

**User Story:** As a frontend developer, I want consistent JSON response formats, so that I can reliably parse API responses.

#### Acceptance Criteria

1. WHEN returning a single resource, THE Migration_System SHALL use API_Resource to format response
2. WHEN returning a collection, THE Migration_System SHALL use ResourceCollection with pagination metadata
3. WHEN returning errors, THE Migration_System SHALL include message, error code, and relevant context
4. WHEN returning validation errors, THE Migration_System SHALL include field-specific error messages
5. WHEN including relationships, THE Migration_System SHALL conditionally load relations based on request parameters (e.g., ?include=school,classe)
6. WHEN formatting timestamps, THE Migration_System SHALL use ISO 8601 format

### Requirement 14: Security and Audit Logging

**User Story:** As a security administrator, I want to track user actions, so that I can audit system usage and detect suspicious activity.

#### Acceptance Criteria

1. WHEN a user performs a sensitive action (login, document upload, user modification), THE Migration_System SHALL create an AuditLog record
2. WHEN a security event occurs (failed login, suspended account access attempt), THE Migration_System SHALL create a SecurityEvent record
3. WHEN logging actions, THE Migration_System SHALL include user ID, IP address, user agent, action type, and affected resource
4. WHEN querying audit logs, THE Migration_System SHALL restrict access to ADMIN and SUPERADMIN roles
5. WHEN detecting suspicious patterns (multiple failed logins), THE Migration_System SHALL increment SecurityEvent counters

### Requirement 15: Rate Limiting and API Protection

**User Story:** As a system administrator, I want to rate limit API requests, so that the system is protected from abuse.

#### Acceptance Criteria

1. WHEN a user exceeds rate limit, THE Migration_System SHALL return 429 Too Many Requests with retry-after header
2. WHEN applying rate limits, THE Migration_System SHALL use different limits for authenticated vs unauthenticated requests
3. WHEN applying rate limits, THE Migration_System SHALL use Laravel's built-in rate limiting with Redis backend
4. WHEN a SUPERADMIN makes requests, THE Migration_System SHALL apply higher rate limits or no limits

### Requirement 16: Database Seeding and Initial Data

**User Story:** As a developer, I want to seed the database with initial data, so that I can test the application with realistic data.

#### Acceptance Criteria

1. WHEN running seeders, THE Migration_System SHALL create default SUPERADMIN user
2. WHEN running seeders, THE Migration_System SHALL create sample schools, classes, and users for testing
3. WHEN running seeders, THE Migration_System SHALL create document categories
4. WHEN running seeders, THE Migration_System SHALL be idempotent (safe to run multiple times)

### Requirement 17: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling, so that I can debug issues and provide helpful error messages.

#### Acceptance Criteria

1. WHEN an exception occurs, THE Migration_System SHALL log error details using Laravel Log facade
2. WHEN a database error occurs, THE Migration_System SHALL return 500 Internal Server Error without exposing SQL details
3. WHEN a validation error occurs, THE Migration_System SHALL return 422 with field-specific messages
4. WHEN a not found error occurs, THE Migration_System SHALL return 404 with resource type
5. WHEN in production environment, THE Migration_System SHALL not expose stack traces in API responses
6. WHEN in development environment, THE Migration_System SHALL include detailed error information

### Requirement 18: Performance Optimization

**User Story:** As a user, I want fast API responses, so that the application feels responsive.

#### Acceptance Criteria

1. WHEN querying relationships, THE Migration_System SHALL use eager loading to prevent N+1 query problems
2. WHEN listing large collections, THE Migration_System SHALL paginate results with configurable page size
3. WHEN caching is enabled, THE Migration_System SHALL cache frequently accessed data (user permissions, school settings)
4. WHEN querying documents, THE Migration_System SHALL use database indexes on foreign keys and search columns

### Requirement 19: Testing Infrastructure

**User Story:** As a developer, I want comprehensive tests, so that I can confidently refactor and add features.

#### Acceptance Criteria

1. WHEN running feature tests, THE Migration_System SHALL test critical API endpoints (auth, user CRUD, document upload)
2. WHEN running tests, THE Migration_System SHALL use in-memory SQLite database for speed
3. WHEN testing authentication, THE Migration_System SHALL use Sanctum::actingAs() for authenticated requests
4. WHEN testing file uploads, THE Migration_System SHALL use Storage::fake() to avoid filesystem operations
5. WHEN testing multi-tenancy, THE Migration_System SHALL verify data isolation between tenants

### Requirement 20: Data Migration Strategy

**User Story:** As a system administrator, I want to migrate existing data from Source_System, so that users can continue using the platform without data loss.

#### Acceptance Criteria

1. WHEN migrating users, THE Migration_System SHALL provide an artisan command to import users from Source_System database
2. WHEN migrating documents, THE Migration_System SHALL copy files and create corresponding database records
3. WHEN migrating relationships, THE Migration_System SHALL preserve GroupePartage memberships and document associations
4. WHEN migration encounters errors, THE Migration_System SHALL log errors and continue processing remaining records
5. WHEN migration completes, THE Migration_System SHALL generate a report of migrated records and any failures
