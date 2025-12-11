import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Matiere } from "../entity/matiere";
import { Class } from "../entity/classe";
import { Document } from "../entity/document";
import { GroupePartageService } from "../services/GroupePartageService";
import { UserRole } from "../entity/user";

export class MatiereController {

    private matiereRepository = AppDataSource.getRepository(Matiere);
    private classeRepository = AppDataSource.getRepository(Class);
    private groupePartageService = new GroupePartageService();

    /**
     * Récupérer toutes les matières avec filtrage optionnel
     * GET /api/matieres
     * Query params: classeId (optionnel)
     */
    async getMatieres(req: Request, res: Response): Promise<void> {
        try {
            const { classeId } = req.query;

            // Construction dynamique de la requête
            const queryBuilder = this.matiereRepository.createQueryBuilder('matiere')
                .leftJoinAndSelect('matiere.classe', 'classe')
                .leftJoinAndSelect('matiere.documents', 'documents')
                .leftJoinAndSelect('matiere.enseignementAssignments', 'enseignementAssignments')
                .orderBy('matiere.createdAt', 'DESC');

            // JOINS nécessaires pour vérifier l'école de la classe -> filière -> école
            // On fait des leftJoin (sans select si on veut pas polluer le résultat, ou avec select si utile)
            // Ici le filtrage suffit.
            queryBuilder.leftJoin('classe.filiere', 'filiere')
                .leftJoin('filiere.school', 'school');


            // Si l'utilisateur est un ADMIN, il ne voit que les matières des classes de ses écoles
            const user = (req as any).user;
            if (user && (user.role === UserRole.ADMIN || user.role === 'admin')) {
                queryBuilder.innerJoin('school.schoolAdmin', 'admin', 'admin.id = :adminId', { adminId: user.id });
            }

            // Filtrer par classe si spécifié
            if (classeId) {
                queryBuilder.andWhere('classe.id = :classeId', { classeId });
            }

            const matieres = await queryBuilder.getMany();

            res.status(200).json({
                count: matieres.length,
                matieres
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des matières:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des matières' });
        }
    }

    /**
     * Récupérer une matière par son ID
     * GET /api/matieres/:id
     */
    async getMatiereById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const matiere = await this.matiereRepository.findOne({
                where: { id },
                relations: ['classe', 'classe.filiere', 'classe.filiere.school', 'documents', 'enseignementAssignments']
            });

            if (!matiere) {
                res.status(404).json({ message: 'Matière non trouvée' });
                return;
            }

            res.status(200).json({ matiere });
        } catch (error) {
            console.error('Erreur lors de la récupération de la matière:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération de la matière' });
        }
    }

    /**
     * Récupérer tous les documents d'une matière
     * GET /api/matieres/:id/documents
     */
    async getDocumentsByMatiere(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const matiere = await this.matiereRepository.findOne({
                where: { id },
                relations: ['documents', 'documents.addedBy', 'documents.category']
            });

            if (!matiere) {
                res.status(404).json({ message: 'Matière non trouvée' });
                return;
            }

            res.status(200).json({
                count: matiere.documents?.length || 0,
                documents: matiere.documents || []
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des documents:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
        }
    }

    /**
     * Créer une nouvelle matière
     * POST /api/matieres
     */
    async createMatiere(req: Request, res: Response): Promise<void> {
        try {
            const { matiereName, classeId, description, matiereCode } = req.body;
            const user = (req as any).user;

            if (!matiereName || !classeId) {
                res.status(400).json({
                    message: 'Les champs matiereName et classeId sont requis'
                });
                return;
            }

            // Vérifier que l'utilisateur est authentifié
            if (!user) {
                res.status(401).json({ message: 'Utilisateur non authentifié' });
                return;
            }

            // Vérifier que la classe existe et charger ses relations
            const classe = await this.classeRepository.findOne({
                where: { id: classeId },
                relations: ['filiere', 'filiere.school']
            });

            if (!classe) {
                res.status(404).json({ message: 'Classe non trouvée' });
                return;
            }

            // Vérifier que l'admin a une école et qu'elle correspond
            if (user.role === UserRole.ADMIN) {
                if (!user.school || !user.school.id) {
                    res.status(403).json({
                        message: 'Vous devez être associé à une école pour créer une matière',
                        error: 'NO_SCHOOL_ASSIGNED'
                    });
                    return;
                }

                const classeSchoolId = classe.filiere?.school?.id;
                if (!classeSchoolId || classeSchoolId !== user.school.id) {
                    res.status(403).json({
                        message: 'Cette classe n\'appartient pas à votre école',
                        error: 'NOT_YOUR_SCHOOL'
                    });
                    return;
                }
            }

            // Créer la matière avec son groupe de partage et auto-enroll les étudiants
            const matiereData = {
                matiereName,
                description,
                matiereCode,
                classe
            };

            const newMatiere = await this.groupePartageService.createMatiereWithGroupe(matiereData, classeId);

            res.status(201).json({
                message: 'Matière créée avec succès. Groupe de partage créé et étudiants inscrits automatiquement.',
                matiere: newMatiere
            });
        } catch (error) {
            console.error('Erreur lors de la création de la matière:', error);
            res.status(500).json({ message: 'Erreur lors de la création de la matière' });
        }
    }

    /**
     * Mettre à jour une matière
     * PUT /api/matieres/:id
     */
    async updateMatiere(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { matiereName, description, matiereCode, isActive } = req.body;

            const matiere = await this.matiereRepository.findOne({
                where: { id },
                relations: ['classe']
            });

            if (!matiere) {
                res.status(404).json({ message: 'Matière non trouvée' });
                return;
            }

            // Mettre à jour les champs si fournis
            if (matiereName !== undefined) matiere.matiereName = matiereName;
            if (description !== undefined) matiere.description = description;
            if (matiereCode !== undefined) matiere.matiereCode = matiereCode;
            if (isActive !== undefined) matiere.isActive = isActive;

            await this.matiereRepository.save(matiere);

            res.status(200).json({
                message: 'Matière mise à jour avec succès',
                matiere
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la matière:', error);
            res.status(500).json({ message: 'Erreur lors de la mise à jour de la matière' });
        }
    }

    /**
     * Supprimer une matière
     * DELETE /api/matieres/:id
     */
    async deleteMatiere(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const matiere = await this.matiereRepository.findOne({
                where: { id },
                relations: ['documents']
            });

            if (!matiere) {
                res.status(404).json({ message: 'Matière non trouvée' });
                return;
            }

            // Supprimer les documents associés si nécessaire
            if (matiere.documents && matiere.documents.length > 0) {
                await AppDataSource.getRepository(Document).remove(matiere.documents);
            }

            // Supprimer la matière
            await this.matiereRepository.remove(matiere);

            res.status(200).json({ message: 'Matière supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la matière:', error);
            res.status(500).json({ message: 'Erreur lors de la suppression de la matière' });
        }
    }
}
