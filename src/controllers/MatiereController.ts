import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Matiere } from "../entity/matiere";
import { Class } from "../entity/classe";
import { Document } from "../entity/document";

export class MatiereController {

    private matiereRepository = AppDataSource.getRepository(Matiere);

    async getMatieres(req: Request, res: Response): Promise<void> {
        try {
            const matieres = await this.matiereRepository.find({
                relations: ['classe', 'documents'],
            });
            res.json(matieres);
        } catch (error) {
            console.error('Erreur lors de la récupération des matières :', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des matières' });
        }
    }

    // Méthode pour créer une nouvelle matière
    async createMatiere(req: Request, res: Response): Promise<void> {
        try {
            const { matiereName, classId } = req.body;

            // Vérifier si la classe existe
            const classe = await AppDataSource.getRepository(Class).findOne({ where: { id: classId } });
            if (!classe) {
                res.status(404).json({ message: 'Classe non trouvée' });
                return;
            }

            // Créer une nouvelle matière
            const newMatiere = this.matiereRepository.create({
                matiereName,
                classe,
            });

            await this.matiereRepository.save(newMatiere);
            res.status(201).json(newMatiere);
        } catch (error) {
            console.error('Erreur lors de la création de la matière :', error);
            res.status(500).json({ message: 'Erreur lors de la création de la matière' });
        }
    }

    async updateMatiere(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { matiereName, classId } = req.body;

            // Trouver la matière existante
            const matiere = await this.matiereRepository.findOne({
                where: { id },
                relations: ['classe', 'documents'],
            });
            if (!matiere) {
                res.status(404).json({ message: 'Matière non trouvée' });
                return;
            }

            // Mettre à jour le nom de la matière
            if (matiereName) matiere.matiereName = matiereName;

            // Mettre à jour la classe si nécessaire
            if (classId) {
                const classe = await AppDataSource.getRepository(Class).findOne({ where: { id: classId } });
                if (!classe) {
                    res.status(404).json({ message: 'Classe non trouvée' });
                    return;
                }
                matiere.classe = classe;
            }

            await this.matiereRepository.save(matiere);
            res.status(200).json({ message: 'Matière mise à jour avec succès', matiere });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la matière :', error);
            res.status(500).json({ message: 'Erreur lors de la mise à jour de la matière' });
        }
    }

    // Méthode pour supprimer une matière
    async deleteMatiere(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const matiere = await this.matiereRepository.findOne({ where: { id }, relations: ['documents'] });

            if (!matiere) {
                res.status(404).json({ message: 'Matière non trouvée' });
                return;
            }

            // Supprimer les documents associés à la matière
            await AppDataSource.getRepository(Document).remove(matiere.documents);

            // Supprimer la matière
            await this.matiereRepository.remove(matiere);
            res.status(200).json({ message: 'Matière supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la matière :', error);
            res.status(500).json({ message: 'Erreur lors de la suppression de la matière' });
        }
    }
}
