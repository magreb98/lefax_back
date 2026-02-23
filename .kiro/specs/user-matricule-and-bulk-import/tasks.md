# Plan d'Implémentation : user-matricule-and-bulk-import

## Vue d'ensemble

Ce plan implémente deux fonctionnalités pour la plateforme Lefax :
1. Ajout d'un champ "matricule" unique par école pour les étudiants et enseignants
2. Système d'import en masse d'utilisateurs via fichiers Excel/CSV avec validation et rapport détaillé

L'implémentation suit l'architecture en couches existante (Controllers → Services → Repositories) et utilise TypeScript avec TypeORM.

## Tâches

- [x] 1. Migration de base de données et modification de l'entité User
  - Créer la migration TypeORM pour ajouter le champ matricule
  - Ajouter l'index unique composite (matricule, school_id)
  - Modifier l'entité User pour inclure le champ matricule
  - Tester la migration (up et down)
  - _Exigences : 10.1, 10.2, 10.3, 10.4, 10.5, 1.1_

- [ ]* 1.1 Écrire des tests unitaires pour la migration
  - Tester l'exécution de la migration
  - Tester le rollback de la migration
  - Vérifier la préservation des données existantes
  - _Exigences : 10.4, 10.5_

- [ ] 2. Créer les DTOs pour l'import
  - [x] 2.1 Créer BaseImportRowDto avec validation du matricule
    - Définir les champs communs (matricule, firstName, lastName, email, phoneNumber)
    - Ajouter les décorateurs de validation (IsNotEmpty, IsEmail, Matches pour matricule)
    - _Exigences : 4.1, 4.2, 1.3_

  - [x] 2.2 Créer StudentImportRowDto et TeacherImportRowDto
    - Étendre BaseImportRowDto
    - Ajouter classeId pour StudentImportRowDto
    - Ajouter matiereIds pour TeacherImportRowDto
    - _Exigences : 3.3, 3.4_

  - [x] 2.3 Créer ImportRequestDto et interfaces de rapport
    - Définir ImportRequestDto avec userType et sendEmail
    - Définir les interfaces ImportError et ImportReport
    - _Exigences : 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 2.4 Écrire un test de propriété pour la validation du matricule
    - **Propriété 3 : Validation alphanumérique du matricule**
    - **Valide : Exigences 1.3, 2.3, 2.4**

- [ ] 3. Implémenter FileParserService
  - [x] 3.1 Créer la classe FileParserService
    - Implémenter parseFile() pour router vers parseExcel ou parseCsv
    - Implémenter parseExcel() avec la bibliothèque xlsx
    - Implémenter parseCsv() avec csv-parser
    - _Exigences : 3.1, 3.2, 3.5_

  - [x] 3.2 Implémenter validateFileStructure()
    - Vérifier la présence des colonnes requises selon le type d'utilisateur
    - Lancer une erreur descriptive si colonnes manquantes
    - _Exigences : 3.3, 3.4, 3.7_

  - [ ]* 3.3 Écrire des tests unitaires pour FileParserService
    - Tester le parsing de fichiers .xlsx valides
    - Tester le parsing de fichiers .csv valides
    - Tester le rejet de fichiers avec colonnes manquantes
    - Tester le rejet de types de fichiers non supportés
    - _Exigences : 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ]* 3.4 Écrire des tests de propriété pour la validation de structure
    - **Propriété 9 : Validation de structure de fichier étudiant**
    - **Propriété 10 : Validation de structure de fichier enseignant**
    - **Valide : Exigences 3.3, 3.4**

