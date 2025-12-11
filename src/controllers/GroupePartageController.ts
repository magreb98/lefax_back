import { Request, Response } from 'express';
import { GroupePartageService } from '../services/GroupePartageService';
import { GroupePartageType, GroupePartage } from '../entity/groupe.partage';
import { AppDataSource } from '../config/database';
import { User } from '../entity/user';

export class GroupePartageController {
    private groupePartageService = new GroupePartageService();
    private userRepository = AppDataSource.getRepository(User);


    /**
     * Récupérer tous les groupes de partages
     */
    async getAllGroupePartage(req: Request, res: Response): Promise<void> {
        console.log('getAllGroupePartage called');
        try {
            // ✅ Charger l'utilisateur avec ses relations nécessaires
            let user = (req as any).user;

            // Log pour debug
            console.log('User from req:', user);
            console.log('Query params:', req.query);

            if (user && user.id) {
                try {
                    // Recharger l'utilisateur avec la relation school et classe
                    const fullUser = await this.userRepository.findOne({
                        where: { id: user.id },
                        relations: ['school', 'classe', 'ecoles']
                    });

                    if (fullUser) {
                        user = fullUser;
                        console.log('User reloaded with relations:', {
                            id: user.id,
                            role: user.role,
                            hasSchool: !!user.school,
                            schoolId: user.school?.id
                        });
                    }
                } catch (reloadError) {
                    console.error('Erreur rechargement user:', reloadError);
                    // Continue avec user original si échec
                }
            }

            const ownedOnly = req.query.owned === 'true';
            console.log('Calling service with ownedOnly:', ownedOnly);

            const groupesPartages = await this.groupePartageService.getAllGroupePartage(user, ownedOnly);

            res.status(200).json({
                message: 'Groupes de partage récupérés avec succès',
                groupesPartages
            });
        } catch (error: any) {
            console.error('Erreur complète:', error);
            console.error('Stack trace:', error.stack);
            res.status(400).json({
                message: 'Erreur lors de la récupération des groupes de partage',
                error: error.message,
                details: error.stack
            });
        }
    }

    /**
     * Récupérer un groupe de partage par son ID avec tous ses détails
     * GET /api/groupes/:id
     */
    async getGroupeById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const groupe = await this.groupePartageService.getGroupeById(id);

            res.status(200).json({
                message: 'Groupe de partage récupéré avec succès',
                groupe
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération du groupe:', error);
            const statusCode = error.message === 'Groupe de partage non trouvé' ? 404 : 400;
            res.status(statusCode).json({
                message: error.message || 'Erreur lors de la récupération du groupe',
                error: error.message
            });
        }
    }


    // ========== SYNCHRONISATION ==========

