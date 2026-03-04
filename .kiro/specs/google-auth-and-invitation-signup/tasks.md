# Implementation Plan: Google OAuth Authentication and Invitation Signup

## Overview

This implementation plan breaks down the Google OAuth authentication and invitation-based signup features into discrete, incremental coding tasks. Each task builds on previous work and includes testing to validate functionality early.

The implementation follows Laravel best practices and integrates with the existing architecture (Services, Controllers, FormRequests, Resources). All tasks reference specific requirements for traceability.

## Tasks

- [x] 1. Install Google OAuth dependencies and configure environment
  - Install `google/apiclient` package via Composer
  - Add `GOOGLE_CLIENT_ID` to `.env` and `.env.example`
  - Add Google client configuration to `config/services.php`
  - _Requirements: 1.1, 9.1_

- [ ] 2. Create GoogleOAuthService
  - [x] 2.1 Create `app/Services/GoogleOAuthService.php` with constructor injection
    - Inject `AuditLogService` dependency
    - Initialize Google Client with configuration
    - _Requirements: 1.1, 10.1_
  
  - [x] 2.2 Implement `verifyGoogleToken()` method
    - Use Google Client to verify ID token
    - Extract payload (email, given_name, family_name, sub)
    - Throw exception for invalid tokens
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.3 Implement `findOrCreateUser()` method
    - Find user by email
    - If exists and google_id is null, update google_id
    - If not exists, create new user with defaults (role=student, is_active=true, is_verified=true)
    - Log user creation/update via AuditLogService
    - _Requirements: 1.3, 1.4, 9.7, 10.4_
  
  - [ ]* 2.4 Write property test for token verification
    - **Property 1: Google token verification**
    - **Validates: Requirements 1.1**
  
  - [ ]* 2.5 Write property test for new user creation
    - **Property 3: New user creation from Google**
    - **Validates: Requirements 1.3, 9.7**
  
  - [ ]* 2.6 Write property test for existing user update
    - **Property 4: Existing user Google ID update**
    - **Validates: Requirements 1.4**
  
  - [ ]* 2.7 Write unit tests for error handling
    - Test invalid token rejection
    - Test Google API exceptions
    - _Requirements: 1.2_


- [ ] 3. Create Google Auth endpoint in AuthController
  - [x] 3.1 Create `app/Http/Requests/GoogleAuthRequest.php` FormRequest
    - Validate `idToken` field (required, string)
    - _Requirements: 8.1, 9.3_
  
  - [x] 3.2 Add `googleAuth()` method to AuthController
    - Inject GoogleOAuthService
    - Call verifyGoogleToken() and findOrCreateUser()
    - Check is_suspended and is_active status
    - Generate Sanctum token
    - Update last_login timestamp
    - Return user with relationships and token
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 1.9_
  
  - [x] 3.3 Add route `POST /api/auth/google` in `routes/api.php`
    - Route should not require authentication
    - _Requirements: 8.1_
  
  - [ ]* 3.4 Write property test for suspended account rejection
    - **Property 5: Suspended account rejection**
    - **Validates: Requirements 1.7**
  
  - [ ]* 3.5 Write property test for inactive account rejection
    - **Property 6: Inactive account rejection**
    - **Validates: Requirements 1.8**
  
  - [ ]* 3.6 Write property test for success response
    - **Property 7: Google auth success response**
    - **Validates: Requirements 1.5, 1.6, 1.9**
  
  - [ ]* 3.7 Write integration test for complete Google OAuth flow
    - Test end-to-end authentication
    - Test response format
    - _Requirements: 1.1, 1.9_

- [x] 4. Checkpoint - Ensure Google OAuth tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Create InvitationService
  - [x] 5.1 Create `app/Services/InvitationService.php` with constructor injection
    - Inject AuditLogService dependency
    - _Requirements: 10.1, 10.4_
  
  - [x] 5.2 Implement `generateInvitationToken()` method
    - Generate 64-character random token using `Str::random(64)`
    - Update groupe invitation_token and invitation_expires_at (7 days)
    - Log token generation
    - Return token
    - _Requirements: 2.1, 2.2, 2.3, 9.2_
  
  - [x] 5.3 Implement `validateInvitationToken()` method
    - Find groupe by token
    - Check expiration (throw exception if expired)
    - Return groupe with relationships loaded
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 5.4 Implement `addUserToGroupe()` method
    - Create pivot record in groupe_partage_users
    - Check for existing membership to avoid duplicates
    - Log membership addition
    - _Requirements: 3.6, 3.7_
  
  - [ ]* 5.5 Write property test for token generation
    - **Property 8: Token generation and storage**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [ ]* 5.6 Write property test for token uniqueness
    - **Property 11: Token uniqueness**
    - **Validates: Requirements 9.2**
  
  - [ ]* 5.7 Write property test for token validation
    - **Property 12: Token validation and lookup**
    - **Validates: Requirements 3.1**
  
  - [ ]* 5.8 Write unit tests for error cases
    - Test invalid token rejection
    - Test expired token rejection
    - _Requirements: 3.2, 3.3_


