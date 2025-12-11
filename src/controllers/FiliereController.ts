import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Filiere } from "../entity/filiere";
import { Ecole } from "../entity/ecole";
import { GroupePartageService } from "../services/GroupePartageService";
import { formatErrorResponse } from "../util/helper";
import { UserRole } from "../entity/user";

export class FiliereController {
    private filiereRepository = AppDataSource.getRepository(Filiere);
    private ecoleRepository = AppDataSource.getRepository(Ecole);
    private groupePartageService = new GroupePartageService();

    // Créer une filière avec son groupe de partage
    async createFiliere(req: any, res: any): Promise<void> {
        try {
            const { name, description, ecoleId } = req.body;
            const user = (req as any).user;

            if (!name || !ecoleId) {
                return res.status(400).json({
                    message: 'Les champs name et ecoleId sont requis'
                });
            }

            // Vérifier que l'utilisateur est authentifié
            if (!user) {
                return res.status(401).json({ message: 'Utilisateur non authentifié' });
            }

            // Vérifier que l'école existe
            const ecole = await this.ecoleRepository.findOne({ where: { id: ecoleId } });
            if (!ecole) {
                return res.status(404).json({ message: 'École non trouvée' });
            }

            // Vérifier que l'admin a une école et qu'elle correspond
            if (user.role === UserRole.ADMIN) {
                if (!user.school || !user.school.id) {
                    return res.status(403).json({
                        message: 'Vous devez être associé à une école pour créer une filière',
                        error: 'NO_SCHOOL_ASSIGNED'
                    });
                }

                if (ecoleId !== user.school.id) {
                    return res.status(403).json({
                        message: 'Vous ne pouvez créer une filière que dans votre propre école',
                        error: 'NOT_YOUR_SCHOOL'
                    });
                }
            }

            // Créer la filière avec son groupe de partage
            const filiere = await this.groupePartageService.createFiliereWithGroupe({
                name,
                description,
                school: ecole
            });

            // Synchroniser le groupe de partage de l'école
            await this.groupePartageService.syncEcoleGroupePartage(ecoleId);

            res.status(201).json({
                message: 'Filière créée avec succès',
                filiere
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer toutes les filières
    async getFilieres(req: any, res: any): Promise<void> {
        try {
            const user = req.user;
            let where: any = {};

            // Si l'utilisateur est un ADMIN, il ne voit que les filières de ses écoles
            if (user && (user.role === UserRole.ADMIN || user.role === 'admin')) {
                where = { school: { schoolAdmin: { id: user.id } } };
            }

            const filieres = await this.filiereRepository.find({
                where,
                relations: ['groupePartage', 'groupePartage.users', 'school', 'classes'],
                order: { createdAt: 'DESC' }
            });

            res.status(200).json({
                count: filieres.length,
                filieres
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer une filière par son ID
    async getFiliereById(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const filiere = await this.filiereRepository.findOne({
                where: { id },
                relations: ['groupePartage', 'groupePartage.users', 'school', 'classes']
            });

            if (!filiere) {
                return res.status(404).json({ message: 'Filière non trouvée' });
            }

            res.status(200).json({ filiere });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Synchroniser le groupe de partage d'une filière
    async syncFiliereGroupe(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;

            await this.groupePartageService.syncFiliereGroupePartage(id);

            res.status(200).json({
                message: 'Groupe de partage synchronisé avec succès'
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json(formatErrorResponse(error));
        }
    }

    // Mettre à jour une filière
    async updateFiliere(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            const filiere = await this.filiereRepository.findOne({ where: { id } });

            if (!filiere) {
                return res.status(404).json({ message: 'Filière non trouvée' });
            }

            if (name) filiere.name = name;
            if (description) filiere.description = description;

            await this.filiereRepository.save(filiere);

            res.status(200).json({
                message: 'Filière mise à jour avec succès',
                filiere
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Supprimer une filière
    async deleteFiliere(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const filiere = await this.filiereRepository.findOne({
                where: { id },
                relations: ['groupePartage', 'school']
            });

            if (!filiere) {
                return res.status(404).json({ message: 'Filière non trouvée' });
            }

            const ecoleId = filiere.school.id;
            await this.filiereRepository.remove(filiere);

            // Re-synchroniser le groupe de l'école
            await this.groupePartageService.syncEcoleGroupePartage(ecoleId);

            res.status(200).json({ message: 'Filière supprimée avec succès' });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }


    /**
     * Ajouter une filière à un groupe
     * POST /api/users/groupes/:groupeId/filieres/:filiereId
     */
    async addFiliereToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, filiereId } = req.params;

            await this.groupePartageService.addFiliereToGroupe(filiereId, groupeId);

            res.json({ message: 'Filière ajoutée au groupe avec succès' });
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la filière au groupe:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de la filière au groupe' });
        }
    }

    /**
     * Retirer une filière d'un groupe
     * DELETE /api/users/groupes/:groupeId/filieres/:filiereId
     */
    async removeFiliereFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, filiereId } = req.params;

            await this.groupePartageService.removeFiliereFromGroupe(filiereId, groupeId);

            res.json({ message: 'Filière retirée du groupe avec succès' });
        } catch (error) {
            console.error('Erreur lors du retrait de la filière du groupe:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors du retrait de la filière du groupe' });
        }
    }

    /**
     * Synchroniser le groupe de partage d'une filière
     * POST /api/users/groupes/sync/filiere/:filiereId
     */
    async syncFiliereGroupePartage(req: Request, res: Response): Promise<void> {
        try {
            const { filiereId } = req.params;

            await this.groupePartageService.syncFiliereGroupePartage(filiereId);

            res.json({ message: 'Groupe de la filière synchronisé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la synchronisation du groupe de la filière:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de la synchronisation du groupe de la filière' });
        }
    }
}