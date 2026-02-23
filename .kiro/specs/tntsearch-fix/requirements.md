# Spec: Correction de la recherche TNTSearch

## 1. Contexte

Le système de recherche TNTSearch a été implémenté avec:
- ✅ Configuration correcte de la connexion MySQL active
- ✅ Table `search_index` créée pour stocker les documents indexés
- ✅ Observer `DocumentObserver` qui déclenche l'indexation automatique
- ✅ Jobs d'indexation sur la queue `search-indexing`
- ✅ API TNTSearch correcte avec `$index->insert()` et `$index->update()`

**Problème actuel**: La recherche ne retourne AUCUN résultat malgré l'indexation. Les logs montrent `"ids":[]` dans les résultats TNTSearch, ce qui indique que l'index SQLite est vide ou que la recherche ne fonctionne pas correctement.

## 2. Problème identifié

### 2.1 Symptômes
- L'indexation semble fonctionner (pas d'erreurs dans les logs)
- Les documents sont insérés dans la table `search_index`
- La recherche retourne toujours 0 résultats
- Les tests `TNTSearchIntegrationTest` échouent (3 sur 4)

### 2.2 Hypothèses
1. **L'index TNTSearch SQLite est vide**: Les appels à `$index->insert()` ne persistent pas les données
2. **Mauvaise utilisation de l'API TNTSearch**: La méthode d'indexation n'est pas correcte
3. **Index non créé correctement**: L'index initial est créé avec une requête vide qui ne définit pas la structure
4. **Pas de commit/flush**: TNTSearch nécessite peut-être un commit explicite après insertion

## 3. User Stories

### 3.1 En tant qu'utilisateur
Je veux pouvoir rechercher des documents par leur nom ou contenu et obtenir des résultats pertinents.

**Critères d'acceptation**:
- Quand je recherche "mathématiques", je trouve tous les documents contenant ce terme
- Les résultats sont triés par pertinence (score)
- La recherche est isolée par tenant (école)

### 3.2 En tant que système
Je veux que l'indexation TNTSearch persiste correctement les documents dans l'index SQLite.

**Critères d'acceptation**:
- Après indexation, le fichier `.index` SQLite contient les documents
- La recherche retourne les IDs des documents indexés
- Les mises à jour et suppressions fonctionnent correctement

## 4. Exigences fonctionnelles

### 4.1 Indexation
- L'indexation doit persister les documents dans l'index TNTSearch SQLite
- Chaque document doit être indexé avec son ID, titre et contenu
- L'index doit être isolé par tenant (un fichier `.index` par école)

### 4.2 Recherche
- La recherche doit retourner les IDs des documents correspondants
- Les résultats doivent inclure un score de pertinence
- La recherche doit fonctionner sur le titre et le contenu

### 4.3 Mise à jour et suppression
- La mise à jour d'un document doit mettre à jour l'index
- La suppression d'un document doit le retirer de l'index

## 5. Exigences techniques

### 5.1 API TNTSearch correcte
Utiliser l'API officielle de TNTSearch:
```php
// Création d'index
$indexer = $tnt->createIndex('index_name.index');
$indexer->query("SELECT id, title, content FROM table");
$indexer->run();

// Indexation manuelle
$tnt->selectIndex('index_name.index');
$index = $tnt->getIndex();
$index->insert(['id' => 1, 'title' => 'Test', 'content' => 'Content']);

// Recherche
$tnt->selectIndex('index_name.index');
$results = $tnt->search('query', $limit);
// Retourne: ['ids' => [id => score, ...]]
```

### 5.2 Structure de l'index
L'index doit être créé avec la bonne structure de colonnes:
- `id`: UUID du document
- `document_name`: Titre du document
- `searchable_content`: Contenu complet indexable

### 5.3 Tests
Tous les tests `TNTSearchIntegrationTest` doivent passer:
- ✅ `it_can_index_and_search_documents`
- ✅ `it_returns_empty_results_for_non_matching_query`
- ✅ `it_can_delete_document_from_index`
- ✅ `it_isolates_documents_by_tenant`

## 6. Contraintes

- Ne pas modifier la structure de la table `search_index`
- Conserver l'isolation par tenant (un index par école)
- Maintenir la compatibilité avec l'observer et les jobs existants
- Utiliser uniquement l'API officielle de TNTSearch (pas de hacks)

## 7. Critères de succès

1. Les 4 tests `TNTSearchIntegrationTest` passent
2. La recherche retourne des résultats pour des documents indexés
3. L'index SQLite contient effectivement les documents après indexation
4. Les logs montrent des IDs dans les résultats de recherche (pas `"ids":[]`)

## 8. Hors scope

- Optimisation des performances de recherche
- Ajout de fonctionnalités de recherche avancée (facettes, filtres complexes)
- Migration vers un autre moteur de recherche
- Amélioration de l'extraction de texte
