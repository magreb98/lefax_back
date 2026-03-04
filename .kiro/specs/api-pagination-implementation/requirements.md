# Requirements Document - Implémentation de la Pagination API

## Introduction

Ce document définit les exigences pour l'implémentation d'une pagination cohérente et performante sur les endpoints de listing de l'API Laravel. L'objectif est d'améliorer les performances en évitant de charger tous les enregistrements d'un coup, tout en maintenant la compatibilité avec les scopes existants (MultitenantScope, SchoolAccessScope, DocumentAccessScope) et en adaptant le frontend React pour gérer la pagination.

## Glossary

- **API_Backend**: Le backend Laravel (lefax-php) qui expose les endpoints REST
- **Frontend**: L'application React TypeScript (lefax-edplatform) qui consomme l'API
- **Pagination_Response**: Structure de réponse standardisée contenant les données paginées et les métadonnées
- **Query_Builder**: Le constructeur de requêtes Eloquent utilisé pour filtrer et paginer les données
- **Scope**: Contrainte globale appliquée automatiquement aux requêtes Eloquent (MultitenantScope, SchoolAccessScope, DocumentAccessScope)
- **Service_Layer**: Couche de logique métier entre les controllers et les models
- **Resource**: Classe de transformation des données (Laravel Resources) pour formater les réponses API
- **Per_Page_Parameter**: Paramètre de requête définissant le nombre d'éléments par page
- **Page_Parameter**: Paramètre de requête définissant le numéro de page actuelle
- **Meta_Object**: Objet contenant les métadonnées de pagination (current_page, last_page, per_page, total)

## Requirements

### Requirement 1: Pagination standardisée sur les endpoints de listing

**User Story:** En tant que développeur backend, je veux implémenter une pagination standardisée sur tous les endpoints de listing, afin d'améliorer les performances et de réduire la charge serveur.

#### Acceptance Criteria

1. THE API_Backend SHALL retourner une Pagination_Response standardisée pour tous les endpoints de listing
2. THE Pagination_Response SHALL contenir une clé "data" avec les éléments paginés transformés via Resource
3. THE Pagination_Response SHALL contenir une clé "meta" avec les métadonnées de pagination (current_page, last_page, per_page, total)
4. WHEN un endpoint de listing est appelé sans paramètres de pagination, THE API_Backend SHALL utiliser une valeur par défaut de 15 éléments par page
5. THE API_Backend SHALL limiter le nombre maximum d'éléments par page à 100 pour éviter les surcharges

### Requirement 2: Support des paramètres de pagination

**User Story:** En tant que développeur frontend, je veux pouvoir contrôler la pagination via des paramètres de requête, afin d'adapter l'affichage aux besoins de l'interface utilisateur.

#### Acceptance Criteria

1. WHEN le paramètre "per_page" est fourni, THE Query_Builder SHALL utiliser cette valeur pour limiter le nombre d'éléments par page
2. WHEN le paramètre "page" est fourni, THE Query_Builder SHALL retourner la page correspondante
3. IF le paramètre "per_page" dépasse 100, THEN THE API_Backend SHALL limiter la valeur à 100
4. THE API_Backend SHALL accepter les paramètres "per_page" et "page" comme entiers positifs
5. IF un paramètre de pagination est invalide, THEN THE API_Backend SHALL utiliser la valeur par défaut

### Requirement 3: Pagination sur l'endpoint Documents

**User Story:** En tant qu'utilisateur, je veux voir les documents paginés, afin de charger rapidement la liste sans surcharger mon navigateur.

#### Acceptance Criteria

1. THE DocumentController SHALL implémenter la pagination sur la méthode index()
2. THE DocumentService SHALL retourner un objet paginé depuis getUserAccessibleDocuments()
3. THE Pagination_Response SHALL maintenir la compatibilité avec les filtres existants (categorie_id, matiere_id, groupe_id, search)
4. THE Query_Builder SHALL appliquer les Scope existants (MultitenantScope, DocumentAccessScope) avant la pagination
5. THE Pagination_Response SHALL utiliser DocumentResource pour transformer les données

### Requirement 4: Pagination sur l'endpoint Groupes de Partage

**User Story:** En tant qu'utilisateur, je veux voir les groupes de partage paginés, afin de naviguer efficacement dans une longue liste de groupes.

#### Acceptance Criteria

1. THE GroupePartageController SHALL implémenter la pagination sur la méthode index()
2. THE Query_Builder SHALL appliquer les filtres de visibilité (filter_visible) avant la pagination
3. THE Pagination_Response SHALL maintenir la compatibilité avec les filtres existants (type, is_public, search)
4. THE Query_Builder SHALL appliquer les Scope existants (MultitenantScope, SchoolAccessScope) avant la pagination
5. THE Pagination_Response SHALL utiliser GroupePartageResource pour transformer les données

### Requirement 5: Pagination sur l'endpoint Classes

**User Story:** En tant qu'administrateur, je veux voir les classes paginées, afin de gérer efficacement un grand nombre de classes.

#### Acceptance Criteria

1. THE ClasseController SHALL implémenter la pagination sur la méthode index()
2. THE ClasseService SHALL retourner un objet paginé depuis listClasses()
3. THE Pagination_Response SHALL maintenir la compatibilité avec les filtres existants (filiere_id, ecole_id, search)
4. THE Query_Builder SHALL appliquer les Scope existants (MultitenantScope, SchoolAccessScope) avant la pagination
5. THE Pagination_Response SHALL utiliser ClasseResource pour transformer les données