    /**
     * Synchroniser le groupe de partage d'une classe
     */
    async syncClasseGroupePartage(req: Request, res: Response): Promise<void> {
        try {
            const { classeId } = req.params;

            await this.groupePartageService.syncClasseGroupePartage(classeId);

            res.status(200).json({
                message: 'Groupe de partage de la classe synchronisé avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors de la synchronisation du groupe de la classe:', error);
            res.status(400).json({
                message: 'Erreur lors de la synchronisation',
                error: error.message
            });
        }
    }

    /**
     * Synchroniser le groupe de partage d'une filière
     */
    async syncFiliereGroupePartage(req: Request, res: Response): Promise<void> {
        try {
            const { filiereId } = req.params;

            await this.groupePartageService.syncFiliereGroupePartage(filiereId);

            res.status(200).json({
                message: 'Groupe de partage de la filière synchronisé avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors de la synchronisation du groupe de la filière:', error);
            res.status(400).json({
                message: 'Erreur lors de la synchronisation',
                error: error.message
            });
        }
    }

    /**
     * Synchroniser le groupe de partage d'une école
     */
    async syncEcoleGroupePartage(req: Request, res: Response): Promise<void> {
        try {
            const { ecoleId } = req.params;

            await this.groupePartageService.syncEcoleGroupePartage(ecoleId);

            res.status(200).json({
                message: 'Groupe de partage de l\'école synchronisé avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors de la synchronisation du groupe de l\'école:', error);
            res.status(400).json({
                message: 'Erreur lors de la synchronisation',
                error: error.message
            });
        }
    }

    /**
     * Synchroniser après affectation d'un enseignant
     */
    async syncAfterEnseignementAssignment(req: Request, res: Response): Promise<void> {
        try {
            const { enseignementId } = req.params;

            await this.groupePartageService.syncAfterEnseignementAssignment(enseignementId);

            res.status(200).json({
                message: 'Groupes synchronisés après affectation de l\'enseignant'
            });
        } catch (error: any) {
            console.error('Erreur lors de la synchronisation:', error);
            res.status(400).json({
                message: 'Erreur lors de la synchronisation',
                error: error.message
            });
        }
    }

    /**
     * Synchroniser après suppression d'un enseignement
     */
    async syncAfterEnseignementRemoval(req: Request, res: Response): Promise<void> {
        try {
            const { ecoleId, classeId } = req.body;

            if (!ecoleId || !classeId) {
                res.status(400).json({
                    message: 'Les champs ecoleId et classeId sont requis'
                });
                return;
            }

            await this.groupePartageService.syncAfterEnseignementRemoval(ecoleId, classeId);

            res.status(200).json({
                message: 'Groupes synchronisés après suppression de l\'enseignement'
            });
        } catch (error: any) {
            console.error('Erreur lors de la synchronisation:', error);
            res.status(400).json({
                message: 'Erreur lors de la synchronisation',
                error: error.message
            });
        }
    }

    // ========== CRÉATION AVEC GROUPES ==========

    /**
     * Créer une école avec son groupe de partage
     */
    async createEcoleWithGroupe(req: Request, res: Response): Promise<void> {
        try {
            const ecoleData = req.body;

            const ecole = await this.groupePartageService.createEcoleWithGroupe(ecoleData);

            res.status(201).json({
                message: 'École créée avec son groupe de partage',
                ecole
            });
        } catch (error: any) {
            console.error('Erreur lors de la création de l\'école:', error);
            res.status(400).json({
                message: 'Erreur lors de la création de l\'école',
                error: error.message
            });
        }
    }

    /**
     * Créer une filière avec son groupe de partage
     */
    async createFiliereWithGroupe(req: Request, res: Response): Promise<void> {
        try {
            const filiereData = req.body;

            const filiere = await this.groupePartageService.createFiliereWithGroupe(filiereData);

            res.status(201).json({
                message: 'Filière créée avec son groupe de partage',
                filiere
            });
        } catch (error: any) {
            console.error('Erreur lors de la création de la filière:', error);
            res.status(400).json({
                message: 'Erreur lors de la création de la filière',
                error: error.message
            });
        }
    }

    /**
     * Créer une classe avec son groupe de partage
     */
    async createClasseWithGroupe(req: Request, res: Response): Promise<void> {
        try {
            const classeData = req.body;

            const classe = await this.groupePartageService.createClasseWithGroupe(classeData);

            res.status(201).json({
                message: 'Classe créée avec son groupe de partage',
                classe
            });
        } catch (error: any) {
            console.error('Erreur lors de la création de la classe:', error);
            res.status(400).json({
                message: 'Erreur lors de la création de la classe',
                error: error.message
            });
        }
    }

    // ========== GESTION DES UTILISATEURS ==========

    /**
     * Ajouter un utilisateur à un groupe personnalisé
     */
    async addUserToCustomGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { userId, groupeId } = req.body;

            if (!userId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs userId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.addUserToCustomGroupe(userId, groupeId);

            res.status(200).json({
                message: 'Utilisateur ajouté au groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout de l\'utilisateur',
                error: error.message
            });
        }
    }

    /**
     * Ajouter plusieurs utilisateurs à un groupe
     */
    async addUsersToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { userIds, groupeId } = req.body;

            if (!userIds || !Array.isArray(userIds) || !groupeId) {
                res.status(400).json({
                    message: 'Les champs userIds (array) et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.addUsersToGroupe(userIds, groupeId);

            res.status(200).json({
                message: `${userIds.length} utilisateur(s) ajouté(s) au groupe avec succès`
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout des utilisateurs:', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout des utilisateurs',
                error: error.message
            });
        }
    }

    /**
     * Retirer un utilisateur d'un groupe
     */
    async removeUserFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { userId, groupeId } = req.body;

            if (!userId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs userId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.removeUserFromGroupe(userId, groupeId);

            res.status(200).json({
                message: 'Utilisateur retiré du groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors du retrait de l\'utilisateur:', error);
            res.status(400).json({
                message: 'Erreur lors du retrait de l\'utilisateur',
                error: error.message
            });
        }
    }

    /**
     * Retirer plusieurs utilisateurs d'un groupe
     */
    async removeUsersFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { userIds, groupeId } = req.body;

            if (!userIds || !Array.isArray(userIds) || !groupeId) {
                res.status(400).json({
                    message: 'Les champs userIds (array) et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.removeUsersFromGroupe(userIds, groupeId);

            res.status(200).json({
                message: `${userIds.length} utilisateur(s) retiré(s) du groupe avec succès`
            });
        } catch (error: any) {
            console.error('Erreur lors du retrait des utilisateurs:', error);
            res.status(400).json({
                message: 'Erreur lors du retrait des utilisateurs',
                error: error.message
            });
        }
    }

    // ========== GESTION DES ÉCOLES, FILIÈRES, CLASSES ==========

    /**
     * Ajouter une école à un groupe
     */
    async addEcoleToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { ecoleId, groupeId } = req.body;

            if (!ecoleId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs ecoleId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.addEcoleToGroupe(ecoleId, groupeId);

            res.status(200).json({
                message: 'École ajoutée au groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout de l\'école:', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout de l\'école',
                error: error.message
            });
        }
    }

    /**
     * Ajouter une filière à un groupe
     */
    async addFiliereToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { filiereId, groupeId } = req.body;

            if (!filiereId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs filiereId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.addFiliereToGroupe(filiereId, groupeId);

            res.status(200).json({
                message: 'Filière ajoutée au groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout de la filière:', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout de la filière',
                error: error.message
            });
        }
    }

    /**
     * Ajouter une classe à un groupe
     */
    async addClasseToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { classeId, groupeId } = req.body;

            if (!classeId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs classeId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.addClasseToGroupe(classeId, groupeId);

            res.status(200).json({
                message: 'Classe ajoutée au groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout de la classe:', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout de la classe',
                error: error.message
            });
        }
    }

    /**
     * Retirer une école d'un groupe
     */
    async removeEcoleFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { ecoleId, groupeId } = req.body;

            if (!ecoleId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs ecoleId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.removeEcoleFromGroupe(ecoleId, groupeId);

            res.status(200).json({
                message: 'École retirée du groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors du retrait de l\'école:', error);
            res.status(400).json({
                message: 'Erreur lors du retrait de l\'école',
                error: error.message
            });
        }
    }

    /**
     * Retirer une filière d'un groupe
     */
    async removeFiliereFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { filiereId, groupeId } = req.body;

            if (!filiereId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs filiereId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.removeFiliereFromGroupe(filiereId, groupeId);

            res.status(200).json({
                message: 'Filière retirée du groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors du retrait de la filière:', error);
            res.status(400).json({
                message: 'Erreur lors du retrait de la filière',
                error: error.message
            });
        }
    }

    /**
     * Retirer une classe d'un groupe
     */
    async removeClasseFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { classeId, groupeId } = req.body;

            if (!classeId || !groupeId) {
                res.status(400).json({
                    message: 'Les champs classeId et groupeId sont requis'
                });
                return;
            }

            await this.groupePartageService.removeClasseFromGroupe(classeId, groupeId);

            res.status(200).json({
                message: 'Classe retirée du groupe avec succès'
            });
        } catch (error: any) {
            console.error('Erreur lors du retrait de la classe:', error);
            res.status(400).json({
                message: 'Erreur lors du retrait de la classe',
                error: error.message
            });
        }
    }

    // ========== GROUPES PERSONNALISÉS ==========

    /**
     * Créer un groupe de partage personnalisé
     * Le propriétaire est automatiquement l'utilisateur connecté
     */
    async createCustomGroupe(req: Request, res: Response): Promise<void> {
        try {
            // Vérifier que l'utilisateur est authentifié
            if (!(req as any).user || !(req as any).userId) {
                res.status(401).json({
                    message: 'Utilisateur non authentifié',
                    error: 'NOT_AUTHENTICATED'
                });
                return;
            }

            const { groupeName, description, userIds } = req.body;

            if (!groupeName) {
                res.status(400).json({
                    message: 'Le champ groupeName est requis'
                });
                return;
            }

            const groupe = await this.groupePartageService.createCustomGroupe(
                groupeName,
                description || '',
                userIds || []
            );

            // Définir le propriétaire du groupe
            const groupeRepository = AppDataSource.getRepository(GroupePartage);
            groupe.owner = (req as any).user; // ✨ Utilisateur authentifié comme owner
            await groupeRepository.save(groupe);

            res.status(201).json({
                message: 'Groupe personnalisé créé avec succès',
                groupe: {
                    id: groupe.id,
                    name: groupe.groupeName,
                    description: groupe.description,
                    type: groupe.type,
                    owner: {
                        id: (req as any).user.id,
                        firstName: (req as any).user.firstName,
                        lastName: (req as any).user.lastName
                    },
                    createdAt: groupe.createdAt
                }
            });
        } catch (error: any) {
            console.error('Erreur lors de la création du groupe:', error);
            res.status(400).json({
                message: 'Erreur lors de la création du groupe',
                error: error.message
            });
        }
    }

    // ========== RÉCUPÉRATION ==========

    /**
     * Récupérer tous les groupes d'un enseignant
     */
    async getEnseignantGroupes(req: Request, res: Response): Promise<void> {
        try {
            const { enseignantId } = req.params;

            const groupes = await this.groupePartageService.getEnseignantGroupes(enseignantId);

            res.status(200).json({
                count: groupes.length,
                groupes
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des groupes:', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des groupes',
                error: error.message
            });
        }
    }

    /**
     * Récupérer tous les enseignants d'un groupe
     */
    async getEnseignantsInGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;

            const enseignants = await this.groupePartageService.getEnseignantsInGroupe(groupeId);

            res.status(200).json({
                count: enseignants.length,
                enseignants
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des enseignants:', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des enseignants',
                error: error.message
            });
        }
    }

    // ========== GESTION AVANCÉE (Membres, Publishers, Documents, Invitations) ==========

    /**
     * Ajouter un membre à un groupe (via ID dans URL)
     * POST /api/groupes-partage/:groupeId/members
     */
    async addMemberToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                res.status(400).json({ message: 'userId requis' });
                return;
            }

            await this.groupePartageService.addUserToCustomGroupe(userId, groupeId);
            res.status(200).json({ message: 'Membre ajouté avec succès' });
        } catch (error: any) {
            console.error('Erreur ajout membre:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Retirer un membre d'un groupe (via ID dans URL)
     * DELETE /api/groupes-partage/:groupeId/members/:userId
     */
    async removeMemberFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, userId } = req.params;
            await this.groupePartageService.removeUserFromGroupe(userId, groupeId);
            res.status(200).json({ message: 'Membre retiré avec succès' });
        } catch (error: any) {
            console.error('Erreur retrait membre:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Ajouter un éditeur (publisher)
     * POST /api/groupes-partage/:groupeId/publishers
     * Réservé au propriétaire du groupe
     */
    async addPublisher(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                res.status(400).json({ message: 'userId requis' });
                return;
            }

            // Vérifier que l'utilisateur est authentifié
            const requesterId = (req as any).user?.id;
            if (!requesterId) {
                res.status(401).json({ message: 'Authentification requise' });
                return;
            }

            await this.groupePartageService.addPublisher(groupeId, userId, requesterId);
            res.status(200).json({ message: 'Éditeur ajouté avec succès' });
        } catch (error: any) {
            console.error('Erreur ajout éditeur:', error);

            // Gérer les erreurs de permission
            if (error.message.includes('PERMISSION_DENIED')) {
                res.status(403).json({
                    message: 'Permission refusée',
                    error: 'Seul le propriétaire du groupe peut ajouter des éditeurs'
                });
                return;
            }

            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Générer une invitation
     * POST /api/groupes-partage/:groupeId/invitation
     */
    async generateInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;
            const { expiresInDays } = req.body;

            const result = await this.groupePartageService.generateInvitation(groupeId, expiresInDays || 7);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Erreur génération invitation:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Rejoindre via invitation
     * POST /api/groupes-partage/join
     */
    async joinByInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.body;
            // Assuming auth middleware populates req.user
            const userId = (req as any).user?.id;

            if (!token || !userId) {
                res.status(400).json({ message: 'Token et authentification requis' });
                return;
            }

            const groupe = await this.groupePartageService.joinByInvitation(token, userId);
            res.status(200).json({ message: 'Groupe rejoint avec succès', groupe });
        } catch (error: any) {
            console.error('Erreur rejoindre groupe:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Ajouter un document
     * POST /api/groupes-partage/:groupeId/documents
     */
    async addDocument(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;
            const { documentId, categoryId } = req.body;

            if (!documentId) {
                res.status(400).json({ message: 'documentId requis' });
                return;
            }

            await this.groupePartageService.addDocument(groupeId, documentId, categoryId);
            res.status(200).json({ message: 'Document ajouté avec succès' });
        } catch (error: any) {
            console.error('Erreur ajout document:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Retirer un document
     * DELETE /api/groupes-partage/:groupeId/documents/:documentId
     */
    async removeDocument(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, documentId } = req.params;
            await this.groupePartageService.removeDocument(groupeId, documentId);
            res.status(200).json({ message: 'Document retiré avec succès' });
        } catch (error: any) {
            console.error('Erreur retrait document:', error);
            res.status(400).json({ message: error.message });
        }
    }

    // ========== GESTION DES CATÉGORIES ==========

    /**
     * Récupérer les catégories d'un groupe
     * GET /api/groupes-partage/:groupeId/categories
     */
    async getGroupCategories(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;
            const categories = await this.groupePartageService.getGroupCategories(groupeId);
            res.status(200).json({ categories });
        } catch (error: any) {
            console.error('Erreur récupération catégories:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Créer une catégorie pour un groupe
     * POST /api/groupes-partage/:groupeId/categories
     */
    async createGroupCategory(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;
            const { categorieName, description } = req.body;
            const userId = (req as any).user?.id;

            if (!categorieName) {
                res.status(400).json({ message: 'categorieName requis' });
                return;
            }

            const category = await this.groupePartageService.createGroupCategory(
                groupeId,
                categorieName,
                description,
                userId
            );
            res.status(201).json(category);
        } catch (error: any) {
            console.error('Erreur création catégorie:', error);
            if (error.message.includes('PERMISSION_DENIED')) {
                res.status(403).json({
                    message: 'Permission refusée',
                    error: error.message
                });
                return;
            }
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Mettre à jour une catégorie
     * PUT /api/groupes-partage/:groupeId/categories/:categoryId
     */
    async updateGroupCategory(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, categoryId } = req.params;
            const { categorieName, description } = req.body;

            if (!categorieName) {
                res.status(400).json({ message: 'categorieName requis' });
                return;
            }

            const category = await this.groupePartageService.updateGroupCategory(
                groupeId,
                categoryId,
                categorieName,
                description
            );
            res.status(200).json(category);
        } catch (error: any) {
            console.error('Erreur mise à jour catégorie:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * Supprimer une catégorie
     * DELETE /api/groupes-partage/:groupeId/categories/:categoryId
     */
    async deleteGroupCategory(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, categoryId } = req.params;
            await this.groupePartageService.deleteGroupCategory(groupeId, categoryId);
            res.status(200).json({ message: 'Catégorie supprimée avec succès' });
        } catch (error: any) {
            console.error('Erreur suppression catégorie:', error);
            res.status(400).json({ message: error.message });
        }
    }
}