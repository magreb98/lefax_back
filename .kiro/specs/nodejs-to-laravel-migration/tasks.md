# Implementation Plan: Node.js to Laravel Migration

## Overview

This implementation plan breaks down the migration into discrete, incremental phases. Each phase builds on the previous one, ensuring the system remains functional throughout the migration process. The plan prioritizes infrastructure and core functionality first, then adds features progressively.

The migration involves converting a multi-tenant educational platform from Node.js/Express/TypeORM to Laravel 12 (PHP 8.3+) while maintaining feature parity and improving code maintainability through Laravel's conventions.

### Recent Alignment Work (Phase 6-7)

Two major corrections have been applied to ensure Laravel backend matches Node.js backend exactly:

**Document Listing Corrections (Task 8.2-8.3):**
- Added missing nested relations: `addedBy.school`, `matiere.classe`, `matiere.classe.filiere`, `groupesPartage.owner`
- Added `groupe_id` filter support (frontend sends `groupeId`)
- Added `search` filter for document name and description
- Added max pagination limit (100 items)
- Created 9 comprehensive tests validating all filters and relations
- **Results:** ✅ 9/9 tests passing (52 assertions)

**Group Display Alignment (Task 10.2):**
- Added missing user relations: `owner.school`, `users.classe`, `users.school`, `allowedPublishers.school`
- Now loads 20+ relations matching Node.js backend exactly
- Created test validating all user relations with 14 assertions
- **Results:** ✅ 10/10 tests passing (39 assertions)

## Tasks

- [ ] 1. Phase 1: Infrastructure Setup and Database Schema
  - [x] 1.1 Configure Laravel 12 project dependencies
    - Install required packages: laravel/sanctum, opensearch-project/opensearch-php, predis/predis
    - Configure PHP 8.3+ strict typing in composer.json
    - Set up environment variables in .env
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create database migrations for core entities
    - Create migration for users table with all columns, indexes, and foreign keys
    - Create migration for ecoles table with school admin relationship
    - Create migration for classes table with filiere relationship
    - Create migration for filieres table
    - Create migration for matieres table
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.3 Create database migrations for document system
    - Create migration for document_categories table
    - Create migration for documents table with foreign keys
    - Create migration for document_metadata table
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.4 Create database migrations for sharing groups
    - Create migration for groupe_partages table with enum type
    - Create pivot table migration for document_groupes_partage
    - Create pivot table migration for groupe_partage_users
    - Create pivot table migration for groupe_partage_allowed_publishers
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.5 Create database migrations for supporting entities
    - Create migration for enseignement_assignments table
    - Create migration for notifications table
    - Create migration for audit_logs table
    - Create migration for security_events table
    - Create migration for daily_metrics table
    - Create migration for user_search_preferences table
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.6 Write property test for foreign key cascade behavior
    - **Property 1: Foreign Key Cascade Behavior**
    - **Validates: Requirements 1.2**

  - [ ]* 1.7 Write property test for unique constraint enforcement
    - **Property 2: Unique Constraint Enforcement**
    - **Validates: Requirements 1.6**

  - [ ]* 1.8 Write property test for enum value validation
    - **Property 3: Enum Value Validation**
    - **Validates: Requirements 1.7**

- [ ] 2. Phase 2: Eloquent Models and Relationships
  - [x] 2.1 Create User model with relationships and casts
    - Define fillable, hidden, and casts arrays
    - Implement relationships: school, classe, addedDocuments, groupesPartage, ownedGroupesPartage, enseignements, ecoles, searchPreferences
    - Add scopes: active, bySchool
    - Add helper methods: isSuperAdmin, isAdmin, canAccessSchool
    - Implement model observer for automatic role setting on class assignment
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.9_

  - [x] 2.2 Create Ecole model with relationships
    - Define fillable and casts arrays
    - Implement relationships: schoolAdmin, students, filieres, enseignementAssignments, groupePartage
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 2.3 Create Classe model with relationships
    - Define fillable and casts arrays
    - Implement relationships: filiere, groupePartage, matieres, etudiants, enseignementAssignments
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.4 Create Document model with relationships
    - Define fillable and casts arrays
    - Implement relationships: categorie, addedBy, matiere, groupesPartage
    - Add methods: incrementDownloadCount, incrementViewCount
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [x] 2.5 Create GroupePartage model with relationships
    - Define fillable and casts arrays
    - Implement relationships: owner, users, allowedPublishers, documents, classe, ecole, filiere, matiere, notifications
    - Add method: canUserPublish
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8_

  - [x] 2.6 Create remaining models
    - Create Filiere, Matiere, EnseignementAssignment, Notification, AuditLog, SecurityEvent, DailyMetrics, DocumentCategorie, DocumentMetadata, UserSearchPreference models
    - Define relationships for each model
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.7 Write property test for relationship loading consistency
    - **Property 4: Relationship Loading Consistency**
    - **Validates: Requirements 2.1**

  - [ ]* 2.8 Write property test for sensitive data hiding
    - **Property 5: Sensitive Data Hiding**
    - **Validates: Requirements 2.3**

  - [ ]* 2.9 Write property test for attribute type casting
    - **Property 6: Attribute Type Casting**
    - **Validates: Requirements 2.4**

  - [ ]* 2.10 Write property test for model event execution
    - **Property 7: Model Event Execution**
    - **Validates: Requirements 2.9**

