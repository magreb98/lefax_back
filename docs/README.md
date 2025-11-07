# Documentation Lefax

## Vue d'ensemble

Lefax est une plateforme de gestion de documents pédagogiques permettant aux enseignants et aux établissements scolaires de partager et gérer leurs ressources pédagogiques de manière organisée.

## Table des matières

1. [Installation et Configuration](./setup.md)
2. [Architecture](./architecture.md)
3. [API Reference](./api/README.md)
4. [Modèles de données](./models/README.md)
5. [Authentification et Sécurité](./auth/README.md)
6. [Guides d'utilisation](./guides/README.md)

## Fonctionnalités principales

- Gestion des documents pédagogiques
- Système de partage avec groupes
- Gestion des utilisateurs et des rôles
- Organisation par écoles, filières et classes
- Catégorisation des documents
- Statistiques de consultation et téléchargement
- Recherche avancée de documents

## Technologies utilisées

- Backend : Node.js avec Express et TypeScript
- Base de données : MySQL avec TypeORM
- Authentification : JWT (JSON Web Tokens)
- Documentation API : Swagger/OpenAPI 3.0
- Validation : class-validator
- Gestion des fichiers : Multer

## Prérequis

- Node.js (v14 ou supérieur)
- MySQL (v8.0 ou supérieur)
- npm ou yarn