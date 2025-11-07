# API Reference

## Base URL

```
http://localhost:3000/api
```

## Authentification

Toutes les routes protégées nécessitent un token JWT dans le header :
```http
Authorization: Bearer <token>
```

## Points d'entrée

1. [Authentication](./auth.md)
2. [Documents](./documents.md)
3. [Users](./users.md)
4. [Écoles](./ecoles.md)
5. [Filières](./filieres.md)
6. [Classes](./classes.md)
7. [Groupes de partage](./groupes.md)
8. [Catégories](./categories.md)
9. [Matières](./matieres.md)

## Formats de réponse

### Succès
```json
{
  "status": "success",
  "data": {
    // Données de réponse
  }
}
```

### Erreur
```json
{
  "status": "error",
  "message": "Description de l'erreur",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Pagination

Pour les routes qui supportent la pagination :

```http
GET /api/resource?page=1&limit=10
```

Réponse :
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "pages": 10,
    "current": 1,
    "limit": 10
  }
}
```

## Filtres

Format général :
```http
GET /api/resource?field=value&field2=value2
```

## Tri

```http
GET /api/resource?sort=field&order=asc
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource non trouvée |
| 409 | Conflit |
| 422 | Erreur de validation |
| 500 | Erreur serveur |

## Limites

- Taille maximale des fichiers : 10MB
- Requêtes par minute : 100
- Taille maximale des payloads : 1MB

## Versions

- Version actuelle : v1
- Format : `/api/v1/resource`