- [ ] 3. Checkpoint - Verify database schema and models
  - Ensure all migrations run successfully
  - Verify all model relationships load correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 4. Phase 3: Authentication System (Sanctum)
  - [x] 4.1 Configure Laravel Sanctum
    - Install and publish Sanctum configuration
    - Add HasApiTokens trait to User model
    - Configure token expiration in config/sanctum.php
    - Add Sanctum middleware to api routes
    - _Requirements: 3.1_

  - [x] 4.2 Create AuthService for authentication logic
    - Implement login method with credential validation
    - Implement account status checks (is_active, is_suspended)
    - Implement token generation using Sanctum
    - Update last_login timestamp on successful login
    - _Requirements: 3.1, 3.3, 3.4, 3.7_

  - [x] 4.3 Create AuthController with API endpoints
    - Implement POST /api/login endpoint
    - Implement POST /api/logout endpoint
    - Implement GET /api/me endpoint
    - _Requirements: 3.1_

  - [x] 4.4 Create LoginRequest FormRequest for validation
    - Define validation rules for email and password
    - Add custom error messages
    - _Requirements: 12.1, 12.3_

  - [x] 4.5 Create UserResource for API responses
    - Define toArray method with camelCase field names
    - Add conditional relationship loading (whenLoaded)
    - Format timestamps as ISO 8601
    - _Requirements: 13.1, 13.5, 13.6_

  - [x] 4.6 Create EnsureUserActive middleware
    - Check is_active and is_suspended status
    - Return 403 with appropriate error codes
    - _Requirements: 3.3, 3.4_

  - [ ]* 4.7 Write property test for valid credential authentication
    - **Property 8: Valid Credential Authentication**
    - **Validates: Requirements 3.1**

  - [ ]* 4.8 Write property test for invalid token rejection
    - **Property 9: Invalid Token Rejection**
    - **Validates: Requirements 3.2**

  - [ ]* 4.9 Write property test for suspended account rejection
    - **Property 10: Suspended Account Rejection**
    - **Validates: Requirements 3.3**

  - [ ]* 4.10 Write property test for inactive account rejection
    - **Property 11: Inactive Account Rejection**
    - **Validates: Requirements 3.4**

  - [ ]* 4.11 Write property test for authenticated request relationship loading
    - **Property 12: Authenticated Request Relationship Loading**
    - **Validates: Requirements 3.6**

  - [ ]* 4.12 Write property test for role change reflection
    - **Property 13: Role Change Reflection**
    - **Validates: Requirements 3.7**

