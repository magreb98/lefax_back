import { Request, Response } from 'express';
import { AppDataSource } from "../config/database";
import { DocumentCategorie } from "../entity/document.categorie";

export class CategoryController {

    private categoryRepository = AppDataSource.getRepository(DocumentCategorie);

    async getCategories(req: Request, res: Response): Promise<void> {
        try {
            const categories = await this.categoryRepository.find({
                relations: ['documents']
            });
            res.json(categories);
        } catch (error) {
            console.error('Erreur lors de la récupération des catégories :', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
        }
    }

    async createCategory(req: Request, res: Response): Promise<void> {
        try {
            const { categorieName } = req.body;
            const newCategory = this.categoryRepository.create({ categorieName });
            await this.categoryRepository.save(newCategory);
            res.status(201).json(newCategory);
        } catch (error) {
            console.error('Erreur lors de la création de la catégorie :', error);
            res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
        }
    }

    async deleteCategory(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const category = await this.categoryRepository.findOne({ where: { id } });
            if (!category) {
                res.status(404).json({ message: 'Catégorie non trouvée' });
                return;
            }
            await this.categoryRepository.remove(category);
            res.status(204).send();
        } catch (error) {
            console.error('Erreur lors de la suppression de la catégorie :', error);
            res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
        }
    }

    async updateCategory(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { categorieName } = req.body;
            const category = await this.categoryRepository.findOne({ where: { id } });
            if (!category) {
                res.status(404).json({ message: 'Catégorie non trouvée' });
                return;
            }
            category.categorieName = categorieName;
            await this.categoryRepository.save(category);
            res.json(category);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la catégorie :', error);
            res.status(500).json({ message: 'Erreur lors de la mise à jour de la catégorie' });
        }
    }

    async getCategoryById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const category = await this.categoryRepository.findOne({ where: { id } });
            if (!category) {
                res.status(404).json({ message: 'Catégorie non trouvée' });
                return;
            }
            res.json(category);
        } catch (error) {
            console.error('Erreur lors de la récupération de la catégorie :', error);
            res.status(500).json({ message: 'Erreur lors de la récupération de la catégorie' });
        }
    }
}
