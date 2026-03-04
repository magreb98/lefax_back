# Plan d'implémentation : Pagination API

## Vue d'ensemble

Implémentation d'une pagination cohérente et performante sur 5 endpoints de listing de l'API Laravel, avec adaptation du frontend React. L'implémentation suit un plan de migration progressif sur 3 semaines, en maintenant la compatibilité avec les scopes de sécurité existants (MultitenantScope, SchoolAccessScope, DocumentAccessScope).

## Tâches

- [ ] 1. Implémenter la pagination sur DocumentController
  - [x] 1.1 Modifier DocumentController::index() pour retourner la structure paginée standardisée
    - Extraire et valider les paramètres page et per_page (max 100)
    - Appeler DocumentService::getUserAccessibleDocuments() avec perPage
    - Retourner la réponse avec clés "data" (DocumentResource::collection) et "meta"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.5_
  
  - [ ] 1.2 Vérifier l'eager loading dans DocumentService::getUserAccessibleDocuments()
    - S'assurer que les relations (categorie, addedBy, matiere, groupesPartage) sont chargées via with()
    - Vérifier que la méthode retourne bien un LengthAwarePaginator
    - _Requirements: 10.2, 10.3_
  
  - [ ]* 1.3 Créer les tests unitaires pour DocumentService
    - Test de pagination avec valeurs par défaut (15 éléments)
    - Test de pagination avec per_page personnalisé
    - Test de pagination avec filtres (categorie_id, matiere_id, groupe_id, search)
    - Test d'application des scopes (MultitenantScope, DocumentAccessScope)
    - Test d'eager loading (vérifier nombre de requêtes SQL)
    - _Requirements: 12.1, 12.4_
  
  - [ ]* 1.4 Créer les tests d'intégration pour DocumentController
    - Test GET /api/documents avec pagination (structure data + meta)
    - Test de limitation per_page à 100
    - Test de page inexistante (retourne page vide avec HTTP 200)
    - Test de paramètres invalides (utilise valeurs par défaut)
    - Test de compatibilité avec filtres existants
    - Test d'autorisation avec différents rôles (SuperAdmin, Admin, Enseignant, Étudiant)
    - _Requirements: 12.2, 12.3, 12.5_

- [ ] 2. Implémenter la pagination sur GroupePartageController
  - [ ] 2.1 Créer GroupePartageService avec méthode listGroupes()
    - Créer le fichier app/Services/GroupePartageService.php
    - Implémenter listGroupes(array $filters, int $perPage = 15): LengthAwarePaginator
    - Appliquer eager loading des relations (owner, users, documents, ecole, filiere, classe, matiere)
    - Appliquer les filtres (type, is_public, search, filter_visible)
    - Les scopes MultitenantScope et SchoolAccessScope sont appliqués automatiquement
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.2, 10.3_
  
  - [ ] 2.2 Modifier GroupePartageController::index() pour utiliser le service
    - Injecter GroupePartageService dans le constructeur
    - Extraire et valider les paramètres page et per_page (max 100)
    - Extraire les filtres (type, is_public, search, filter_visible)
    - Appeler GroupePartageService::listGroupes()
    - Retourner la réponse avec clés "data" (GroupePartageResource::collection) et "meta"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 4.1, 4.5_
  
  - [ ]* 2.3 Créer les tests unitaires pour GroupePartageService
    - Test de pagination avec valeurs par défaut
    - Test de pagination avec filtres (type, is_public, search, filter_visible)
    - Test d'application des scopes
    - Test d'eager loading
    - _Requirements: 12.1, 12.4_
  
  - [ ]* 2.4 Créer les tests d'intégration pour GroupePartageController
    - Test GET /api/groupe-partages avec pagination
    - Test de la structure de réponse (data + meta)
    - Test de limitation per_page à 100
    - Test de compatibilité avec filtres existants
    - Test d'autorisation avec différents rôles
    - Test de filter_visible pour étudiants
    - _Requirements: 12.2, 12.3, 12.5_

- [ ] 3. Checkpoint - Vérifier les endpoints Documents et GroupePartage
  - Exécuter tous les tests unitaires et d'intégration
  - Vérifier manuellement les endpoints avec Postman/Insomnia
  - S'assurer que les scopes de sécurité fonctionnent correctement
  - Demander à l'utilisateur si des questions ou problèmes surviennent