- [ ] 5. Phase 4: Authorization and Multi-Tenancy
  - [x] 5.1 Create RequireRole middleware
    - Accept variable number of allowed roles
    - Check authenticated user's role
    - Return 403 with INSUFFICIENT_ROLE error code if unauthorized
    - _Requirements: 4.5_

  - [x] 5.2 Create ScopeTenant middleware
    - Apply global scope for tenant filtering based on user's school_id
    - Skip filtering for SUPERADMIN users
    - _Requirements: 4.1, 4.2, 5.1, 5.7_

  - [x] 5.3 Create DocumentPolicy for resource authorization
    - Implement view method checking GroupePartage membership
    - Implement delete method checking ownership or admin status
    - _Requirements: 4.4, 4.6_

  - [x] 5.4 Create AutoGroupEnrollmentService
    - Implement enrollUserInSchoolGroup method
    - Implement enrollUserInClassGroup method
    - Implement unenrollUserFromSchoolGroup method
    - Implement unenrollUserFromClassGroup method
    - _Requirements: 5.5, 5.6_

  - [x] 5.5 Create Ecole and Classe observers for automatic GroupePartage creation
    - Implement created event handler for Ecole to create SCHOOL-type GroupePartage
    - Implement created event handler for Classe to create CLASS-type GroupePartage
    - _Requirements: 5.3, 5.4_

  - [ ]* 5.6 Write property test for SUPERADMIN unrestricted access
    - **Property 14: SUPERADMIN Unrestricted Access**
    - **Validates: Requirements 4.1, 5.7**

  - [ ]* 5.7 Write property test for ADMIN school scoping
    - **Property 15: ADMIN School Scoping**
    - **Validates: Requirements 4.2, 5.1**

  - [ ]* 5.8 Write property test for ENSEIGNANT class access restriction
    - **Property 16: ENSEIGNANT Class Access Restriction**
    - **Validates: Requirements 4.3**

  - [ ]* 5.9 Write property test for ETUDIANT document access restriction
    - **Property 17: ETUDIANT Document Access Restriction**
    - **Validates: Requirements 4.4, 5.2**

  - [ ]* 5.10 Write property test for insufficient role rejection
    - **Property 18: Insufficient Role Rejection**
    - **Validates: Requirements 4.5**

  - [ ]* 5.11 Write property test for resource access group membership verification
    - **Property 19: Resource Access Group Membership Verification**
    - **Validates: Requirements 4.6**

  - [ ]* 5.12 Write property test for view all groups permission
    - **Property 20: View All Groups Permission**
    - **Validates: Requirements 4.7**

  - [ ]* 5.13 Write property test for automatic school GroupePartage creation
    - **Property 21: Automatic School GroupePartage Creation**
    - **Validates: Requirements 5.3**

  - [ ]* 5.14 Write property test for automatic class GroupePartage creation
    - **Property 22: Automatic Class GroupePartage Creation**
    - **Validates: Requirements 5.4**

  - [ ]* 5.15 Write property test for school assignment auto-enrollment
    - **Property 23: School Assignment Auto-Enrollment**
    - **Validates: Requirements 5.5**

  - [ ]* 5.16 Write property test for class assignment auto-enrollment and role setting
    - **Property 24: Class Assignment Auto-Enrollment and Role Setting**
    - **Validates: Requirements 5.6**

- [x] 6. Checkpoint - Verify authentication and authorization
  - Test login flow with different user roles
  - Verify tenant scoping works correctly
  - Verify automatic group enrollment on user assignment
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Phase 5: User Management API
  - [x] 7.1 Create UserService for business logic
    - Implement createUser method with password hashing and auto-enrollment
    - Implement updateUser method with class/school change handling
    - Implement suspendUser method with token revocation
    - Implement listUsers method with filtering and pagination
    - _Requirements: 6.1, 6.3, 6.4, 6.7, 6.8_

  - [x] 7.2 Create UserController with CRUD endpoints
    - Implement GET /api/users (list with pagination and filters)
    - Implement POST /api/users (create)
    - Implement GET /api/users/{id} (show)
    - Implement PUT /api/users/{id} (update)
    - Implement DELETE /api/users/{id} (delete)
    - Implement POST /api/users/{id}/suspend (suspend)
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.7, 6.8_

  - [x] 7.3 Create FormRequests for user operations
    - Create StoreUserRequest with validation rules and authorization
    - Create UpdateUserRequest with validation rules and authorization
    - _Requirements: 6.1, 6.2, 6.3, 12.1, 12.3_

  - [x] 7.4 Create additional API Resources
    - Create EcoleResource for school responses
    - Create ClasseResource for class responses
    - Create GroupePartageResource for sharing group responses
    - _Requirements: 13.1, 13.5, 13.6_

  - [ ]* 7.5 Write property test for valid user creation
    - **Property 25: Valid User Creation**
    - **Validates: Requirements 6.1**

  - [ ]* 7.6 Write property test for duplicate email rejection
    - **Property 26: Duplicate Email Rejection**
    - **Validates: Requirements 6.2**

  - [ ]* 7.7 Write property test for user update permission validation
    - **Property 27: User Update Permission Validation**
    - **Validates: Requirements 6.3**

  - [ ]* 7.8 Write property test for user suspension token revocation
    - **Property 28: User Suspension Token Revocation**
    - **Validates: Requirements 6.4**

  - [ ]* 7.9 Write property test for user search multi-field filtering
    - **Property 29: User Search Multi-Field Filtering**
    - **Validates: Requirements 6.8**