- [ ] 6. Create EnrollmentService
  - [x] 6.1 Create `app/Services/EnrollmentService.php` with constructor injection
    - Inject AutoGroupEnrollmentService, AuditLogService, NotificationService
    - _Requirements: 10.1, 10.3, 10.4, 10.5_
  
  - [x] 6.2 Implement `getAvailableClasses()` method
    - For SCHOOL type: get all classes in that école
    - For FILIERE type: get all classes in that filière
    - Load relationships (filiere, ecole) for each class
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 6.3 Implement `validateClassSelection()` method
    - Validate class exists
    - Validate class belongs to groupe hierarchy
    - Return boolean
    - _Requirements: 5.4, 6.1_
  
  - [x] 6.4 Implement `enrollUserInHierarchy()` method for CLASS/MATIERE
    - Wrap in database transaction
    - Update user.class_id and user.school_id
    - Get école, filière, classe, and all matieres from hierarchy
    - Find or get SCHOOL, FILIERE, CLASS, MATIERE groupes
    - Add user to all groupes via pivot table
    - Call createDefaultSearchPreferences()
    - Send notification via NotificationService
    - Log enrollment via AuditLogService
    - Return updated user with relationships
    - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 10.5_
  
  - [x] 6.5 Implement `createDefaultSearchPreferences()` method
    - Get all groupe IDs user is member of
    - Create or update UserSearchPreference record
    - Set preference_type = "search_settings"
    - Set preference_value with preferred_groupe_ids array
    - Set is_default = true
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 6.6 Write property test for complete hierarchical enrollment
    - **Property 17: Complete hierarchical enrollment for CLASS/MATIERE**
    - **Validates: Requirements 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7**
  
  - [ ]* 6.7 Write property test for MATIERE enrollment equivalence
    - **Property 18: MATIERE enrollment equivalence**
    - **Validates: Requirements 4.6**
  
  - [ ]* 6.8 Write property test for search preferences creation
    - **Property 26: Search preferences creation**
    - **Validates: Requirements 7.1, 7.2, 7.3, 6.7**
  
  - [ ]* 6.9 Write property test for search preferences idempotence
    - **Property 27: Search preferences idempotence**
    - **Validates: Requirements 7.4**
  
  - [ ]* 6.10 Write unit tests for class validation
    - Test valid class selection
    - Test invalid class selection
    - _Requirements: 5.4, 6.1_

- [x] 7. Checkpoint - Ensure enrollment service tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 8. Add invitation generation endpoint to GroupePartageController
  - [x] 8.1 Add `generateInvitation()` method to GroupePartageController
    - Inject InvitationService
    - Check authorization (owner, admin, or superadmin)
    - Call InvitationService.generateInvitationToken()
    - Return token and expiration in ISO 8601 format
    - _Requirements: 2.4, 2.5_
  
  - [x] 8.2 Add route `POST /api/groupes-partage/{groupePartage}/invitation` in `routes/api.php`
    - Route requires authentication
    - _Requirements: 8.2_
  
  - [ ]* 8.3 Write property test for authorization check
    - **Property 9: Token generation authorization**
    - **Validates: Requirements 2.4**
  
  - [ ]* 8.4 Write property test for response format
    - **Property 10: Token generation response format**
    - **Validates: Requirements 2.5**
  
  - [ ]* 8.5 Write integration test for token generation endpoint
    - Test complete flow
    - Test response structure
    - _Requirements: 2.1, 2.5_

- [ ] 9. Add join via invitation endpoint to GroupePartageController
  - [x] 9.1 Create `app/Http/Requests/JoinGroupeRequest.php` FormRequest
    - Validate `invitation_token` or `token` field (required, string)
    - Support both field names for compatibility
    - _Requirements: 8.3, 9.3_
  
  - [x] 9.2 Add `joinViaInvitation()` method to GroupePartageController
    - Inject InvitationService and EnrollmentService
    - Call InvitationService.validateInvitationToken()
    - Check groupe type
    - If CUSTOM: call InvitationService.addUserToGroupe()
    - If CLASS/MATIERE: call EnrollmentService.enrollUserInHierarchy()
    - If SCHOOL/FILIERE: call EnrollmentService.getAvailableClasses() and return class list
    - Return appropriate response based on type
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 9.3 Add route `POST /api/groupes-partage/join` in `routes/api.php`
    - Route requires authentication
    - _Requirements: 8.3_
  
  - [ ]* 9.4 Write property test for CUSTOM groupe join
    - **Property 15: CUSTOM groupe simple join**
    - **Validates: Requirements 3.6, 3.7**
  
  - [ ]* 9.5 Write property test for FILIERE/SCHOOL class selection response
    - **Property 16: FILIERE/SCHOOL class selection response**
    - **Validates: Requirements 3.5, 5.1, 5.2, 5.3**
  
  - [ ]* 9.6 Write integration test for join endpoint
    - Test all groupe types
    - Test error cases
    - _Requirements: 3.1, 3.4, 3.5, 3.6_