- [ ] 4. Implémenter ImportValidationService
  - [x] 4.1 Créer la classe ImportValidationService avec dépendances
    - Injecter UserRepository, ClasseRepository, MatiereRepository
    - Définir la structure de base du service
    - _Exigences : 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.2 Implémenter validateStudentRow()
    - Valider le DTO avec class-validator
    - Vérifier l'unicité de l'email
    - Vérifier l'unicité du matricule dans l'école
    - Vérifier l'existence de la classe
    - Retourner le résultat de validation avec erreurs détaillées
    - _Exigences : 4.1, 4.2, 4.3, 4.4, 4.6, 4.8_

  - [x] 4.3 Implémenter validateTeacherRow()
    - Valider le DTO avec class-validator
    - Vérifier l'unicité de l'email
    - Vérifier l'unicité du matricule dans l'école
    - Vérifier l'existence de toutes les matières
    - Retourner le résultat de validation avec erreurs détaillées
    - _Exigences : 4.1, 4.2, 4.3, 4.5, 4.6, 4.8_

  - [ ]* 4.4 Écrire des tests de propriété pour la validation
    - **Propriété 4 : Unicité du matricule par école**
    - **Propriété 11 : Validation du matricule requis à l'import**
    - **Propriété 12 : Validation du format email**
    - **Propriété 13 : Unicité de l'email système**
    - **Propriété 14 : Validation de référence de classe**
    - **Propriété 15 : Validation de références de matières**
    - **Valide : Exigences 1.4, 2.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

  - [ ]* 4.5 Écrire des tests unitaires pour les cas d'erreur
    - Tester la validation avec email invalide
    - Tester la validation avec classeId inexistant
    - Tester la validation avec matiereIds inexistants
    - Tester l'enregistrement des erreurs avec numéro de ligne
    - _Exigences : 4.2, 4.4, 4.5, 4.8_

- [x] 5. Checkpoint - Vérifier les services de base
  - S'assurer que tous les tests passent
  - Vérifier que la migration fonctionne correctement
  - Demander à l'utilisateur si des questions se posent

- [ ] 6. Implémenter ImportService
  - [x] 6.1 Créer la classe ImportService avec dépendances
    - Injecter FileParserService, ImportValidationService, UserService, EmailService, Logger
    - Définir la structure de base du service
    - _Exigences : 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 6.2 Implémenter processImport() - partie parsing et validation
    - Parser le fichier avec FileParserService
    - Vérifier la limite de 1000 lignes
    - Valider la structure du fichier
    - Boucler sur les lignes et valider chacune
    - Collecter les lignes valides et les erreurs
    - _Exigences : 3.6, 4.7, 4.8_

  - [ ] 6.3 Implémenter generateTemporaryPassword()
    - Générer un mot de passe aléatoire de 12 caractères
    - Inclure majuscules, minuscules, chiffres et symboles
    - _Exigences : 5.2_

  - [ ] 6.4 Implémenter createUsersInTransaction()
    - Créer un QueryRunner et démarrer une transaction
    - Boucler sur les lignes valides
    - Créer chaque utilisateur avec UserService
    - Associer les classes pour les étudiants
    - Associer les matières pour les enseignants
    - Gérer les erreurs individuelles sans bloquer la transaction
    - Commit ou rollback selon les erreurs
    - _Exigences : 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2_

  - [ ] 6.5 Intégrer l'envoi d'emails optionnel
    - Envoyer les identifiants si sendEmail est activé
    - Gérer les échecs d'email sans bloquer l'import
    - Logger les échecs d'email
    - _Exigences : 8.1, 8.2, 8.4_

  - [ ] 6.6 Finaliser processImport() avec génération du rapport
    - Construire l'objet ImportReport avec toutes les statistiques
    - Logger l'opération d'import
    - Retourner le rapport complet
    - _Exigences : 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 6.5_

  - [ ]* 6.7 Écrire des tests de propriété pour ImportService
    - **Propriété 16 : Traitement continu malgré les erreurs**
    - **Propriété 17 : Enregistrement des erreurs avec contexte**
    - **Propriété 24 : Traitement partiel avec succès**
    - **Propriété 28 : Complétude du rapport d'import**
    - **Valide : Exigences 4.7, 4.8, 6.2, 7.1-7.7**

  - [ ]* 6.8 Écrire des tests unitaires pour les scénarios d'import
    - Tester un import 100% réussi
    - Tester un import avec erreurs partielles
    - Tester un import avec doublons détectés
    - Tester le rollback en cas d'erreur critique
    - Tester l'envoi d'emails activé/désactivé
    - _Exigences : 6.1, 6.2, 6.3, 6.4, 8.1, 8.4_

