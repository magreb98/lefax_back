import { Request, Response } from 'express';
import { GroupePartageService } from '../services/GroupePartageService';
import { TypeGroupePartage, GroupePartage } from '../entity/groupe.partage';
import { AppDataSource } from '../config/database';

export class GroupePartageController {
    private groupePartageService = new GroupePartageService();

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

            const { name, description, userIds } = req.body;

            if (!name) {
                res.status(400).json({
                    message: 'Le champ name est requis'
                });
                return;
            }

            const groupe = await this.groupePartageService.createCustomGroupe(
                name,
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
                    name: groupe.name,
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
}