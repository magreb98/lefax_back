import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Matiere } from "../entity/matiere";
import { Class } from "../entity/classe";
import { Document } from "../entity/document";

export class MatiereController {

    private matiereRepository = AppDataSource.getRepository(Matiere);
    private classeRepository = AppDataSource.getRepository(Class);

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

            if (!matiereName || !classeId) {
                res.status(400).json({
                    message: 'Les champs matiereName et classeId sont requis'
                });
                return;
            }

            // Vérifier que la classe existe
            const classe = await this.classeRepository.findOne({
                where: { id: classeId },
                relations: ['filiere']
            });

            if (!classe) {
                res.status(404).json({ message: 'Classe non trouvée' });
                return;
            }

            // Créer la matière
            const newMatiere = this.matiereRepository.create({
                matiereName,
                classe,
                description,
                matiereCode
            });

            await this.matiereRepository.save(newMatiere);

            res.status(201).json({
                message: 'Matière créée avec succès',
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