- [ ] 7. Implémenter ImportController
  - [ ] 7.1 Créer la classe ImportController
    - Définir le routeur /api/admin/import
    - Injecter ImportService
    - Ajouter les middlewares d'authentification et de rôle
    - _Exigences : 9.1, 9.2, 9.3, 9.5_

  - [ ] 7.2 Implémenter POST /api/admin/import/users
    - Valider la présence du fichier
    - Valider le type de fichier (.xlsx ou .csv)
    - Valider le DTO ImportRequestDto
    - Récupérer l'école de l'admin
    - Appeler ImportService.processImport()
    - Retourner le rapport d'import
    - Gérer les erreurs avec codes HTTP appropriés
    - _Exigences : 3.1, 3.2, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 7.3 Implémenter GET /api/admin/import/template/:type
    - Valider le paramètre type (student ou teacher)
    - Générer un fichier Excel template avec ExcelJS
    - Définir les colonnes appropriées selon le type
    - Retourner le fichier en téléchargement
    - _Exigences : 3.3, 3.4_

  - [ ]* 7.4 Écrire des tests unitaires pour ImportController
    - Tester l'upload de fichier valide
    - Tester le rejet de fichier invalide
    - Tester l'accès refusé pour non-admin
    - Tester le téléchargement de templates
    - _Exigences : 3.1, 3.2, 9.2, 9.3_

  - [ ]* 7.5 Écrire des tests de propriété pour l'autorisation
    - **Propriété 31 : Restriction d'accès aux admins**
    - **Propriété 32 : Validation du token d'authentification**
    - **Valide : Exigences 9.1, 9.2, 9.5**

- [ ] 8. Modifier UserController pour la gestion du matricule
  - [ ] 8.1 Ajouter la validation du matricule dans updateUser()
    - Vérifier l'unicité du matricule dans l'école lors de la mise à jour
    - Exclure l'utilisateur actuel de la vérification d'unicité
    - Retourner une erreur descriptive si matricule dupliqué
    - _Exigences : 1.6, 1.4, 1.5_

  - [ ] 8.2 Modifier les méthodes de création d'utilisateur
    - Permettre le matricule optionnel lors de création manuelle
    - Valider le format alphanumérique si fourni
    - Vérifier l'unicité dans l'école si fourni
    - _Exigences : 1.2, 1.3, 1.4_

  - [ ] 8.3 S'assurer que le matricule est inclus dans les réponses API
    - Vérifier les méthodes getUser(), listUsers(), etc.
    - Inclure le champ matricule dans les réponses JSON
    - _Exigences : 1.7_

  - [ ]* 8.4 Écrire des tests de propriété pour la gestion du matricule
    - **Propriété 1 : Stockage du matricule pour les rôles appropriés**
    - **Propriété 2 : Matricule optionnel lors de création manuelle**
    - **Propriété 5 : Matricule sensible à la casse**
    - **Propriété 6 : Matricule identique dans différentes écoles**
    - **Propriété 7 : Modification du matricule**
    - **Propriété 8 : Inclusion du matricule dans les réponses API**
    - **Valide : Exigences 1.1, 1.2, 1.6, 1.7, 2.2, 2.5**

  - [ ]* 8.5 Écrire des tests unitaires pour les cas d'erreur
    - Tester la création avec matricule invalide
    - Tester la mise à jour avec matricule dupliqué
    - Tester l'accès refusé pour non-admin
    - _Exigences : 1.3, 1.4, 1.5, 9.1, 9.4_

- [ ] 9. Checkpoint - Vérifier l'intégration complète
  - S'assurer que tous les tests passent
  - Vérifier que les endpoints fonctionnent correctement
  - Tester un scénario d'import complet de bout en bout
  - Demander à l'utilisateur si des questions se posent

