# API Documents

## Upload de document

```http
POST /api/documents/upload
Content-Type: multipart/form-data
```

### Corps de la requête
| Champ | Type | Description |
|-------|------|-------------|
| file | File | Fichier à uploader |
| documentName | string | Nom du document |
| description | string? | Description du document |
| categorieId | string | ID de la catégorie |
| matiereId | string? | ID de la matière |
| groupePartageIds | string[] | IDs des groupes de partage |
| isdownloadable | boolean | Si le document peut être téléchargé |

### Réponse
```json
{
  "message": "Document uploadé avec succès",
  "document": {
    "id": "uuid",
    "documentName": "string",
    "documentUrl": "string",
    "description": "string",
    "categorieId": "string",
    "matiereId": "string",
    "addedBy": "string",
    "isdownloadable": boolean,
    "downloadCount": 0,
    "viewCount": 0,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

## Upload multiple

```http
POST /api/documents/upload/multiple
Content-Type: multipart/form-data
```

### Corps de la requête
| Champ | Type | Description |
|-------|------|-------------|
| files | File[] | Fichiers à uploader (max 20) |
| documentMetadata | JSON | Métadonnées pour chaque fichier |

## Récupération des documents

### Liste des documents
```http
GET /api/documents
```

### Paramètres de requête
| Paramètre | Type | Description |
|-----------|------|-------------|
| categorieId | string? | Filtrer par catégorie |
| matiereId | string? | Filtrer par matière |
| addedById | string? | Filtrer par créateur |
| groupePartageId | string? | Filtrer par groupe |

### Document par ID
```http
GET /api/documents/:id
```

## Mise à jour d'un document

```http
PUT /api/documents/:id
Content-Type: application/json
```

### Corps de la requête
```json
{
  "documentName": "string",
  "description": "string",
  "categorieId": "string",
  "matiereId": "string",
  "groupePartageIds": ["string"],
  "isdownloadable": boolean
}
```

## Suppression

### Suppression unique
```http
DELETE /api/documents/:id
```

### Suppression multiple
```http
DELETE /api/documents
Content-Type: application/json

{
  "documentIds": ["string"]
}
```

## Téléchargement

```http
GET /api/documents/:id/download
```

## Gestion des groupes de partage

### Ajouter à un groupe
```http
POST /api/documents/groupe/add
Content-Type: application/json

{
  "documentId": "string",
  "groupeId": "string"
}
```

### Ajouter à plusieurs groupes
```http
POST /api/documents/groupe/add-multiple
Content-Type: application/json

{
  "documentId": "string",
  "groupeIds": ["string"]
}
```

### Retirer d'un groupe
```http
DELETE /api/documents/groupe/remove
Content-Type: application/json

{
  "documentId": "string",
  "groupeId": "string"
}
```

## Recherche et filtres

### Recherche
```http
GET /api/documents/search?q=query
```

### Documents les plus téléchargés
```http
GET /api/documents/most-downloaded?limit=10
```

### Documents les plus vus
```http
GET /api/documents/most-viewed?limit=10
```

### Documents récents
```http
GET /api/documents/recent?limit=10
```

## Par utilisateur/groupe/matière

### Documents d'un utilisateur
```http
GET /api/documents/user/:userId
```

### Documents d'un groupe
```http
GET /api/documents/groupe/:groupeId
```

### Documents d'une matière
```http
GET /api/documents/matiere/:matiereId
```

### Documents d'une catégorie
```http
GET /api/documents/categorie/:categorieId
```

## Modèle de données

```typescript
interface Document {
  id: string;
  documentName: string;
  documentUrl: string;
  description?: string;
  categorieId: string;
  matiereId?: string;
  addedBy: string;
  isdownloadable: boolean;
  downloadCount: number;
  viewCount: number;
  groupesPartage: GroupePartage[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Codes d'erreur spécifiques

| Code | Description |
|------|-------------|
| FILE_TOO_LARGE | Fichier trop volumineux |
| INVALID_FILE_TYPE | Type de fichier non supporté |
| STORAGE_ERROR | Erreur de stockage |
| NOT_DOWNLOADABLE | Document non téléchargeable |