- [ ] 4. Vérifier et ajuster ClasseController et ClasseService
  - [ ] 4.1 Vérifier la structure de réponse de ClasseController::index()
    - S'assurer que la réponse contient les clés "data" et "meta"
    - Vérifier que ClasseResource::collection est utilisé pour transformer les données
    - Ajuster si nécessaire pour correspondre à la structure standardisée
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.5_
  
  - [ ] 4.2 Vérifier l'eager loading dans ClasseService::listClasses()
    - S'assurer que les relations (filiere, groupePartage, etudiants, matieres) sont chargées via with()
    - Vérifier que la méthode retourne bien un LengthAwarePaginator
    - _Requirements: 10.2, 10.3_
  
  - [ ]* 4.3 Compléter les tests unitaires pour ClasseService
    - Test de pagination avec valeurs par défaut
    - Test de pagination avec filtres (filiere_id, ecole_id, search)
    - Test d'application des scopes (MultitenantScope, SchoolAccessScope)
    - Test d'eager loading
    - _Requirements: 12.1, 12.4_
  
  - [ ]* 4.4 Compléter les tests d'intégration pour ClasseController
    - Test GET /api/v1/classes avec pagination
    - Test de la structure de réponse (data + meta)
    - Test de limitation per_page à 100
    - Test de compatibilité avec filtres existants
    - Test d'autorisation avec différents rôles
    - _Requirements: 12.2, 12.3, 12.5_

- [ ] 5. Vérifier et ajuster MatiereController et MatiereService
  - [ ] 5.1 Vérifier la structure de réponse de MatiereController::index()
    - S'assurer que la réponse contient les clés "data" et "meta"
    - Vérifier que MatiereResource::collection est utilisé pour transformer les données
    - Ajuster si nécessaire pour correspondre à la structure standardisée
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.5_
  
  - [ ] 5.2 Vérifier l'eager loading dans MatiereService::listMatieres()
    - S'assurer que les relations (classe, groupePartage, enseignementAssignments) sont chargées via with()
    - Vérifier que la méthode retourne bien un LengthAwarePaginator
    - _Requirements: 10.2, 10.3_
  
  - [ ]* 5.3 Compléter les tests unitaires pour MatiereService
    - Test de pagination avec valeurs par défaut
    - Test de pagination avec filtres (classe_id, search)
    - Test d'application des scopes (MultitenantScope, SchoolAccessScope)
    - Test d'eager loading
    - _Requirements: 12.1, 12.4_
  
  - [ ]* 5.4 Compléter les tests d'intégration pour MatiereController
    - Test GET /api/v1/matieres avec pagination
    - Test de la structure de réponse (data + meta)
    - Test de limitation per_page à 100
    - Test de compatibilité avec filtres existants
    - Test d'autorisation avec différents rôles
    - _Requirements: 12.2, 12.3, 12.5_

- [ ] 6. Implémenter FiliereController et FiliereService
  - [ ] 6.1 Créer FiliereService avec méthode listFilieres()
    - Créer le fichier app/Services/FiliereService.php
    - Implémenter listFilieres(array $filters, int $perPage = 15): LengthAwarePaginator
    - Appliquer eager loading des relations (ecole, groupePartage, classes)
    - Appliquer les filtres (ecole_id, search)
    - Les scopes MultitenantScope et SchoolAccessScope sont appliqués automatiquement
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.2, 10.3_
  
  - [ ] 6.2 Créer FiliereController avec méthode index()
    - Créer le fichier app/Http/Controllers/FiliereController.php
    - Injecter FiliereService dans le constructeur
    - Implémenter index(Request $request): JsonResponse
    - Extraire et valider les paramètres page et per_page (max 100)
    - Extraire les filtres (ecole_id, search)
    - Appeler FiliereService::listFilieres()
    - Retourner la réponse avec clés "data" (FiliereResource::collection) et "meta"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 6.1, 6.5_
  
  - [ ] 6.3 Ajouter la route API pour FiliereController
    - Ajouter la route GET /api/v1/filieres dans routes/api.php
    - Appliquer les middlewares auth:sanctum et throttle
    - _Requirements: 6.1_
  
  - [ ]* 6.4 Créer les tests unitaires pour FiliereService
    - Test de pagination avec valeurs par défaut
    - Test de pagination avec filtres (ecole_id, search)
    - Test d'application des scopes (MultitenantScope, SchoolAccessScope)
    - Test d'eager loading
    - _Requirements: 12.1, 12.4_
  
  - [ ]* 6.5 Créer les tests d'intégration pour FiliereController
    - Créer tests/Feature/FiliereControllerTest.php
    - Test GET /api/v1/filieres avec pagination
    - Test de la structure de réponse (data + meta)
    - Test de limitation per_page à 100
    - Test de compatibilité avec filtres existants
    - Test d'autorisation avec différents rôles
    - _Requirements: 12.2, 12.3, 12.5_

