# Tasks: Correction de la recherche TNTSearch

## 1. Corriger la méthode d'indexation TNTSearch
- [x] 1.1 Ajouter la méthode `rebuildIndex()` dans TNTSearchProvider
  - Créer/reconstruire l'index complet depuis search_index
  - Utiliser `createIndex()->query()->run()` avec filtrage par tenant_id
  - Ajouter logging pour tracer les reconstructions
- [x] 1.2 Modifier `indexDocument()` pour utiliser rebuildIndex()
  - Conserver l'insertion dans search_index
  - Remplacer l'approche `$index->insert()` par `rebuildIndex()`
  - Supprimer la vérification `exists` devenue inutile
- [x] 1.3 Modifier `deleteDocument()` pour utiliser rebuildIndex()
  - Conserver la suppression de search_index
  - Remplacer l'approche `$index->delete()` par `rebuildIndex()`
- [x] 1.4 Supprimer la méthode `ensureIndexExists()`
  - Elle est remplacée par rebuildIndex() qui crée l'index si nécessaire
  - Nettoyer les appels à cette méthode

## 2. Ajouter l'optimisation avec cache
- [x] 2.1 Implémenter le debounce dans rebuildIndex()
  - Utiliser Cache::has() pour vérifier si reconstruction récente
  - Limiter à 1 reconstruction par seconde par tenant
  - Ajouter un paramètre $force pour forcer la reconstruction si nécessaire
- [x] 2.2 Ajouter un lock pour éviter les reconstructions concurrentes
  - Utiliser Cache::lock() avec timeout de 10 secondes
  - Gérer le cas où le lock n'est pas obtenu
  - Libérer le lock dans un bloc finally

## 3. Valider avec les tests existants
- [x] 3.1 Exécuter les tests TNTSearchIntegrationTest
  - Vérifier que les 4 tests passent
  - Analyser les logs pour confirmer les reconstructions
- [ ] 3.2 Vérifier le contenu de l'index SQLite
  - Utiliser sqlite3 pour inspecter le fichier .index
  - Vérifier que la table wordlist contient des données
  - Vérifier que les documents sont présents dans la table doclist
- [ ] 3.3 Tester manuellement avec tinker
  - Indexer un document
  - Rechercher le document
  - Vérifier que les résultats contiennent des IDs

## 4. Ajouter des tests de propriétés
- [ ] 4.1 Tester la propriété "Indexation complète"
  - Indexer un document
  - Vérifier qu'il est trouvé par recherche
- [ ] 4.2 Tester la propriété "Isolation par tenant"
  - Indexer des documents pour 2 tenants différents
  - Vérifier que chaque tenant ne voit que ses documents
- [ ] 4.3 Tester la propriété "Suppression effective"
  - Indexer puis supprimer un document
  - Vérifier qu'il n'est plus trouvé
- [ ] 4.4 Tester la propriété "Mise à jour effective"
  - Indexer un document avec un titre
  - Mettre à jour avec un nouveau titre
  - Vérifier que l'ancien titre ne retourne plus le document
  - Vérifier que le nouveau titre retourne le document

## 5. Documentation et nettoyage
- [ ] 5.1 Ajouter des commentaires dans TNTSearchProvider
  - Expliquer la stratégie de reconstruction complète
  - Documenter les raisons du choix (vs insert/update manuel)
- [ ] 5.2 Mettre à jour config/search.php
  - Ajouter une section expliquant la stratégie TNTSearch
  - Documenter les considérations de performance
- [ ] 5.3 Nettoyer le code
  - Supprimer les méthodes inutilisées
  - Supprimer les commentaires obsolètes
  - Vérifier les imports

## Notes d'implémentation

### Ordre d'exécution
1. Commencer par la tâche 1 (correction de base)
2. Valider avec la tâche 3 (tests)
3. Ajouter l'optimisation (tâche 2)
4. Ajouter les tests de propriétés (tâche 4)
5. Finaliser avec la documentation (tâche 5)

### Critères de succès
- ✅ Les 4 tests TNTSearchIntegrationTest passent
- ✅ L'index SQLite contient des données après indexation
- ✅ La recherche retourne des résultats avec des IDs
- ✅ Les logs montrent des reconstructions d'index réussies

### Rollback
Si les tests échouent après la tâche 1, revenir à l'implémentation précédente et investiguer avec des logs détaillés.