### Requirement 6: Pagination sur l'endpoint Filières

**User Story:** En tant qu'administrateur, je veux voir les filières paginées, afin de naviguer facilement dans la liste des filières.

#### Acceptance Criteria

1. THE FiliereController SHALL implémenter la pagination sur la méthode index()
2. THE FiliereService SHALL retourner un objet paginé depuis listFilieres()
3. THE Pagination_Response SHALL maintenir la compatibilité avec les filtres existants (ecole_id, search)
4. THE Query_Builder SHALL appliquer les Scope existants (MultitenantScope, SchoolAccessScope) avant la pagination
5. THE Pagination_Response SHALL utiliser FiliereResource pour transformer les données

### Requirement 7: Pagination sur l'endpoint Matières

**User Story:** En tant qu'enseignant, je veux voir les matières paginées, afin de trouver rapidement une matière spécifique.

#### Acceptance Criteria

1. THE MatiereController SHALL implémenter la pagination sur la méthode index()
2. THE MatiereService SHALL retourner un objet paginé depuis listMatieres()
3. THE Pagination_Response SHALL maintenir la compatibilité avec les filtres existants (classe_id, search)
4. THE Query_Builder SHALL appliquer les Scope existants (MultitenantScope, SchoolAccessScope) avant la pagination
5. THE Pagination_Response SHALL utiliser MatiereResource pour transformer les données

### Requirement 8: Adaptation du Frontend React

**User Story:** En tant que développeur frontend, je veux adapter les services et composants React pour gérer la pagination, afin d'afficher correctement les données paginées.

#### Acceptance Criteria

1. THE Frontend SHALL envoyer les paramètres "page" et "per_page" dans les requêtes API
2. THE Frontend SHALL extraire les métadonnées de pagination depuis l'objet "meta" de la réponse
3. THE Frontend SHALL afficher les contrôles de pagination (boutons précédent/suivant, numéro de page)
4. WHEN l'utilisateur change de page, THE Frontend SHALL effectuer une nouvelle requête API avec le paramètre "page" mis à jour
5. THE Frontend SHALL gérer l'état de chargement pendant les requêtes de pagination

### Requirement 9: Compatibilité avec les Scopes existants

**User Story:** En tant que développeur backend, je veux que la pagination respecte les scopes de sécurité existants, afin de maintenir l'isolation des données multi-tenant.

#### Acceptance Criteria

1. THE Query_Builder SHALL appliquer MultitenantScope avant la pagination sur tous les models concernés
2. THE Query_Builder SHALL appliquer SchoolAccessScope avant la pagination sur les models hiérarchiques (Classe, Filiere, Matiere, GroupePartage)
3. THE Query_Builder SHALL appliquer DocumentAccessScope avant la pagination sur les documents
4. THE Pagination_Response SHALL compter uniquement les enregistrements accessibles après application des Scope
5. THE API_Backend SHALL garantir qu'aucun enregistrement non autorisé n'apparaît dans les résultats paginés

### Requirement 10: Performance et optimisation

**User Story:** En tant qu'administrateur système, je veux que la pagination soit performante, afin de garantir des temps de réponse rapides même avec de grandes quantités de données.

#### Acceptance Criteria

1. THE Query_Builder SHALL utiliser la méthode paginate() d'Eloquent pour optimiser les requêtes SQL
2. THE Query_Builder SHALL charger les relations nécessaires via eager loading (with()) avant la pagination
3. THE API_Backend SHALL éviter les requêtes N+1 en chargeant toutes les relations dans le controller ou le service
4. THE Query_Builder SHALL utiliser des index de base de données sur les colonnes de tri et de filtrage
5. WHEN le nombre total d'enregistrements dépasse 1000, THE API_Backend SHALL retourner les résultats en moins de 500ms

### Requirement 11: Gestion des erreurs de pagination

**User Story:** En tant qu'utilisateur, je veux recevoir des messages d'erreur clairs en cas de problème de pagination, afin de comprendre ce qui ne fonctionne pas.

#### Acceptance Criteria

1. IF le paramètre "page" demande une page inexistante, THEN THE API_Backend SHALL retourner une page vide avec les métadonnées correctes
2. IF le paramètre "per_page" est négatif ou zéro, THEN THE API_Backend SHALL utiliser la valeur par défaut de 15
3. IF le paramètre "per_page" n'est pas un entier, THEN THE API_Backend SHALL utiliser la valeur par défaut de 15
4. THE API_Backend SHALL retourner un code HTTP 200 même si la page demandée est vide
5. THE Meta_Object SHALL toujours contenir des valeurs cohérentes (current_page, last_page, per_page, total)

### Requirement 12: Tests de pagination

**User Story:** En tant que développeur, je veux des tests automatisés pour la pagination, afin de garantir la fiabilité de l'implémentation.

#### Acceptance Criteria

1. THE API_Backend SHALL inclure des tests unitaires pour chaque service implémentant la pagination
2. THE API_Backend SHALL inclure des tests d'intégration pour chaque endpoint paginé
3. THE tests SHALL vérifier que les métadonnées de pagination sont correctes (current_page, last_page, per_page, total)
4. THE tests SHALL vérifier que les Scope sont appliqués correctement avant la pagination
5. THE tests SHALL vérifier que les filtres fonctionnent correctement avec la pagination
