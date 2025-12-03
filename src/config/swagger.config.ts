/**
 * Configuration Swagger complète pour l'API Lefax
 * Cette configuration permet de tester tous les endpoints directement depuis l'interface Swagger UI
 */

export const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Lefax API',
        version: '1.0.0',
        description: `
# API Lefax - Plateforme de Gestion de Documents Pédagogiques

Cette API permet de gérer des documents pédagogiques, des utilisateurs, des écoles, des classes et des groupes de partage.

## Fonctionnalités principales
- 🔐 Authentification JWT
- 👥 Gestion des utilisateurs et rôles
- 📄 Upload et partage de documents
- 🏫 Organisation par écoles, filières et classes
- 👥 Groupes de partage personnalisés
- 🔔 Système de notifications

## Comment utiliser cette documentation
1. **Authentification** : Commencez par vous connecter via \`POST /api/auth/login\`
2. **Autorisation** : Copiez le token reçu et cliquez sur "Authorize" en haut à droite
3. **Test** : Testez les endpoints directement depuis cette interface

## Rôles disponibles
- **SUPERADMIN** : Accès total
- **ADMIN** : Gestion d'une école
- **ENSEIGNANT** : Publication de documents
- **ETUDIANT** : Consultation de documents
- **USER** : Accès basique
    `,
        contact: {
            name: 'Lefax Team',
            email: 'support@lefax.com'
        },
        license: {
            name: 'Private'
        }
    },
    servers: [
        {
            url: 'http://localhost:{port}/api',
            description: 'Serveur de développement',
            variables: {
                port: {
                    default: '3000',
                    description: 'Port du serveur'
                }
            }
        },
        {
            url: 'https://api.lefax.com/api',
            description: 'Serveur de production'
        }
    ],
    tags: [
        {
            name: 'Authentication',
            description: 'Endpoints d\'authentification et gestion de session'
        },
        {
            name: 'Users',
            description: 'Gestion des utilisateurs'
        },
        {
            name: 'Documents',
            description: 'Upload, téléchargement et gestion de documents'
        },
        {
            name: 'Écoles',
            description: 'Gestion des établissements scolaires'
        },
        {
            name: 'Filières',
            description: 'Gestion des filières'
        },
        {
            name: 'Classes',
            description: 'Gestion des classes'
        },
        {
            name: 'Matières',
            description: 'Gestion des matières'
        },
        {
            name: 'Groupes de Partage',
            description: 'Création et gestion de groupes de partage'
        },
        {
            name: 'Catégories',
            description: 'Catégories de documents'
        },
        {
            name: 'Notifications',
            description: 'Système de notifications'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Entrez le token JWT obtenu via /auth/login'
            }
        },
        schemas: {
            // ===== User Schemas =====
            User: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '550e8400-e29b-41d4-a716-446655440000'
                    },
                    firstName: {
                        type: 'string',
                        example: 'Jean'
                    },
                    lastName: {
                        type: 'string',
                        example: 'Dupont'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'jean.dupont@example.com'
                    },
                    phoneNumber: {
                        type: 'string',
                        example: '+33612345678'
                    },
                    role: {
                        type: 'string',
                        enum: ['superadmin', 'admin', 'enseignant', 'etudiant', 'user'],
                        example: 'etudiant'
                    },
                    isActive: {
                        type: 'boolean',
                        example: true
                    },
                    isSuspended: {
                        type: 'boolean',
                        example: false
                    },
                    isVerified: {
                        type: 'boolean',
                        example: true
                    },
                    canCreateSchool: {
                        type: 'boolean',
                        example: false
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            LoginRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'jean.dupont@example.com'
                    },
                    password: {
                        type: 'string',
                        format: 'password',
                        example: 'MotDePasse123!'
                    }
                }
            },
            LoginResponse: {
                type: 'object',
                properties: {
                    token: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    refreshToken: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    user: {
                        $ref: '#/components/schemas/User'
                    }
                }
            },
            RegisterRequest: {
                type: 'object',
                required: ['firstName', 'lastName', 'email', 'password', 'phoneNumber'],
                properties: {
                    firstName: {
                        type: 'string',
                        example: 'Jean'
                    },
                    lastName: {
                        type: 'string',
                        example: 'Dupont'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'jean.dupont@example.com'
                    },
                    password: {
                        type: 'string',
                        format: 'password',
                        minLength: 8,
                        example: 'MotDePasse123!'
                    },
                    phoneNumber: {
                        type: 'string',
                        example: '+33612345678'
                    }
                }
            },
            // ===== Document Schemas =====
            Document: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid'
                    },
                    documentName: {
                        type: 'string',
                        example: 'Cours de Mathématiques - Chapitre 1'
                    },
                    documentUrl: {
                        type: 'string',
                        example: '/uploads/1234567890-document.pdf'
                    },
                    description: {
                        type: 'string',
                        example: 'Introduction aux fonctions'
                    },
                    fileSize: {
                        type: 'integer',
                        example: 1048576
                    },
                    fileType: {
                        type: 'string',
                        example: 'application/pdf'
                    },
                    isdownloadable: {
                        type: 'boolean',
                        example: true
                    },
                    downaloadCount: {
                        type: 'integer',
                        example: 42
                    },
                    viewCount: {
                        type: 'integer',
                        example: 156
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            // ===== Ecole Schemas =====
            Ecole: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid'
                    },
                    schoolName: {
                        type: 'string',
                        example: 'Université Paris-Saclay'
                    },
                    address: {
                        type: 'string',
                        example: 'Rue Joliot Curie, 91190 Gif-sur-Yvette'
                    },
                    schoolEmail: {
                        type: 'string',
                        format: 'email',
                        example: 'contact@universite-paris-saclay.fr'
                    },
                    schoolPhone: {
                        type: 'string',
                        example: '+33169153000'
                    },
                    isActive: {
                        type: 'boolean',
                        example: true
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            CreateEcoleRequest: {
                type: 'object',
                required: ['schoolName', 'address', 'schoolEmail', 'schoolPhone', 'schoolAdminId'],
                properties: {
                    schoolName: {
                        type: 'string',
                        example: 'Université Paris-Saclay'
                    },
                    address: {
                        type: 'string',
                        example: 'Rue Joliot Curie, 91190 Gif-sur-Yvette'
                    },
                    schoolEmail: {
                        type: 'string',
                        format: 'email',
                        example: 'contact@universite-paris-saclay.fr'
                    },
                    schoolPhone: {
                        type: 'string',
                        example: '+33169153000'
                    },
                    schoolAdminId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID de l\'administrateur de l\'école'
                    }
                }
            },
            // ===== GroupePartage Schemas =====
            GroupePartage: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid'
                    },
                    groupeName: {
                        type: 'string',
                        example: 'Groupe Licence Info 2024'
                    },
                    description: {
                        type: 'string',
                        example: 'Groupe de partage pour la L3 Informatique'
                    },
                    type: {
                        type: 'string',
                        enum: ['school', 'class', 'filiere', 'matiere', 'custom'],
                        example: 'custom'
                    },
                    isActive: {
                        type: 'boolean',
                        example: true
                    },
                    invitationToken: {
                        type: 'string',
                        example: 'abc123def456'
                    },
                    invitationExpiresAt: {
                        type: 'string',
                        format: 'date-time'
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            CreateGroupeRequest: {
                type: 'object',
                required: ['groupeName'],
                properties: {
                    groupeName: {
                        type: 'string',
                        example: 'Groupe de travail TD'
                    },
                    description: {
                        type: 'string',
                        example: 'Groupe pour partager les TD'
                    },
                    userIds: {
                        type: 'array',
                        items: {
                            type: 'string',
                            format: 'uuid'
                        },
                        description: 'IDs des membres initiaux'
                    }
                }
            },
            // ===== Error Schemas =====
            Error: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        example: 'Une erreur est survenue'
                    },
                    error: {
                        type: 'string',
                        example: 'ERROR_CODE'
                    }
                }
            },
            ValidationError: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        example: 'Données invalides'
                    },
                    errors: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                field: {
                                    type: 'string',
                                    example: 'email'
                                },
                                message: {
                                    type: 'string',
                                    example: 'Email invalide'
                                }
                            }
                        }
                    }
                }
            }
        },
        responses: {
            Unauthorized: {
                description: 'Non authentifié - Token manquant ou invalide',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        },
                        example: {
                            message: 'Token d\'accès manquant',
                            error: 'NO_TOKEN'
                        }
                    }
                }
            },
            Forbidden: {
                description: 'Accès refusé - Permissions insuffisantes',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        },
                        example: {
                            message: 'Accès refusé. Rôle insuffisant.',
                            error: 'INSUFFICIENT_ROLE'
                        }
                    }
                }
            },
            NotFound: {
                description: 'Ressource non trouvée',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        },
                        example: {
                            message: 'Ressource non trouvée',
                            error: 'NOT_FOUND'
                        }
                    }
                }
            },
            ValidationError: {
                description: 'Erreur de validation',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ValidationError'
                        }
                    }
                }
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ]
};

export const swaggerOptions = {
    definition: swaggerDefinition,
    apis: [
        './src/routes/*.ts',
        './src/controllers/*.ts',
        './src/config/swagger.annotations.ts'
    ]
};