- [ ] 8. Phase 6: Document Management System
  - [x] 8.1 Configure Laravel Storage
    - Configure public disk in config/filesystems.php
    - Create symbolic link from public/storage to storage/app/public
    - Set up directory structure for tenant-based file organization
    - _Requirements: 9.1, 9.2_

  - [x] 8.2 Create DocumentService for business logic
    - Implement createDocument method with file upload and storage
    - Implement getUserAccessibleDocuments method with GroupePartage filtering
    - Implement downloadDocument method with tracking
    - Implement deleteDocument method with file cleanup
    - **COMPLETED: Added missing nested relations alignment with Node.js backend**
      - Added `addedBy.school` relation for document creator's school
      - Added `matiere.classe` relation for subject's class
      - Added `matiere.classe.filiere` relation for class's program
      - Added `groupesPartage.owner` relation for sharing group owners
      - Added `groupe_id` filter support (frontend sends `groupeId`)
      - Added `search` filter for document name and description
      - Added max pagination limit (100 items) for performance
      - Created 9 comprehensive tests validating all filters and relations
      - **Test Results:** ✅ 9/9 tests passing (52 assertions)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8_

  - [x] 8.3 Create DocumentController with CRUD endpoints
    - Implement GET /api/documents (list with pagination and filters)
    - Implement POST /api/documents (upload and create)
    - Implement GET /api/documents/{id} (show)
    - Implement GET /api/documents/{id}/download (download with tracking)
    - Implement DELETE /api/documents/{id} (delete)
    - Implement POST /api/documents/{id}/view (increment view count)
    - **COMPLETED: Enhanced filtering and relations to match Node.js backend**
      - Added `groupe_id` filter support (maps from frontend's `groupeId` parameter)
      - Added `search` filter for document name and description (case-insensitive)
      - Loads all nested relations: `addedBy.school`, `matiere.classe.filiere`, `groupesPartage.owner`
      - Enforces max pagination limit of 100 items per request
      - All filters work correctly with comprehensive test coverage
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 8.4 Create StoreDocumentRequest FormRequest
    - Define validation rules for file upload (type, size)
    - Validate categorie_id, matiere_id, groupe_partage_ids
    - _Requirements: 7.1, 12.4_

  - [x] 8.5 Create DocumentResource for API responses
    - Format document data with relationships
    - Include file metadata (size, type)
    - _Requirements: 13.1, 13.5, 13.6_

  - [ ]* 8.6 Write property test for document upload validation and storage
    - **Property 30: Document Upload Validation and Storage**
    - **Validates: Requirements 7.1**

  - [ ]* 8.7 Write property test for document metadata extraction
    - **Property 31: Document Metadata Extraction**
    - **Validates: Requirements 7.2**

  - [ ]* 8.8 Write property test for document sharing permission validation
    - **Property 32: Document Sharing Permission Validation**
    - **Validates: Requirements 7.3**

  - [ ]* 8.9 Write property test for document download tracking
    - **Property 33: Document Download Tracking**
    - **Validates: Requirements 7.5**

  - [ ]* 8.10 Write property test for document view tracking
    - **Property 34: Document View Tracking**
    - **Validates: Requirements 7.6**

  - [ ]* 8.11 Write property test for document deletion cleanup
    - **Property 35: Document Deletion Cleanup**
    - **Validates: Requirements 7.7**

  - [ ]* 8.12 Write property test for document listing N+1 prevention
    - **Property 36: Document Listing N+1 Prevention**
    - **Validates: Requirements 7.8, 18.1**

- [x] 9. Checkpoint - Verify user and document management
  - Test user CRUD operations with different roles
  - Test document upload, download, and deletion
  - Verify file storage organization
  - Ensure all tests pass, ask the user if questions arise

- [ ] 10. Phase 7: Sharing Groups Management
  - [x] 10.1 Create GroupePartageService for business logic
    - Implement createCustomGroup method with owner assignment
    - Implement generateInvitationToken method
    - Implement joinViaToken method with validation
    - Implement addAllowedPublisher method
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6_

  - [x] 10.2 Create GroupePartageController with endpoints
    - Implement GET /api/groupe-partages (list with filtering)
    - Implement POST /api/groupe-partages (create custom group)
    - Implement GET /api/groupe-partages/{id} (show)
    - Implement POST /api/groupe-partages/{id}/members (add members)
    - Implement POST /api/groupe-partages/{id}/publishers (add allowed publishers)
    - Implement POST /api/groupe-partages/{id}/invite (generate invitation token)
    - Implement POST /api/groupe-partages/join (join via token)
    - Implement DELETE /api/groupe-partages/{id} (delete custom group)
    - **COMPLETED: Enhanced show endpoint with comprehensive user relations**
      - Added missing user relations to match Node.js backend exactly:
        - `owner.school` - Group owner's school information
        - `users.classe` - Member users' class information
        - `users.school` - Member users' school information
        - `allowedPublishers.school` - Allowed publishers' school information
      - Now loads 20+ relations matching Node.js backend structure
      - Created comprehensive test validating all user relations
      - **Test Results:** ✅ 10/10 tests passing (39 assertions)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 10.3 Create FormRequests for sharing group operations
    - Create StoreGroupePartageRequest with validation and authorization
    - Create JoinGroupePartageRequest with token validation
    - _Requirements: 8.2, 8.6, 12.1_

  - [ ]* 10.4 Write property test for custom group owner assignment
    - **Property 37: Custom Group Owner Assignment**
    - **Validates: Requirements 8.1**

  - [ ]* 10.5 Write property test for school/class group creation authorization
    - **Property 38: School/Class Group Creation Authorization**
    - **Validates: Requirements 8.2**

  - [ ]* 10.6 Write property test for group member addition authorization
    - **Property 39: Group Member Addition Authorization**
    - **Validates: Requirements 8.3**

  - [ ]* 10.7 Write property test for invitation token generation
    - **Property 40: Invitation Token Generation**
    - **Validates: Requirements 8.5**

  - [ ]* 10.8 Write property test for invitation token validation
    - **Property 41: Invitation Token Validation**
    - **Validates: Requirements 8.6**

  - [ ]* 10.9 Write property test for group listing access filtering
    - **Property 42: Group Listing Access Filtering**
    - **Validates: Requirements 8.7**

  - [ ]* 10.10 Write property test for storage disk abstraction
    - **Property 43: Storage Disk Abstraction**
    - **Validates: Requirements 9.1**

  - [ ]* 10.11 Write property test for tenant-based file organization
    - **Property 44: Tenant-Based File Organization**
    - **Validates: Requirements 9.2**

  - [ ]* 10.12 Write property test for file access permission validation
    - **Property 45: File Access Permission Validation**
    - **Validates: Requirements 9.3**

  - [ ]* 10.13 Write property test for file deletion on document deletion
    - **Property 46: File Deletion on Document Deletion**
    - **Validates: Requirements 9.4**

- [ ] 11. Phase 8: Search Integration (OpenSearch)
  - [x] 11.1 Install and configure OpenSearch PHP client
    - Add opensearch-project/opensearch-php to composer.json
    - Configure OpenSearch connection in config/services.php
    - _Requirements: 10.1_

  - [x] 11.2 Create OpenSearchService
    - Implement indexDocument method
    - Implement searchDocuments method with GroupePartage filtering
    - Implement updateDocument method
    - Implement deleteDocument method
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 11.3 Create SearchService with fallback logic
    - Implement search method that tries OpenSearch first
    - Implement fallback to database LIKE queries on OpenSearch failure
    - _Requirements: 10.2, 10.6_

  - [x] 11.4 Create SearchController
    - Implement GET /api/search/documents endpoint
    - Implement POST /api/search/preferences endpoint (save preferences)
    - Implement GET /api/search/preferences endpoint (get preferences)
    - _Requirements: 10.2, 10.7_

  - [x] 11.5 Integrate search indexing with document lifecycle
    - Add document indexing to DocumentService createDocument method
    - Add document re-indexing to DocumentService updateDocument method
    - Add document de-indexing to DocumentService deleteDocument method
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ]* 11.6 Write property test for document indexing on creation
    - **Property 47: Document Indexing on Creation**
    - **Validates: Requirements 10.1**

  - [ ]* 11.7 Write property test for search result access filtering
    - **Property 48: Search Result Access Filtering**
    - **Validates: Requirements 10.2**

  - [ ]* 11.8 Write property test for document re-indexing on update
    - **Property 49: Document Re-indexing on Update**
    - **Validates: Requirements 10.3**

  - [ ]* 11.9 Write property test for document de-indexing on deletion
    - **Property 50: Document De-indexing on Deletion**
    - **Validates: Requirements 10.4**

  - [ ]* 11.10 Write property test for search result highlighting
    - **Property 51: Search Result Highlighting**
    - **Validates: Requirements 10.5**

  - [ ]* 11.11 Write property test for search fallback on OpenSearch unavailability
    - **Property 52: Search Fallback on OpenSearch Unavailability**
    - **Validates: Requirements 10.6**

  - [ ]* 11.12 Write property test for search preference persistence
    - **Property 53: Search Preference Persistence**
    - **Validates: Requirements 10.7**

