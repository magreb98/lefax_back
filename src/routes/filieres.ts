import { Router } from 'express';
import { FiliereController } from '../controllers/FiliereController';
import { validateDto } from '../middleware/validateDto';
import { CreateFiliereDto } from '../dtos/filiere.dto';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { requireSchoolAdmin, requireOwnSchoolOnly } from '../middleware/requireSchoolAdmin';

const router = Router();
const filiereController = new FiliereController();

/**
 * @swagger
 * /api/filieres:
 *   post:
 *     tags:
 *       - Filières
 *     summary: Créer une nouvelle filière
 *     description: Permet de créer une nouvelle filière avec les informations fournies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFiliereDto'
 *     responses:
 *       201:
 *         description: Filière créée avec succès
 *       400:
 *         description: Données invalides
 */

/**
 * POST /api/filieres
 * Créer une nouvelle filière
 */
router.post('/', authMiddleware, requireSchoolAdmin, validateDto(CreateFiliereDto), (req, res) => filiereController.createFiliere(req, res));

/**
 * GET /api/filieres
 * Récupérer toutes les filières
 * Query params:
 * - ecoleId: string (optionnel) - Filtrer par école
 * - name: string (optionnel) - Filtrer par nom
 */
router.get('/', authMiddleware, (req, res) => filiereController.getFilieres(req, res));

/**
 * GET /api/filieres/:id
 * Récupérer une filière par son ID
 * Params:
 * - id: string (requis) - ID de la filière
 */
router.get('/:id', authMiddleware, (req, res) => filiereController.getFiliereById(req, res));

/**
 * PUT /api/filieres/:id
 * Mettre à jour une filière
 * Params:
 * - id: string (requis) - ID de la filière
 * Body:
 * - name: string (optionnel) - Nouveau nom
 * - description: string (optionnel) - Nouvelle description
 */
router.put('/:id', authMiddleware, requireSchoolAdmin, requireOwnSchoolOnly('filiere'), (req, res) => filiereController.updateFiliere(req, res));

/**
 * DELETE /api/filieres/:id
 * Supprimer une filière
 * Params:
 * - id: string (requis) - ID de la filière
 */
router.delete('/:id', authMiddleware, requireSchoolAdmin, requireOwnSchoolOnly('filiere'), (req, res) => filiereController.deleteFiliere(req, res));

/**
 * POST /api/filieres/:id/sync-groupe
 * Synchroniser le groupe de partage associé à la filière
 * Params:
 * - id: string (requis) - ID de la filière
 */
router.post('/:id/sync-groupe', authMiddleware, requireSchoolAdmin, requireOwnSchoolOnly('filiere'), (req, res) => filiereController.syncFiliereGroupe(req, res));

/**
 * POST /api/filieres/groupes/:groupeId/filieres/:filiereId
 * Ajouter une filière à un groupe de partage
 * Params:
 * - groupeId: string (requis)
 * - filiereId: string (requis)
 */
router.post('/groupes/:groupeId/filieres/:filiereId', authMiddleware, requireAdmin, (req, res) => filiereController.addFiliereToGroupe(req, res));

/**
 * DELETE /api/filieres/groupes/:groupeId/filieres/:filiereId
 * Retirer une filière d'un groupe de partage
 * Params:
 * - groupeId: string (requis)
 * - filiereId: string (requis)
 */
router.delete('/groupes/:groupeId/filieres/:filiereId', authMiddleware, requireAdmin, (req, res) => filiereController.removeFiliereFromGroupe(req, res));

/**
 * POST /api/filieres/groupes/sync/filiere/:filiereId
 * Synchroniser en masse le groupe de partage d'une filière
 * Params:
 * - filiereId: string (requis)
 */
router.post('/groupes/sync/filiere/:filiereId', authMiddleware, requireAdmin, (req, res) => filiereController.syncFiliereGroupePartage(req, res));

export default router;