- [ ] 10. Add complete enrollment endpoint to GroupePartageController
  - [x] 10.1 Create `app/Http/Requests/CompleteEnrollmentRequest.php` FormRequest
    - Validate `class_id` field (required, uuid, exists:classes,id)
    - _Requirements: 8.4, 9.3_
  
  - [x] 10.2 Add `completeEnrollment()` method to GroupePartageController
    - Inject EnrollmentService
    - Validate groupe exists
    - Validate class selection via EnrollmentService.validateClassSelection()
    - Call EnrollmentService.enrollUserInHierarchy() with selected class
    - Return updated user with success message
    - Handle validation errors (GROUPE_NOT_FOUND, CLASS_NOT_FOUND, CLASS_NOT_IN_HIERARCHY)
    - _Requirements: 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_
  
  - [x] 10.3 Add route `POST /api/groupes-partage/{groupePartage}/complete-enrollment` in `routes/api.php`
    - Route requires authentication
    - _Requirements: 8.4_
  
  - [ ]* 10.4 Write property test for class selection validation
    - **Property 20: Class selection validation**
    - **Validates: Requirements 5.4, 6.1**
  
  - [ ]* 10.5 Write property test for invalid class rejection
    - **Property 21: Invalid class selection rejection**
    - **Validates: Requirements 5.5, 6.4**
  
  - [ ]* 10.6 Write property test for invalid groupe rejection
    - **Property 22: Invalid groupe_id rejection**
    - **Validates: Requirements 6.2**
  
  - [ ]* 10.7 Write property test for invalid class_id rejection
    - **Property 23: Invalid class_id rejection**
    - **Validates: Requirements 6.3**
  
  - [ ]* 10.8 Write property test for complete enrollment
    - **Property 24: Complete enrollment after class selection**
    - **Validates: Requirements 5.6, 6.5, 6.6**
  
  - [ ]* 10.9 Write integration test for complete enrollment endpoint
    - Test valid enrollment
    - Test all error cases
    - _Requirements: 6.1, 6.8_

- [x] 11. Checkpoint - Ensure all invitation endpoints tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Add database migration for google_id field if not exists
  - [x] 12.1 Check if `google_id` column exists in users table
    - If not, create migration to add it
    - Add unique index on google_id
    - _Requirements: 1.3, 9.6_
  
  - [ ]* 12.2 Write unit test for google_id uniqueness constraint
    - **Property 33: Google ID uniqueness**
    - **Validates: Requirements 9.6**


- [ ] 13. Add comprehensive error handling and validation
  - [x] 13.1 Update AuthController to handle all error cases
    - Add try-catch blocks for Google API exceptions
    - Return consistent error responses
    - Log all errors
    - _Requirements: 1.2, 3.2, 3.3_
  
  - [x] 13.2 Update GroupePartageController to handle all error cases
    - Add try-catch blocks for validation exceptions
    - Return consistent error responses
    - Log all errors
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [ ]* 13.3 Write property test for invalid JSON rejection
    - **Property 28: Invalid JSON rejection**
    - **Validates: Requirements 8.5**
  
  - [ ]* 13.4 Write property test for unauthenticated request rejection
    - **Property 29: Unauthenticated request rejection**
    - **Validates: Requirements 8.6**
  
  - [ ]* 13.5 Write property test for response format consistency
    - **Property 30: Response format consistency**
    - **Validates: Requirements 8.7**
  
  - [ ]* 13.6 Write property test for validation error format
    - **Property 31: Validation error format**
    - **Validates: Requirements 9.4**
  
  - [ ]* 13.7 Write property test for authorization checks
    - **Property 32: Authorization check for privileged operations**
    - **Validates: Requirements 9.5**

- [ ] 14. Add audit logging and notifications
  - [ ] 14.1 Ensure all critical operations log via AuditLogService
    - Google authentication (success and failure)
    - Invitation token generation
    - User joining groupe
    - Hierarchical enrollment
    - _Requirements: 10.4_
  
  - [x] 14.2 Ensure enrollment sends notifications via NotificationService
    - Notify user on successful enrollment
    - Notify groupe owner when user joins
    - _Requirements: 10.5_
  
  - [ ]* 14.3 Write property test for audit logging
    - **Property 34: Audit logging for critical operations**
    - **Validates: Requirements 10.4**
  
  - [ ]* 14.4 Write property test for notifications
    - **Property 35: Notification on enrollment**
    - **Validates: Requirements 10.5**

- [ ] 15. Update API documentation and frontend compatibility
  - [x] 15.1 Document all new endpoints in API documentation
    - POST /api/auth/google
    - POST /api/groupes-partage/{id}/invitation
    - POST /api/groupes-partage/join
    - POST /api/groupes-partage/{id}/complete-enrollment
    - Include request/response examples
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 15.2 Verify response formats match frontend expectations
    - Check auth.service.ts for Google auth response format
    - Check groupe.service.ts for invitation response formats
    - Ensure field names match (camelCase vs snake_case)
    - _Requirements: 10.7_

- [x] 16. Final checkpoint - Run all tests and verify integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- All enrollment operations must be wrapped in database transactions
- All critical operations must be logged via AuditLogService
- Response formats must maintain compatibility with existing React frontend