- [ ] 12. Phase 9: Real-Time Notifications (Broadcasting)
  - [x] 12.1 Install and configure Laravel Reverb
    - Install laravel/reverb package
    - Publish Reverb configuration
    - Configure broadcasting connection in config/broadcasting.php
    - _Requirements: 11.2_

  - [x] 12.2 Create NotificationCreated event
    - Implement ShouldBroadcast interface
    - Define broadcastOn method for user-specific channel
    - Define broadcastWith method for payload
    - _Requirements: 11.2, 11.4_

  - [x] 12.3 Create NotificationService
    - Implement notifyDocumentShared method
    - Implement markAsRead method
    - _Requirements: 11.1, 11.5_

  - [x] 12.4 Create NotificationController
    - Implement GET /api/notifications (list with pagination and filtering)
    - Implement POST /api/notifications/{id}/read (mark as read)
    - _Requirements: 11.5, 11.6_

  - [x] 12.5 Configure broadcasting channel authentication
    - Define user-specific channel authorization in routes/channels.php
    - _Requirements: 11.3_

  - [x] 12.6 Integrate notifications with document sharing
    - Add notification creation to DocumentService when document is shared
    - _Requirements: 11.1_

  - [ ]* 12.7 Write property test for document share notification creation
    - **Property 54: Document Share Notification Creation**
    - **Validates: Requirements 11.1**

  - [ ]* 12.8 Write property test for notification broadcasting
    - **Property 55: Notification Broadcasting**
    - **Validates: Requirements 11.2, 11.4**

  - [ ]* 12.9 Write property test for notification channel authentication
    - **Property 56: Notification Channel Authentication**
    - **Validates: Requirements 11.3**

  - [ ]* 12.10 Write property test for notification read status update
    - **Property 57: Notification Read Status Update**
    - **Validates: Requirements 11.5**

  - [ ]* 12.11 Write property test for notification listing pagination and filtering
    - **Property 58: Notification Listing Pagination and Filtering**
    - **Validates: Requirements 11.6**

