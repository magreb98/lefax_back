# Design: Correction de la recherche TNTSearch

## 1. Vue d'ensemble

Le problème principal est que TNTSearch utilise une approche hybride incorrecte : il tente d'utiliser à la fois l'indexation via requête SQL (`createIndex()->query()->run()`) et l'indexation manuelle (`$index->insert()`). Ces deux approches sont incompatibles.

**Solution**: Utiliser exclusivement l'indexation via requête SQL en reconstruisant l'index complet depuis la table `search_index` à chaque modification.

## 2. Architecture

### 2.1 Flux d'indexation corrigé

```
Document créé/modifié
    ↓
DocumentObserver déclenche IndexDocumentJob
    ↓
IndexDocumentJob extrait le texte
    ↓
SearchManager.indexDocument()
    ↓
TNTSearchProvider.indexDocument()
    ↓
1. Insérer/Mettre à jour dans search_index (MySQL)
    ↓
2. Reconstruire l'index TNTSearch depuis search_index
    ↓
Index SQLite mis à jour avec tous les documents du tenant
```

### 2.2 Méthode d'indexation

TNTSearch fonctionne mieux avec l'indexation par requête SQL :

```php
// Créer/Reconstruire l'index complet
$indexer = $this->tnt->createIndex($indexFile);
$indexer->query("
    SELECT id, document_name, searchable_content 
    FROM search_index 
    WHERE tenant_id = '{$tenantId}'
");
$indexer->run();
```

Cette approche :
- ✅ Garantit que l'index SQLite contient tous les documents
- ✅ Utilise l'API officielle de TNTSearch
- ✅ Évite les problèmes de synchronisation
- ⚠️ Reconstruit l'index complet à chaque modification (acceptable pour des volumes modérés)

## 3. Composants modifiés

### 3.1 TNTSearchProvider

**Fichier**: `lefax-php/app/Services/Search/Providers/TNTSearchProvider.php`

#### Méthode `indexDocument()`

**Avant** (approche hybride incorrecte):
```php
// 1. Insérer dans search_index
DB::table('search_index')->updateOrInsert(...);

// 2. Tenter d'utiliser $index->insert() (ne fonctionne pas)
$this->ensureIndexExists($tenantId);
$index = $this->tnt->getIndex();
$index->insert([...]);
```

**Après** (approche par requête SQL):
```php
// 1. Insérer dans search_index
DB::table('search_index')->updateOrInsert(
    ['id' => $id, 'tenant_id' => $tenantId],
    [
        'document_name' => $title,
        'searchable_content' => $searchableText,
    ]
);

// 2. Reconstruire l'index complet depuis search_index
$this->rebuildIndex($tenantId);
```

#### Nouvelle méthode `rebuildIndex()`

```php
private function rebuildIndex(string $tenantId): void
{
    $indexFile = $this->getIndexFileName($tenantId);
    
    // Créer/Reconstruire l'index
    $indexer = $this->tnt->createIndex($indexFile);
    $indexer->query("
        SELECT id, document_name, searchable_content 
        FROM search_index 
        WHERE tenant_id = '{$tenantId}'
    ");
    $indexer->run();
}
```

#### Méthode `deleteDocument()`

**Avant**:
```php
// Supprimer de search_index
DB::table('search_index')->delete();

// Tenter d'utiliser $index->delete() (ne fonctionne pas)
$index->delete($id);
```

**Après**:
```php
// 1. Supprimer de search_index
DB::table('search_index')
    ->where('id', $id)
    ->where('tenant_id', $tenantId)
    ->delete();

// 2. Reconstruire l'index
$this->rebuildIndex($tenantId);
```

#### Méthode `ensureIndexExists()`

**Simplification**: Cette méthode n'est plus nécessaire car `rebuildIndex()` crée automatiquement l'index s'il n'existe pas.

### 3.2 Optimisation (optionnelle)

Pour éviter de reconstruire l'index à chaque modification, on peut ajouter un cache/debounce :

```php
private function rebuildIndex(string $tenantId): void
{
    $cacheKey = "tntsearch_rebuild_{$tenantId}";
    
    // Éviter de reconstruire trop souvent (max 1 fois par seconde)
    if (Cache::has($cacheKey)) {
        return;
    }
    
    Cache::put($cacheKey, true, 1); // 1 seconde
    
    $indexFile = $this->getIndexFileName($tenantId);
    $indexer = $this->tnt->createIndex($indexFile);
    $indexer->query("
        SELECT id, document_name, searchable_content 
        FROM search_index 
        WHERE tenant_id = '{$tenantId}'
    ");
    $indexer->run();
}
```

## 4. Tests

### 4.1 Tests existants à valider

Tous les tests dans `TNTSearchIntegrationTest.php` doivent passer :

1. **it_can_index_and_search_documents**
   - Indexe un document avec "mathématiques"
   - Recherche "mathématiques"
   - Vérifie que le document est trouvé

2. **it_returns_empty_results_for_non_matching_query**
   - Indexe un document sur la physique
   - Recherche "biologie"
   - Vérifie 0 résultats

3. **it_can_delete_document_from_index**
   - Indexe un document
   - Vérifie qu'il est trouvé
   - Supprime le document
   - Vérifie qu'il n'est plus trouvé