- [ ] 7. Checkpoint - Vérifier tous les endpoints backend
  - Exécuter tous les tests unitaires et d'intégration
  - Vérifier manuellement les 5 endpoints avec Postman/Insomnia
  - Vérifier les performances (temps de réponse < 200ms)
  - Vérifier l'absence de requêtes N+1 avec Laravel Telescope
  - Demander à l'utilisateur si des questions ou problèmes surviennent

- [ ] 8. Créer les services et hooks frontend pour la pagination
  - [ ] 8.1 Créer le service API générique paginatedApi.service.ts
    - Créer lefax-edplatform/src/services/paginatedApi.service.ts
    - Définir les interfaces PaginationParams, PaginationMeta, PaginatedResponse<T>
    - Implémenter la fonction fetchPaginated<T>(endpoint, params)
    - _Requirements: 8.1, 8.2_
  
  - [ ] 8.2 Créer le hook React usePagination
    - Créer lefax-edplatform/src/hooks/usePagination.ts
    - Gérer l'état de pagination (page, perPage, meta, loading)
    - Implémenter les fonctions nextPage, prevPage, goToPage, setPerPage
    - Retourner les paramètres formatés pour l'API
    - _Requirements: 8.1, 8.4, 8.5_
  
  - [ ] 8.3 Créer le composant Pagination réutilisable
    - Créer lefax-edplatform/src/components/Pagination.tsx
    - Afficher les contrôles de pagination (boutons Précédent/Suivant)
    - Afficher les informations de pagination (Page X sur Y, total éléments)
    - Gérer l'état de chargement (désactiver les boutons)
    - Gérer les cas limites (première/dernière page)
    - _Requirements: 8.3, 8.4, 8.5_
  
  - [ ]* 8.4 Créer les tests Jest pour paginatedApi.service.ts
    - Test d'envoi des paramètres page et per_page
    - Test d'extraction des métadonnées depuis meta
    - Test de gestion des erreurs réseau
    - _Requirements: 12.2_
  
  - [ ]* 8.5 Créer les tests React Testing Library pour Pagination.tsx
    - Test d'affichage des contrôles de pagination
    - Test de changement de page (clic sur bouton)
    - Test d'affichage de l'état de chargement
    - Test de désactivation des boutons (première/dernière page)
    - _Requirements: 12.2_

- [ ] 9. Adapter les pages frontend existantes pour utiliser la pagination
  - [ ] 9.1 Adapter la page Documents.tsx
    - Importer et utiliser usePagination hook
    - Importer et utiliser fetchPaginated depuis paginatedApi.service
    - Remplacer l'appel API existant par fetchPaginated('/api/documents', params)
    - Ajouter le composant Pagination en bas de la liste
    - Gérer l'état de chargement pendant les requêtes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 9.2 Adapter la page Matieres.tsx
    - Importer et utiliser usePagination hook
    - Importer et utiliser fetchPaginated depuis paginatedApi.service
    - Remplacer l'appel API existant par fetchPaginated('/api/v1/matieres', params)
    - Ajouter le composant Pagination en bas de la liste
    - Gérer l'état de chargement pendant les requêtes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 9.3 Créer ou adapter la page Classes.tsx
    - Créer lefax-edplatform/src/pages/Classes.tsx si elle n'existe pas
    - Importer et utiliser usePagination hook
    - Importer et utiliser fetchPaginated depuis paginatedApi.service
    - Appeler fetchPaginated('/api/v1/classes', params)
    - Ajouter le composant Pagination en bas de la liste
    - Gérer l'état de chargement pendant les requêtes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 9.4 Créer la page Filieres.tsx
    - Créer lefax-edplatform/src/pages/Filieres.tsx
    - Importer et utiliser usePagination hook
    - Importer et utiliser fetchPaginated depuis paginatedApi.service
    - Appeler fetchPaginated('/api/v1/filieres', params)
    - Ajouter le composant Pagination en bas de la liste
    - Gérer l'état de chargement pendant les requêtes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 9.5 Créer ou adapter la page GroupesPartage.tsx
    - Créer lefax-edplatform/src/pages/GroupesPartage.tsx si elle n'existe pas
    - Importer et utiliser usePagination hook
    - Importer et utiliser fetchPaginated depuis paginatedApi.service
    - Appeler fetchPaginated('/api/groupe-partages', params)
    - Ajouter le composant Pagination en bas de la liste
    - Gérer l'état de chargement pendant les requêtes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Checkpoint - Vérifier l'intégration frontend
  - Tester manuellement chaque page avec la pagination
  - Vérifier que les requêtes API contiennent les bons paramètres
  - Vérifier que les contrôles de pagination fonctionnent correctement
  - Vérifier l'affichage de l'état de chargement
  - Demander à l'utilisateur si des questions ou problèmes surviennent