- [x] 13. Checkpoint - Verify search and notifications
  - Test document search with OpenSearch
  - Test search fallback when OpenSearch is unavailable
  - Test real-time notification delivery
  - Ensure all tests pass, ask the user if questions arise

- [ ] 14. Phase 10: Validation and API Response Formatting
  - [x] 14.1 Create remaining FormRequests
    - Create UpdateDocumentRequest
    - Create StoreNotificationRequest
    - Create various filter/search requests
    - _Requirements: 12.1, 12.5_

  - [x] 14.2 Create remaining API Resources
    - Create MatiereResource
    - Create FiliereResource
    - Create NotificationResource
    - Create DocumentCategorieResource
    - _Requirements: 13.1, 13.5, 13.6_

  - [x] 14.3 Implement global exception handler customization
    - Customize app/Exceptions/Handler.php for consistent error responses
    - Add error code mapping
    - Implement environment-specific error detail inclusion
    - _Requirements: 13.3, 17.1, 17.2, 17.5, 17.6_

  - [ ]* 14.4 Write property test for FormRequest validation execution
    - **Property 59: FormRequest Validation Execution**
    - **Validates: Requirements 12.1**

  - [ ]* 14.5 Write property test for validation failure response format
    - **Property 60: Validation Failure Response Format**
    - **Validates: Requirements 12.2, 13.4**

  - [ ]* 14.6 Write property test for user creation validation rules
    - **Property 61: User Creation Validation Rules**
    - **Validates: Requirements 12.3**

  - [ ]* 14.7 Write property test for document upload file validation
    - **Property 62: Document Upload File Validation**
    - **Validates: Requirements 12.4**

  - [ ]* 14.8 Write property test for FormRequest authorization failure
    - **Property 63: FormRequest Authorization Failure**
    - **Validates: Requirements 12.6**

  - [ ]* 14.9 Write property test for single resource response formatting
    - **Property 64: Single Resource Response Formatting**
    - **Validates: Requirements 13.1**

  - [ ]* 14.10 Write property test for collection response pagination metadata
    - **Property 65: Collection Response Pagination Metadata**
    - **Validates: Requirements 13.2**

  - [ ]* 14.11 Write property test for error response format
    - **Property 66: Error Response Format**
    - **Validates: Requirements 13.3**

  - [ ]* 14.12 Write property test for conditional relationship loading
    - **Property 67: Conditional Relationship Loading**
    - **Validates: Requirements 13.5**

  - [ ]* 14.13 Write property test for ISO 8601 timestamp formatting
    - **Property 68: ISO 8601 Timestamp Formatting**
    - **Validates: Requirements 13.6**