4. **it_isolates_documents_by_tenant**
   - Indexe doc1 pour école1
   - Indexe doc2 pour école2
   - Vérifie que école1 ne voit que doc1
   - Vérifie que école2 ne voit que doc2

### 4.2 Validation manuelle

Après implémentation, vérifier :

```bash
# 1. Exécuter les tests
php artisan test --filter TNTSearchIntegrationTest

# 2. Vérifier que l'index SQLite contient des données
sqlite3 storage/search/tntsearch/documents_1.index "SELECT COUNT(*) FROM wordlist;"

# 3. Tester la recherche manuellement
php artisan tinker
>>> $sm = app(\App\Services\Search\SearchManager::class);
>>> $results = $sm->search('test', '1');
>>> dd($results);
```

## 5. Considérations de performance

### 5.1 Impact de la reconstruction complète

- **Petit volume** (<1000 docs/tenant): Impact négligeable (<100ms)
- **Volume moyen** (1000-10000 docs/tenant): Impact acceptable (100-500ms)
- **Gros volume** (>10000 docs/tenant): Considérer l'optimisation avec cache

### 5.2 Alternative pour gros volumes

Si la reconstruction devient trop lente, utiliser une approche par batch :

```php
// Dans IndexDocumentJob, grouper les indexations
public static $pendingIndexations = [];

public function handle(SearchManager $searchManager): void
{
    // Ajouter à la liste
    self::$pendingIndexations[$this->tenantId][] = $this->documentId;
    
    // Reconstruire seulement si dernier job du batch
    if ($this->isLastInBatch()) {
        $searchManager->rebuildIndex($this->tenantId);
    }
}
```

## 6. Correctness Properties

### Property 1: Indexation complète
**Énoncé**: Après indexation d'un document, l'index TNTSearch contient ce document.

**Test**:
```php
$sm->indexDocument($id, $data, $tenantId);
$results = $sm->search($data['title'], $tenantId);
assert(in_array($id, array_column($results['results'], 'id')));
```

### Property 2: Isolation par tenant
**Énoncé**: Un document indexé pour tenant A n'est jamais retourné lors d'une recherche pour tenant B.

**Test**:
```php
$sm->indexDocument($id1, $data1, 'tenant_a');
$sm->indexDocument($id2, $data2, 'tenant_b');
$resultsA = $sm->search('test', 'tenant_a');
$resultsB = $sm->search('test', 'tenant_b');
assert(!in_array($id2, array_column($resultsA['results'], 'id')));
assert(!in_array($id1, array_column($resultsB['results'], 'id')));
```

### Property 3: Suppression effective
**Énoncé**: Après suppression d'un document, il n'apparaît plus dans les résultats de recherche.

**Test**:
```php
$sm->indexDocument($id, $data, $tenantId);
$sm->deleteDocument($id, $tenantId);
$results = $sm->search($data['title'], $tenantId);
assert(!in_array($id, array_column($results['results'], 'id')));
```

### Property 4: Mise à jour effective
**Énoncé**: Après mise à jour d'un document, la recherche retourne le nouveau contenu.

**Test**:
```php
$sm->indexDocument($id, ['title' => 'old'], $tenantId);
$sm->updateDocument($id, ['title' => 'new'], $tenantId);
$resultsOld = $sm->search('old', $tenantId);
$resultsNew = $sm->search('new', $tenantId);
assert(!in_array($id, array_column($resultsOld['results'], 'id')));
assert(in_array($id, array_column($resultsNew['results'], 'id')));
```

## 7. Risques et mitigations

### Risque 1: Performance dégradée
**Mitigation**: Ajouter un cache pour limiter les reconstructions à 1 par seconde par tenant.

### Risque 2: Corruption d'index
**Mitigation**: Ajouter un try-catch et reconstruire l'index en cas d'erreur de lecture.

### Risque 3: Concurrence
**Mitigation**: Utiliser un lock pour éviter les reconstructions simultanées du même index.

```php
private function rebuildIndex(string $tenantId): void
{
    $lockKey = "tntsearch_rebuild_lock_{$tenantId}";
    
    if (!Cache::lock($lockKey, 10)->get()) {
        // Un autre processus reconstruit déjà l'index
        return;
    }
    
    try {
        // Reconstruire l'index
        $indexer = $this->tnt->createIndex($indexFile);
        $indexer->query("...");
        $indexer->run();
    } finally {
        Cache::lock($lockKey)->release();
    }
}
```

## 8. Rollback plan

Si la solution ne fonctionne pas :

1. **Fallback immédiat**: Le SearchManager bascule automatiquement sur DatabaseSearchProvider
2. **Investigation**: Vérifier les logs et le contenu de l'index SQLite
3. **Alternative**: Considérer l'utilisation de Laravel Scout avec TNTSearch driver

## 9. Documentation

Ajouter dans `config/search.php` :

```php
/*
|--------------------------------------------------------------------------
| TNTSearch Indexing Strategy
|--------------------------------------------------------------------------
|
| TNTSearch uses a full rebuild strategy: each time a document is indexed,
| updated, or deleted, the entire index for that tenant is rebuilt from
| the search_index table. This ensures consistency and uses the official
| TNTSearch API (createIndex()->query()->run()).
|
| For high-volume tenants (>10000 documents), consider enabling the cache
| to limit rebuilds to once per second.
|
*/
```
