# Requirements Document - Système d'Affichage des Groupes dans le Dashboard Étudiant

## Introduction

Le système d'affichage des groupes dans le dashboard étudiant permet aux utilisateurs de gérer quels groupes (espaces de partage) apparaissent dans leur interface. Ce système repose sur une architecture hiérarchique (école, filière, classe, matière) et des groupes personnalisés, avec un mécanisme de préférences utilisateur pour contrôler la visibilité.

L'objectif de ce spec est de documenter le système actuel, identifier ses forces et faiblesses, et proposer des améliorations en termes de performance, expérience utilisateur, et testabilité.

## Glossary

- **System**: Le système d'affichage et de gestion des préférences de groupes
- **User**: Un utilisateur authentifié de la plateforme Lefax (étudiant, enseignant, administrateur)
- **Student**: Un utilisateur avec le rôle "etudiant"
- **Group**: Un espace de partage (GroupePartage) représentant une entité scolaire ou personnalisée
- **Hierarchical_Group**: Un groupe lié à la structure scolaire (école, filière, classe, matière)
- **Custom_Group**: Un groupe créé manuellement par un utilisateur
- **Preference**: Configuration utilisateur stockée dans UserSearchPreference
- **Visible_Group**: Un groupe marqué comme actif dans les préférences utilisateur
- **Default_Group**: Le groupe de classe d'un étudiant, activé automatiquement
- **Backend**: L'API Laravel exposant les endpoints de gestion
- **Frontend**: L'application React consommant l'API
- **Dashboard**: L'interface principale affichant les groupes actifs de l'utilisateur

## Requirements

### Requirement 1: Récupération des Groupes Disponibles

**User Story:** En tant qu'utilisateur, je veux voir tous les groupes auxquels j'ai accès organisés par hiérarchie, afin de comprendre ma structure scolaire et mes espaces de partage.

#### Acceptance Criteria

1. WHEN a User requests available groups, THE System SHALL return all groups from the User's school organized by hierarchical structure
2. WHEN a User belongs to an Ecole, THE System SHALL include the school group in the response
3. WHEN a User belongs to Filieres, THE System SHALL organize groups by filiere with nested classes and matieres
4. WHEN a User is a member of Custom_Groups, THE System SHALL include these groups in a separate section
5. WHEN a Student has a class assignment, THE System SHALL mark the class group as default
6. THE System SHALL return both a flat list and an organized hierarchy of groups
7. WHEN a User is a member of Hierarchical_Groups through direct membership (pivot), THE System SHALL include these groups even if not in their school hierarchy

### Requirement 2: Gestion des Préférences Utilisateur

**User Story:** En tant qu'utilisateur, je veux activer ou désactiver des groupes dans mon dashboard, afin de personnaliser mon espace de travail et me concentrer sur les groupes pertinents.

#### Acceptance Criteria

1. WHEN a User saves preferences, THE System SHALL store the list of preferred group IDs in UserSearchPreference
2. WHEN a Student accesses the system for the first time, THE System SHALL automatically activate their Default_Group
3. WHEN a User toggles a group visibility, THE System SHALL update the preference immediately
4. WHEN a User resets preferences, THE System SHALL restore default preferences based on their role
5. THE System SHALL persist preferences across sessions
6. WHEN preferences are updated, THE System SHALL reflect changes across all pages without requiring page reload

### Requirement 3: Filtrage des Groupes Visibles

**User Story:** En tant qu'utilisateur, je veux que seuls mes groupes activés apparaissent dans mon dashboard, afin de réduire le bruit visuel et améliorer ma productivité.

#### Acceptance Criteria

1. WHEN a User views their dashboard, THE System SHALL display only Visible_Groups
2. WHEN a User has no preferences saved, THE System SHALL use default preferences
3. WHEN filtering groups, THE System SHALL match group IDs against the preferred_groupe_ids list
4. THE System SHALL apply the visibility filter consistently across all pages (Dashboard, Documents, FileExplorer)
5. WHEN a group is not visible, THE System SHALL exclude it from all group listings and selections

### Requirement 4: Interface de Gestion des Préférences

**User Story:** En tant qu'utilisateur, je veux une interface intuitive pour gérer mes groupes visibles, afin de facilement activer ou désactiver des espaces sans confusion.

#### Acceptance Criteria

