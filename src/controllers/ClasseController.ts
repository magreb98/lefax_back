import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Class } from "../entity/classe";
import { Filiere } from "../entity/filiere";
import { GroupePartageService } from "../services/GroupePartageService";
import { formatErrorResponse } from "../util/helper";
import { UserRole } from "../entity/user";

export class ClasseController {
    private classeRepository = AppDataSource.getRepository(Class);
    private filiereRepository = AppDataSource.getRepository(Filiere);
    private groupePartageService = new GroupePartageService();

    // Créer une classe avec son groupe de partage
    async createClasse(req: any, res: any): Promise<void> {
        try {
            const { className, filiereId } = req.body;
            const user = (req as any).user;

            if (!className || !filiereId) {
                return res.status(400).json({
                    message: 'Les champs className et filiereId sont requis'
                });
            }

            // Vérifier que l'utilisateur est authentifié
            if (!user) {
                return res.status(401).json({ message: 'Utilisateur non authentifié' });
            }

            // Vérifier que la filière existe
            const filiere = await this.filiereRepository.findOne({
                where: { id: filiereId },
                relations: ['school']
            });

            if (!filiere) {
                return res.status(404).json({ message: 'Filière non trouvée' });
            }

            // Vérifier que l'admin a une école et qu'elle correspond
            if (user.role === UserRole.ADMIN) {
                if (!user.school || !user.school.id) {
                    return res.status(403).json({
                        message: 'Vous devez être associé à une école pour créer une classe',
                        error: 'NO_SCHOOL_ASSIGNED'
                    });
                }

                const filiereSchoolId = filiere.school?.id;
                if (!filiereSchoolId || filiereSchoolId !== user.school.id) {
                    return res.status(403).json({
                        message: 'Cette filière n\'appartient pas à votre école',
                        error: 'NOT_YOUR_SCHOOL'
                    });
                }
            }

            // Créer la classe avec son groupe de partage
            const classe = await this.groupePartageService.createClasseWithGroupe({
                className,
                filiere
            });

            // Synchroniser les groupes de partage de la filière et de l'école
            await this.groupePartageService.syncFiliereGroupePartage(filiereId);
            if (filiere.school) {
                await this.groupePartageService.syncEcoleGroupePartage(filiere.school.id);
            }

            res.status(201).json({
                message: 'Classe créée avec succès',
                classe
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer toutes les classes avec filtrage optionnel
    async getClasses(req: any, res: any): Promise<void> {
        try {
            const { filiereId, ecoleId } = req.query;

            // Construction dynamique de la requête
            const queryBuilder = this.classeRepository.createQueryBuilder('classe')
                .leftJoinAndSelect('classe.groupePartage', 'groupePartage')
                .leftJoinAndSelect('groupePartage.users', 'users')
                .leftJoinAndSelect('classe.filiere', 'filiere')
                .leftJoinAndSelect('filiere.school', 'school')
                .leftJoinAndSelect('classe.etudiants', 'etudiants')
                .leftJoinAndSelect('classe.matieres', 'matieres')
                .orderBy('classe.createdAt', 'DESC');

            // Si l'utilisateur est un ADMIN, il ne voit que les classes de ses écoles
            const user = req.user;
            if (user && (user.role === UserRole.ADMIN || user.role === 'admin')) {
                // On s'assure que l'école de la filière est gérée par cet admin
                // school est l'alias pour filiere.school
                queryBuilder.innerJoin('school.schoolAdmin', 'admin', 'admin.id = :adminId', { adminId: user.id });

            } else if (user && (user.role === UserRole.ENSEIGNANT || user.role === 'enseignant')) {
                // Si l'utilisateur est un ENSEIGNANT, il ne voit que les classes où il enseigne
                queryBuilder.innerJoin('classe.enseignementAssignments', 'enseignement')
                    .where('enseignement.enseignant_id = :teacherId', { teacherId: user.id });
            }

            // Filtrer par filière si spécifié
            if (filiereId) {
                queryBuilder.andWhere('filiere.id = :filiereId', { filiereId });
            }

            // Filtrer par école si spécifié
            if (ecoleId) {
                queryBuilder.andWhere('school.id = :ecoleId', { ecoleId });
            }

            const classes = await queryBuilder.getMany();

            res.status(200).json({
                count: classes.length,
                classes
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer une classe par son ID
    async getClasseById(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const classe = await this.classeRepository.findOne({
                where: { id },
                relations: ['groupePartage', 'groupePartage.users', 'filiere', 'matieres']
            });

            if (!classe) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            res.status(200).json({ classe });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Synchroniser le groupe de partage d'une classe
    async syncClasseGroupe(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;

            await this.groupePartageService.syncClasseGroupePartage(id);

            res.status(200).json({
                message: 'Groupe de partage synchronisé avec succès'
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json(formatErrorResponse(error));
        }
    }

    // Mettre à jour une classe
    async updateClasse(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const { className } = req.body;

            const classe = await this.classeRepository.findOne({ where: { id } });

            if (!classe) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            if (className) classe.className = className;

            await this.classeRepository.save(classe);

            res.status(200).json({
                message: 'Classe mise à jour avec succès',
                classe
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Supprimer une classe
    async deleteClasse(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const classe = await this.classeRepository.findOne({
                where: { id },
                relations: ['groupePartage', 'filiere', 'filiere.school']
            });

            if (!classe) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            const filiereId = classe.filiere.id;
            const ecoleId = classe.filiere.school?.id;

            await this.classeRepository.remove(classe);

            // Re-synchroniser les groupes de la filière et de l'école
            await this.groupePartageService.syncFiliereGroupePartage(filiereId);
            if (ecoleId) {
                await this.groupePartageService.syncEcoleGroupePartage(ecoleId);
            }

            res.status(200).json({ message: 'Classe supprimée avec succès' });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    /**
     * Récupérer tous les étudiants d'une classe
     * GET /api/classes/:id/students
     */
    async getStudentsByClasse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const classe = await this.classeRepository.findOne({
                where: { id },
                relations: ['etudiants', 'etudiants.classe']
            });

            if (!classe) {
                res.status(404).json({ message: 'Classe non trouvée' });
                return;
            }

            res.status(200).json({
                count: classe.etudiants?.length || 0,
                students: classe.etudiants || []
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des étudiants:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    /**
     * Récupérer toutes les matières d'une classe
     * GET /api/classes/:id/matieres
     */
    async getMatieresByClasse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const classe = await this.classeRepository.findOne({
                where: { id },
                relations: ['matieres', 'matieres.documents']
            });

            if (!classe) {
                res.status(404).json({ message: 'Classe non trouvée' });
                return;
            }

            res.status(200).json({
                count: classe.matieres?.length || 0,
                matieres: classe.matieres || []
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des matières:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    /**
     * Promouvoir un étudiant comme délégué de classe
     * POST /api/classes/:classeId/delegate/:userId
     */
    async setDelegate(req: Request, res: Response): Promise<void> {
        try {
            const { classeId, userId } = req.params;
            const userRepository = AppDataSource.getRepository(require('../entity/user').User);

            // Vérifier que la classe existe
            const classe = await this.classeRepository.findOne({
                where: { id: classeId }
            });

            if (!classe) {
                res.status(404).json({ message: 'Classe non trouvée' });
                return;
            }

            // Vérifier que l'utilisateur existe et est étudiant de cette classe
            const user = await userRepository.findOne({
                where: { id: userId },
                relations: ['classe']
            });

            if (!user) {
                res.status(404).json({ message: 'Utilisateur non trouvé' });
                return;
            }

            if (!user.classe || user.classe.id !== classeId) {
                res.status(400).json({
                    message: 'L\'utilisateur n\'est pas étudiant de cette classe'
                });
            }

            // Promouvoir comme délégué
            user.isDelegate = true;
            await userRepository.save(user);

            res.status(200).json({
                message: 'Étudiant promu comme délégué avec succès',
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isDelegate: user.isDelegate
                }
            });
        } catch (error) {
            console.error('Erreur lors de la promotion du délégué:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    /**
     * Révoquer le statut de délégué d'un étudiant
     * DELETE /api/classes/:classeId/delegate/:userId
     */
    async removeDelegate(req: Request, res: Response): Promise<void> {
        try {
            const { classeId, userId } = req.params;
            const userRepository = AppDataSource.getRepository(require('../entity/user').User);

            // Vérifier que la classe existe
            const classe = await this.classeRepository.findOne({
                where: { id: classeId }
            });

            if (!classe) {
                res.status(404).json({ message: 'Classe non trouvée' });
                return;
            }

            // Vérifier que l'utilisateur existe
            const user = await userRepository.findOne({
                where: { id: userId },
                relations: ['classe']
            });

            if (!user) {
                res.status(404).json({ message: 'Utilisateur non trouvé' });
                return;
            }

            if (!user.classe || user.classe.id !== classeId) {
                res.status(400).json({
                    message: 'L\'utilisateur n\'est pas étudiant de cette classe'
                });
                return;
            }

            // Révoquer le statut de délégué
            user.isDelegate = false;
            await userRepository.save(user);

            res.status(200).json({
                message: 'Statut de délégué révoqué avec succès',
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isDelegate: user.isDelegate
                }
            });
        } catch (error) {
            console.error('Erreur lors de la révocation du délégué:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    /**
      * Ajouter une classe à un groupe
      * POST /api/users/groupes/:groupeId/classes/:classeId
      */
    async addClasseToGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, classeId } = req.params;

            await this.groupePartageService.addClasseToGroupe(classeId, groupeId);

            res.json({ message: 'Classe ajoutée au groupe avec succès' });
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la classe au groupe:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de la classe au groupe' });
        }
    }

    /**
     * Retirer une classe d'un groupe
     * DELETE /api/users/groupes/:groupeId/classes/:classeId
     */
    async removeClasseFromGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId, classeId } = req.params;

            await this.groupePartageService.removeClasseFromGroupe(classeId, groupeId);

            res.json({ message: 'Classe retirée du groupe avec succès' });
        } catch (error) {
            console.error('Erreur lors du retrait de la classe du groupe:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors du retrait de la classe du groupe' });
        }
    }

    /**
     * Synchroniser le groupe de partage d'une classe
     * POST /api/users/groupes/sync/classe/:classeId
     */
    async syncClasseGroupePartage(req: Request, res: Response): Promise<void> {
        try {
            const { classeId } = req.params;

            await this.groupePartageService.syncClasseGroupePartage(classeId);

            res.json({ message: 'Groupe de la classe synchronisé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la synchronisation du groupe de la classe:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de la synchronisation du groupe de la classe' });
        }
    }
}