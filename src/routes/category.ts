import { Router } from "express";
import { CategoryController } from "../controllers/CategoryController"; 
import { validateDto } from '../middleware/validateDto';
import { CreateCategoryDto } from '../dtos/category.dto';

const router = Router();
const categoryController = new CategoryController();

/**
 * @swagger
 * /api/category:
 *   get:
 *     tags:
 *       - Catégories
 *     summary: Récupérer toutes les catégories
 *     description: Retourne une liste de toutes les catégories disponibles.
 *     responses:
 *       200:
 *         description: Liste des catégories récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */

/**
 * GET /api/category
 * Récupérer toutes les catégories de documents
 */
router.get("/", categoryController.getCategories.bind(categoryController));

/**
 * POST /api/category
 * Créer une nouvelle catégorie
 */
router.post("/", validateDto(CreateCategoryDto), categoryController.createCategory.bind(categoryController));

/**
 * DELETE /api/category/:id
 * Supprimer une catégorie
 * Params:
 * - id: string (requis) - ID de la catégorie
 */
router.delete("/:id", categoryController.deleteCategory.bind(categoryController));

/**
 * PUT /api/category/:id
 * Mettre à jour une catégorie
 * Params:
 * - id: string (requis) - ID de la catégorie
 * Body:
 * - name: string (optionnel) - Nouveau nom de la catégorie
 * - description: string (optionnel) - Nouvelle description
 */
router.put("/:id", categoryController.updateCategory.bind(categoryController));

/**
 * GET /api/category/:id
 * Récupérer une catégorie par son ID
 * Params:
 * - id: string (requis) - ID de la catégorie
 */
router.get("/:id", categoryController.getCategoryById.bind(categoryController));

export default router;