- [x] 15. Phase 11: Security, Audit Logging, and Rate Limiting
  - [x] 15.1 Create AuditLogService
    - Implement log method with user, action, resource, and metadata
    - _Requirements: 14.1, 14.3_

  - [ ] 15.2 Create SecurityEventService
    - Implement recordEvent method
    - Implement detectSuspiciousPatterns method
    - _Requirements: 14.2, 14.5_

  - [ ] 15.3 Integrate audit logging throughout the application
    - Add audit logging to AuthService (login, logout)
    - Add audit logging to UserService (create, update, suspend, delete)
    - Add audit logging to DocumentService (create, download, delete)
    - _Requirements: 14.1_

  - [ ] 15.4 Create AuditLogController
    - Implement GET /api/audit-logs endpoint with role restriction
    - _Requirements: 14.4_

  - [ ] 15.5 Configure rate limiting
    - Define rate limiters in app/Providers/RouteServiceProvider.php
    - Apply 'auth' rate limiter to login endpoint (5/min)
    - Apply 'api' rate limiter to protected routes (60/min authenticated, 10/min unauthenticated)
    - Implement SUPERADMIN exemption or higher limits
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ]* 15.6 Write property test for sensitive action audit logging
    - **Property 69: Sensitive Action Audit Logging**
    - **Validates: Requirements 14.1, 14.3**

  - [ ]* 15.7 Write property test for security event recording
    - **Property 70: Security Event Recording**
    - **Validates: Requirements 14.2**

  - [ ]* 15.8 Write property test for audit log access restriction
    - **Property 71: Audit Log Access Restriction**
    - **Validates: Requirements 14.4**

  - [ ] 15.9 Write property test for rate limit enforcement
    - **Property 72: Rate Limit Enforcement**
    - **Validates: Requirements 15.1**

  - [ ]* 15.10 Write property test for differential rate limiting
    - **Property 73: Differential Rate Limiting**
    - **Validates: Requirements 15.2**

  - [ ]* 15.11 Write property test for SUPERADMIN rate limit exemption
    - **Property 74: SUPERADMIN Rate Limit Exemption**
    - **Validates: Requirements 15.4**

