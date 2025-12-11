import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Ecole } from "../entity/ecole";
import { UserRole } from "../entity/user";
import { GroupePartageService } from "../services/GroupePartageService";
import { formatErrorResponse } from "../util/helper";

export class EcoleController {
    private ecoleRepository = AppDataSource.getRepository(Ecole);
    private groupePartageService = new GroupePartageService();

    // Créer une école avec son groupe de partage
    async createEcole(req: any, res: any): Promise<void> {
        try {
            const { schoolName, address, schoolEmail, schoolPhone, schoolAdmin } = req.body;

            // Validation
            if (!schoolName || !schoolEmail || !schoolAdmin) {
                return res.status(400).json({
                    message: 'Les champs schoolName, schoolEmail et schoolAdmin sont requis'
                });
            }

            // Créer l'école avec son groupe de partage
            const ecole = await this.groupePartageService.createEcoleWithGroupe({
                schoolName,
                address,
                schoolEmail,
                schoolPhone,
                schoolAdmin
            });

            res.status(201).json({
                message: 'École créée avec succès',
                ecole
            });
        } catch (error) {
            console.error('Erreur lors de la création de l\'école:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer toutes les écoles
    async getEcoles(req: any, res: any): Promise<void> {
        try {
            const user = req.user;
            console.log('getEcoles debug:', {
                userExists: !!user,
                userId: user?.id,
                userRole: user?.role,
                UserRoleEnum: UserRole
            });

            let where: any = {};

            // Si l'utilisateur est un ADMIN, il ne voit que les écoles qu'il administre
            // Use string comparison 'admin' to avoid potential cyclic dependency issues with UserRole enum
            if (user && (user.role === UserRole.ADMIN || (user.role as string) === 'admin')) {
                console.log('Filtering schools for Admin:', user.id);
                where = { schoolAdmin: { id: user.id } };
            }

            const ecoles = await this.ecoleRepository.find({
                where,
                relations: ['groupePartage', 'groupePartage.users', 'filieres', 'filieres.classes', 'students'],
                order: { createdAt: 'DESC' }
            });

            res.status(200).json({
                count: ecoles.length,
                ecoles
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer une école par son ID
    async getEcoleById(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const ecole = await this.ecoleRepository.findOne({
                where: { id },
                relations: ['groupePartage', 'groupePartage.users', 'filieres', 'filieres.classes', 'students']
            });

            if (!ecole) {
                return res.status(404).json({ message: 'École non trouvée' });
            }

            res.status(200).json({ ecole });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Synchroniser le groupe de partage d'une école
    async syncEcoleGroupe(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;

            await this.groupePartageService.syncEcoleGroupePartage(id);

            res.status(200).json({
                message: 'Groupe de partage synchronisé avec succès'
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json(formatErrorResponse(error));
        }
    }

    // Mettre à jour une école
    async updateEcole(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const { schoolName, address, schoolEmail, schoolPhone, isActive } = req.body;

            const ecole = await this.ecoleRepository.findOne({ where: { id } });

            if (!ecole) {
                return res.status(404).json({ message: 'École non trouvée' });
            }

            // Mettre à jour les champs
            if (schoolName) ecole.schoolName = schoolName;
            if (address) ecole.address = address;
            if (schoolEmail) ecole.schoolEmail = schoolEmail;
            if (schoolPhone) ecole.schoolPhone = schoolPhone;
            if (isActive !== undefined) ecole.isActive = isActive;

            await this.ecoleRepository.save(ecole);

            res.status(200).json({
                message: 'École mise à jour avec succès',
                ecole
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Supprimer une école
    async deleteEcole(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const ecole = await this.ecoleRepository.findOne({
                where: { id },
                relations: ['groupePartage']
            });

            if (!ecole) {
                return res.status(404).json({ message: 'École non trouvée' });
            }

            await this.ecoleRepository.remove(ecole);

            res.status(200).json({ message: 'École supprimée avec succès' });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }


    async addEcoleToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, ecoleId } = req.params;

            await this.groupePartageService.addEcoleToGroupe(ecoleId, groupeId);

            res.json({ message: 'École ajoutée au groupe avec succès' });
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'école au groupe:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de l\'école au groupe' });
        }
    }


    async removeEcoleFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, ecoleId } = req.params;

            await this.groupePartageService.removeEcoleFromGroupe(ecoleId, groupeId);

            res.json({ message: 'École retirée du groupe avec succès' });
        } catch (error) {
            console.error('Erreur lors du retrait de l\'école du groupe:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors du retrait de l\'école du groupe' });
        }
    }

    /**
     * Synchroniser le groupe de partage d'une école
     * POST /api/users/groupes/sync/ecole/:ecoleId
     */
    async syncEcoleGroupePartage(req: Request, res: Response): Promise<void> {
        try {
            const { ecoleId } = req.params;

            await this.groupePartageService.syncEcoleGroupePartage(ecoleId);

            res.json({ message: 'Groupe de l\'école synchronisé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la synchronisation du groupe de l\'école:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de la synchronisation du groupe de l\'école' });
        }
    }

}