- [ ] 11. Créer les tests basés sur les propriétés (Property-Based Testing)
  - [ ]* 11.1 Installer Pest Property Testing
    - Exécuter composer require --dev pestphp/pest-plugin-faker
    - Vérifier que Pest est correctement configuré
    - _Requirements: 12.1_
  
  - [ ]* 11.2 Créer tests/Properties/PaginationPropertiesTest.php
    - Créer le fichier avec les 11 tests de propriétés
    - **Property 1**: Structure de réponse paginée standardisée (100 itérations)
    - **Property 2**: Limitation du nombre d'éléments par page (100 itérations)
    - **Property 3**: Respect des paramètres de pagination (100 itérations)
    - **Property 4**: Validation des paramètres de pagination (100 itérations)
    - **Property 5**: Compatibilité avec les filtres existants (100 itérations)
    - **Property 6**: Application des scopes de sécurité avant pagination (100 itérations)
    - **Property 8**: Absence de requêtes N+1 (100 itérations)
    - **Property 9**: Gestion des pages inexistantes (100 itérations)
    - **Property 10**: Cohérence des métadonnées (100 itérations)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ]* 11.3 Exécuter les tests de propriétés et corriger les bugs
    - Exécuter php artisan test --filter=PaginationPropertiesTest
    - Analyser les échecs et identifier les bugs
    - Corriger les bugs découverts
    - Ré-exécuter jusqu'à ce que tous les tests passent
    - _Requirements: 12.1_

- [ ] 12. Créer les tests de performance
  - [ ]* 12.1 Créer tests/Performance/PaginationPerformanceTest.php
    - Créer le fichier avec les tests de performance
    - Test de temps de réponse avec plus de 1000 enregistrements (< 500ms)
    - Créer un jeu de données de test avec 1500+ enregistrements
    - Exécuter 10 itérations pour chaque endpoint
    - _Requirements: 10.5_
  
  - [ ]* 12.2 Optimiser les performances si nécessaire
    - Analyser les résultats des tests de performance
    - Ajouter des index de base de données si nécessaire
    - Optimiser les requêtes SQL (select spécifique, eager loading)
    - Envisager le cache pour les métadonnées si pertinent
    - Ré-exécuter les tests jusqu'à atteindre l'objectif (< 500ms)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 13. Finalisation et documentation
  - [ ] 13.1 Vérifier la couverture de code
    - Exécuter php artisan test --coverage
    - S'assurer que la couverture est > 90% pour les services et controllers
    - Ajouter des tests supplémentaires si nécessaire
    - _Requirements: 12.1, 12.2_
  
  - [ ] 13.2 Mettre à jour la documentation API
    - Documenter la structure de réponse paginée standardisée
    - Documenter les paramètres page et per_page
    - Documenter les valeurs par défaut et limites
    - Ajouter des exemples de requêtes et réponses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_
  
  - [ ] 13.3 Revue de code finale
    - Vérifier que tous les endpoints suivent la structure standardisée
    - Vérifier que tous les scopes de sécurité sont appliqués
    - Vérifier que l'eager loading est utilisé partout
    - Vérifier la cohérence du code (style, conventions)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.2, 10.3_

- [ ] 14. Checkpoint final - Préparation au déploiement
  - Exécuter tous les tests (unitaires, intégration, propriétés, performance)
  - Vérifier manuellement tous les endpoints backend et pages frontend
  - Vérifier les métriques de performance (temps de réponse, requêtes SQL, mémoire)
  - Préparer le plan de déploiement progressif (staging puis production)
  - Préparer le plan de rollback en cas de problème
  - Demander à l'utilisateur la validation finale avant déploiement

## Notes

- Les tâches marquées avec `*` sont optionnelles et peuvent être sautées pour un MVP plus rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les checkpoints permettent une validation incrémentale avec l'utilisateur
- Les tests de propriétés valident les propriétés universelles de correction
- Les tests unitaires et d'intégration valident des exemples spécifiques et cas limites
- L'implémentation suit le plan de migration progressif : Backend (Semaine 1) → Filiere (Semaine 2, Jour 1-2) → Frontend (Semaine 2, Jour 3-5) → Tests avancés (Semaine 3)