1. WHEN a User opens the preferences manager, THE System SHALL display all available groups with their current visibility status
2. WHEN a User views a group card, THE System SHALL show the group name, type, and a toggle switch
3. WHEN a User clicks a toggle switch, THE System SHALL immediately update the group visibility
4. WHEN a User clicks reset, THE System SHALL restore default preferences and update the UI
5. THE System SHALL provide visual feedback (loading states, success messages) for all actions
6. WHEN displaying groups, THE System SHALL organize them by sections (school, filieres, custom groups)

### Requirement 5: Performance et Optimisation

**User Story:** En tant qu'utilisateur, je veux que le système charge rapidement mes groupes et préférences, afin d'avoir une expérience fluide sans délais perceptibles.

#### Acceptance Criteria

1. WHEN a User loads the dashboard, THE System SHALL cache available groups to avoid redundant API calls
2. WHEN preferences are updated, THE System SHALL invalidate relevant caches
3. THE System SHALL use optimistic updates for toggle actions to provide immediate feedback
4. WHEN loading groups, THE System SHALL minimize database queries using eager loading
5. THE System SHALL respond to preference requests within 200ms under normal load

### Requirement 6: Compatibilité et Cohérence des Données

**User Story:** En tant que développeur, je veux que le système gère les variations de format de données entre backend et frontend, afin d'assurer la compatibilité et éviter les bugs d'affichage.

#### Acceptance Criteria

1. WHEN the Backend returns group data, THE System SHALL use consistent property names (name vs groupeName)
2. WHEN the Frontend receives group data, THE System SHALL handle both "name" and "groupeName" properties
3. THE System SHALL maintain backward compatibility with existing API consumers
4. WHEN displaying group information, THE System SHALL prioritize "name" over "groupeName" if both exist
5. THE System SHALL validate group data structure before rendering

### Requirement 7: Gestion des Erreurs et États de Chargement

**User Story:** En tant qu'utilisateur, je veux être informé clairement en cas d'erreur ou pendant le chargement, afin de comprendre l'état du système et savoir si une action est requise.

#### Acceptance Criteria

1. WHEN an API request fails, THE System SHALL display a user-friendly error message
2. WHEN data is loading, THE System SHALL show loading indicators
3. WHEN a network error occurs, THE System SHALL provide retry options
4. WHEN preferences fail to save, THE System SHALL revert to the previous state and notify the user
5. THE System SHALL log errors for debugging without exposing sensitive information to users

### Requirement 8: Intégration Multi-Pages

**User Story:** En tant qu'utilisateur, je veux que mes préférences de groupes visibles s'appliquent partout dans l'application, afin d'avoir une expérience cohérente sur toutes les pages.

#### Acceptance Criteria

1. WHEN a User navigates to StudentDashboard, THE System SHALL display only Visible_Groups
2. WHEN a User navigates to Documents page, THE System SHALL filter upload options by Visible_Groups
3. WHEN a User navigates to FileExplorer, THE System SHALL show only Visible_Groups in navigation
4. WHEN a User navigates to DocumentDetail, THE System SHALL filter sharing options by Visible_Groups
5. THE System SHALL use the same data source (hooks) across all pages for consistency

### Requirement 9: Sécurité et Permissions

**User Story:** En tant qu'administrateur système, je veux que les utilisateurs ne puissent voir et activer que les groupes auxquels ils ont légitimement accès, afin de maintenir la sécurité et la confidentialité des données.

#### Acceptance Criteria

1. WHEN a User requests available groups, THE System SHALL return only groups where the User is a member or has access through school hierarchy
2. WHEN a User attempts to activate a group, THE System SHALL verify the User has access to that group
3. THE System SHALL prevent users from accessing documents in groups they haven't activated
4. WHEN filtering documents by groups, THE System SHALL enforce access control at the backend level
5. THE System SHALL not expose group IDs or information for groups the User cannot access

### Requirement 10: Extensibilité et Maintenance

**User Story:** En tant que développeur, je veux que le système soit facilement extensible et maintenable, afin de pouvoir ajouter de nouvelles fonctionnalités sans refactoring majeur.

#### Acceptance Criteria

1. THE System SHALL separate concerns between data fetching (hooks), state management, and UI components
2. WHEN adding new group types, THE System SHALL support them without modifying core logic
3. THE System SHALL use TypeScript interfaces for type safety
4. WHEN modifying preference structure, THE System SHALL maintain backward compatibility
5. THE System SHALL provide clear documentation for API endpoints and data structures
