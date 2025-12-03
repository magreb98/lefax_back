import { Router } from 'express';
import { ClasseController } from '../controllers/ClasseController';
import { validateDto } from '../middleware/validateDto';
import { CreateClasseDto } from '../dtos/classe.dto';

const router = Router();
const classeController = new ClasseController();

/**
 * @swagger
 * /api/classes:
 *   post:
 *     tags:
 *       - Classes
 *     summary: Créer une nouvelle classe
 *     description: Permet de créer une nouvelle classe avec les informations fournies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClasseDto'
 *     responses:
 *       201:
 *         description: Classe créée avec succès
 *       400:
 *         description: Données invalides
 */

/**
 * POST /api/classes
 * Créer une nouvelle classe
 */
router.post('/', validateDto(CreateClasseDto), (req, res) => classeController.createClasse(req, res));

/**
 * GET /api/classes
 * Récupérer toutes les classes
 * Query params:
 * - filiereId: string (optionnel) - Filtrer par filière
 * - ecoleId: string (optionnel) - Filtrer par école
 */
router.get('/', (req, res) => classeController.getClasses(req, res));

/**
 * GET /api/classes/:id
 * Récupérer une classe par son ID
 * Params:
 * - id: string (requis) - ID de la classe
 */
router.get('/:id', (req, res) => classeController.getClasseById(req, res));

/**
 * PUT /api/classes/:id
 * Mettre à jour une classe
 * Params:
 * - id: string (requis) - ID de la classe
 * Body:
 * - name: string (optionnel) - Nouveau nom de la classe
 * - filiereId: string (optionnel) - Nouvelle filière
 */
router.put('/:id', (req, res) => classeController.updateClasse(req, res));

/**
 * DELETE /api/classes/:id
 * Supprimer une classe
 * Params:
 * - id: string (requis) - ID de la classe
 */
router.delete('/:id', (req, res) => classeController.deleteClasse(req, res));

/**
 * POST /api/classes/:id/sync-groupe
 * Synchroniser le groupe de partage associé à la classe
 * Params:
 * - id: string (requis) - ID de la classe
 */
router.post('/:id/sync-groupe', (req, res) => classeController.syncClasseGroupe(req, res));

/**
 * GET /api/classes/:id/students
 * Récupérer tous les étudiants d'une classe
 * Params:
 * - id: string (requis) - ID de la classe
 */
router.get('/:id/students', (req, res) => classeController.getStudentsByClasse(req, res));

/**
 * GET /api/classes/:id/matieres
 * Récupérer toutes les matières d'une classe
 * Params:
 * - id: string (requis) - ID de la classe
 */
router.get('/:id/matieres', (req, res) => classeController.getMatieresByClasse(req, res));

/**
 * POST /api/classes/:classeId/delegate/:userId
 * Promouvoir un étudiant comme délégué de classe
 * Params:
 * - classeId: string (requis) - ID de la classe
 * - userId: string (requis) - ID de l'utilisateur
 */
router.post('/:classeId/delegate/:userId', (req, res) => classeController.setDelegate(req, res));

/**
 * DELETE /api/classes/:classeId/delegate/:userId
 * Révoquer le statut de délégué d'un étudiant
 * Params:
 * - classeId: string (requis) - ID de la classe
 * - userId: string (requis) - ID de l'utilisateur
 */
router.delete('/:classeId/delegate/:userId', (req, res) => classeController.removeDelegate(req, res));

/**
 * POST /api/classes/groupes/:groupeId/classes/:classeId
 * Ajouter une classe à un groupe de partage
 * Params:
 * - groupeId: string (requis)
 * - classeId: string (requis)
 */
router.post('/groupes/:groupeId/classes/:classeId', (req, res) => classeController.addClasseToGroupe(req, res));

/**
 * DELETE /api/classes/groupes/:groupeId/classes/:classeId
 * Retirer une classe d'un groupe de partage
 * Params:
 * - groupeId: string (requis)
 * - classeId: string (requis)
 */
router.delete('/groupes/:groupeId/classes/:classeId', (req, res) => classeController.removeClasseFromGroupe(req, res));

/**
 * POST /api/classes/groupes/sync/classe/:classeId
 * Synchroniser le groupe de partage d'une classe (opération en masse)
 * Params:
 * - classeId: string (requis)
 */
router.post('/groupes/sync/classe/:classeId', (req, res) => classeController.syncClasseGroupePartage(req, res));

export default router;