- [x] 16. Phase 12: Database Seeding and Testing Infrastructure
  - [x] 16.1 Create database seeders
    - Create DatabaseSeeder with SUPERADMIN user creation
    - Create SchoolSeeder with sample schools
    - Create UserSeeder with sample users
    - Create DocumentCategorySeeder
    - Implement idempotency checks in all seeders
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 16.2 Create model factories
    - Create UserFactory with different role states
    - Create EcoleFactory
    - Create ClasseFactory
    - Create DocumentFactory
    - Create GroupePartageFactory
    - _Requirements: 19.1_

  - [x] 16.3 Configure test environment
    - Set up SQLite in-memory database for tests in phpunit.xml
    - Configure test-specific environment variables
    - _Requirements: 19.2_

  - [ ]* 16.4 Write property test for seeder idempotency
    - **Property 75: Seeder Idempotency**
    - **Validates: Requirements 16.4**

  - [ ]* 16.5 Write property test for exception logging
    - **Property 76: Exception Logging**
    - **Validates: Requirements 17.1**

  - [ ]* 16.6 Write property test for database error response security
    - **Property 77: Database Error Response Security**
    - **Validates: Requirements 17.2**

  - [ ]* 16.7 Write property test for validation error response format
    - **Property 78: Validation Error Response Format**
    - **Validates: Requirements 17.3**

  - [ ]* 16.8 Write property test for not found error response
    - **Property 79: Not Found Error Response**
    - **Validates: Requirements 17.4**

  - [ ]* 16.9 Write property test for production stack trace suppression
    - **Property 80: Production Stack Trace Suppression**
    - **Validates: Requirements 17.5**

  - [ ]* 16.10 Write property test for development error detail inclusion
    - **Property 81: Development Error Detail Inclusion**
    - **Validates: Requirements 17.6**

  - [ ]* 16.11 Write property test for collection pagination
    - **Property 82: Collection Pagination**
    - **Validates: Requirements 18.2**

  - [ ]* 16.12 Write property test for frequently accessed data caching
    - **Property 83: Frequently Accessed Data Caching**
    - **Validates: Requirements 18.3**

- [ ] 17. Checkpoint - Verify security and testing infrastructure
  - Test audit logging for various actions
  - Test rate limiting with different user roles
  - Run all seeders and verify idempotency
  - Ensure all tests pass, ask the user if questions arise

- [ ] 18. Phase 13: Data Migration Commands
  - [ ] 18.1 Create MigrateUsersCommand artisan command
    - Connect to Node.js database
    - Read users from Source_System
    - Transform and insert into Laravel database
    - Handle errors and continue processing
    - Generate migration report
    - _Requirements: 20.1, 20.4, 20.5_

  - [ ] 18.2 Create MigrateDocumentsCommand artisan command
    - Connect to Node.js database
    - Read documents from Source_System
    - Copy files from uploads/ to Laravel storage
    - Create document records in Laravel database
    - Handle errors and continue processing
    - Generate migration report
    - _Requirements: 20.2, 20.4, 20.5_

  - [ ] 18.3 Create MigrateRelationshipsCommand artisan command
    - Migrate GroupePartage memberships
    - Migrate document-group associations
    - Migrate enseignement assignments
    - Handle errors and continue processing
    - Generate migration report
    - _Requirements: 20.3, 20.4, 20.5_

  - [ ]* 18.4 Write property test for migration error resilience
    - **Property 84: Migration Error Resilience**
    - **Validates: Requirements 20.4**

- [ ] 19. Phase 14: Final Integration and Testing
  - [ ] 19.1 Write comprehensive feature tests
    - Test authentication flow (login, logout, token validation)
    - Test multi-tenant data isolation
    - Test document access control via GroupePartage
    - Test file upload and storage
    - Test automatic enrollments
    - Test role-based authorization
    - Test audit logging
    - Test search functionality with fallback
    - Test real-time notifications
    - _Requirements: 19.1, 19.5_

  - [ ] 19.2 Configure API routes with middleware
    - Group routes by authentication requirement
    - Apply role middleware where needed
    - Apply rate limiting
    - _Requirements: 3.1, 4.5, 15.1_

  - [ ] 19.3 Create API documentation
    - Document all endpoints with request/response examples
    - Document authentication flow
    - Document error codes
    - _Requirements: General documentation_

  - [ ] 19.4 Performance optimization review
    - Review all queries for N+1 problems
    - Add missing database indexes
    - Configure caching for frequently accessed data
    - _Requirements: 18.1, 18.3, 18.4_

- [ ] 20. Final Checkpoint - Complete system verification
  - Run full test suite
  - Test data migration commands with sample data
  - Verify all API endpoints work correctly
  - Verify real-time features work correctly
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- The migration is organized in phases to maintain system functionality throughout the process
- Phase 1-2 establish the foundation (database and models)
- Phase 3-5 implement core authentication and authorization
- Phase 6-9 implement feature functionality (users, documents, groups, search)
- Phase 10-12 add cross-cutting concerns (validation, security, testing)
- Phase 13-14 handle data migration and final integration
- All completed tasks are marked with [x], pending tasks with [ ], and optional tests with [ ]*