- [ ] 10. Créer ou modifier le service EmailService
  - [ ] 10.1 Implémenter sendCredentials()
    - Créer un template d'email avec identifiants
    - Inclure l'email et le mot de passe temporaire
    - Inclure des instructions pour la première connexion
    - Envoyer l'email via le service configuré (SendGrid, AWS SES, etc.)
    - _Exigences : 8.1, 8.2, 8.3_

  - [ ]* 10.2 Écrire des tests unitaires pour EmailService
    - Tester l'envoi d'email réussi
    - Tester la gestion des échecs d'envoi
    - Vérifier le contenu de l'email
    - _Exigences : 8.1, 8.2, 8.3, 8.4_

  - [ ]* 10.3 Écrire des tests de propriété pour l'envoi d'emails
    - **Propriété 29 : Envoi d'email optionnel**
    - **Propriété 30 : Résilience aux échecs d'email**
    - **Valide : Exigences 8.1, 8.2, 8.4**

- [ ] 11. Ajouter les routes dans le routeur principal
  - [ ] 11.1 Enregistrer les routes d'import
    - Ajouter les routes ImportController dans routes/index.ts
    - Configurer les middlewares appropriés
    - _Exigences : 9.1, 9.2_

  - [ ] 11.2 Vérifier les routes existantes pour le matricule
    - S'assurer que les routes User incluent le matricule dans les réponses
    - Vérifier que les middlewares d'autorisation sont en place
    - _Exigences : 1.7, 9.1_

- [ ] 12. Ajouter la configuration et les dépendances
  - [ ] 12.1 Installer les bibliothèques npm
    - Installer xlsx, csv-parser, exceljs
    - Installer fast-check pour les tests de propriétés
    - Mettre à jour package.json
    - _Exigences : Toutes (dépendances techniques)_

  - [ ] 12.2 Configurer les variables d'environnement
    - Ajouter les configurations pour le service d'email
    - Ajouter les limites de fichier si nécessaire
    - Documenter les variables dans .env.example
    - _Exigences : 8.1, 3.6_

- [ ]* 13. Écrire des tests d'intégration de bout en bout
  - Tester le flux complet : upload → parsing → validation → création → rapport
  - Tester avec des fichiers Excel et CSV
  - Tester avec des étudiants et des enseignants
  - Tester les scénarios d'erreur (fichier invalide, doublons, etc.)
  - Tester l'envoi d'emails activé et désactivé
  - _Exigences : Toutes_

- [ ] 14. Documentation et finalisation
  - [ ] 14.1 Documenter les endpoints dans Swagger
    - Ajouter les annotations Swagger pour les routes d'import
    - Documenter les DTOs et les réponses
    - Ajouter des exemples de requêtes et réponses
    - _Exigences : Documentation API_

  - [ ] 14.2 Créer un guide d'utilisation
    - Documenter le format des fichiers d'import
    - Fournir des exemples de fichiers Excel et CSV
    - Expliquer le processus d'import et le rapport
    - Documenter la gestion du matricule
    - _Exigences : Documentation utilisateur_

  - [ ] 14.3 Mettre à jour le README du projet
    - Ajouter les nouvelles fonctionnalités
    - Documenter les nouvelles variables d'environnement
    - Ajouter les instructions de migration
    - _Exigences : Documentation technique_

- [ ] 15. Checkpoint final - Validation complète
  - Exécuter tous les tests (unitaires, propriétés, intégration)
  - Vérifier la couverture de code (objectif >80%)
  - Tester manuellement les endpoints avec Postman ou similaire
  - Vérifier les logs et le monitoring
  - Demander à l'utilisateur si tout est prêt pour le déploiement

## Notes

- Les tâches marquées avec `*` sont optionnelles et peuvent être ignorées pour un MVP plus rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les checkpoints permettent une validation incrémentale
- Les tests de propriétés valident les propriétés de correction universelles
- Les tests unitaires valident les exemples spécifiques et cas limites
- La configuration de fast-check doit utiliser minimum 100 itérations par test
- Chaque test de propriété doit être tagué avec : **Feature: user-matricule-and-bulk-import, Property {number}: {property_text}**
