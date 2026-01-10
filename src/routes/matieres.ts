import { Router } from "express";
import { MatiereController } from "../controllers/MatiereController";
import { validateDto } from "../middleware/validateDto";
import { CreateMatiereDto, UpdateMatiereDto } from "../dtos/matiere.dto";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { requireSchoolAdmin, requireOwnSchoolOnly } from "../middleware/requireSchoolAdmin";

const router = Router();
const matiereController = new MatiereController();

/**
 * @swagger
 * /api/matieres:
 *   get:
 *     tags:
 *       - Matieres
 *     summary: Récupérer toutes les matières
 *     description: Récupérer toutes les matières avec filtrage optionnel par classe
 *     parameters:
 *       - in: query
 *         name: classeId
 *         schema:
 *           type: string
 *         description: Filtrer par ID de classe
 *     responses:
 *       200:
 *         description: Liste des matières récupérée avec succès
 */
router.get("/", authMiddleware, (req, res) => matiereController.getMatieres(req, res));

/**
 * @swagger
 * /api/matieres/class/{classId}:
 *   get:
 *     tags:
 *       - Matieres
 *     summary: Récupérer les matières d'une classe
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la classe
 *     responses:
 *       200:
 *         description: Liste des matières de la classe
 */
router.get("/class/:classId", authMiddleware, (req, res) => matiereController.getMatieresByClass(req, res));

/**
 * @swagger
 * /api/matieres/{id}:
 *   get:
 *     tags:
 *       - Matieres
 *     summary: Récupérer une matière par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la matière
 *     responses:
 *       200:
 *         description: Matière récupérée avec succès
 *       404:
 *         description: Matière non trouvée
 */
router.get("/:id", authMiddleware, (req, res) => matiereController.getMatiereById(req, res));

/**
 * @swagger
 * /api/matieres/{id}/documents:
 *   get:
 *     tags:
 *       - Matieres
 *     summary: Récupérer tous les documents d'une matière
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la matière
 *     responses:
 *       200:
 *         description: Documents récupérés avec succès
 *       404:
 *         description: Matière non trouvée
 */
router.get("/:id/documents", authMiddleware, (req, res) => matiereController.getDocumentsByMatiere(req, res));

/**
 * @swagger
 * /api/matieres:
 *   post:
 *     tags:
 *       - Matieres
 *     summary: Créer une nouvelle matière
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMatiereDto'
 *     responses:
 *       201:
 *         description: Matière créée avec succès
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Classe non trouvée
 */
router.post("/", authMiddleware, requireSchoolAdmin, validateDto(CreateMatiereDto), (req, res) => matiereController.createMatiere(req, res));

/**
 * @swagger
 * /api/matieres/{id}:
 *   put:
 *     tags:
 *       - Matieres
 *     summary: Mettre à jour une matière
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la matière
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMatiereDto'
 *     responses:
 *       200:
 *         description: Matière mise à jour avec succès
 *       404:
 *         description: Matière non trouvée
 */
router.put("/:id", authMiddleware, requireSchoolAdmin, requireOwnSchoolOnly('matiere'), validateDto(UpdateMatiereDto), (req, res) => matiereController.updateMatiere(req, res));

/**
 * @swagger
 * /api/matieres/{id}:
 *   delete:
 *     tags:
 *       - Matieres
 *     summary: Supprimer une matière
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la matière
 *     responses:
 *       200:
 *         description: Matière supprimée avec succès
 *       404:
 *         description: Matière non trouvée
 */
router.delete("/:id", authMiddleware, requireSchoolAdmin, requireOwnSchoolOnly('matiere'), (req, res) => matiereController.deleteMatiere(req, res));

/**
 * @swagger
 * /api/matieres/{id}/teachers:
 *   post:
 *     tags:
 *       - Matieres
 *     summary: Assigner un enseignant à une matière
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teacherId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Enseignant assigné
 *       400:
 *         description: Erreur ou enseignant déjà assigné
 */
router.post("/:id/teachers", authMiddleware, requireSchoolAdmin, requireOwnSchoolOnly('matiere'), (req, res) => matiereController.addTeacher(req, res));

/**
 * @swagger
 * /api/matieres/{id}/teachers/{teacherId}:
 *   delete:
 *     tags:
 *       - Matieres
 *     summary: Retirer un enseignant d'une matière
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enseignant retiré
 *       400:
 *         description: Erreur
 */
router.delete("/:id/teachers/:teacherId", authMiddleware, requireSchoolAdmin, requireOwnSchoolOnly('matiere'), (req, res) => matiereController.removeTeacher(req, res));

export default router;