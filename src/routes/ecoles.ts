import { Router } from 'express';
import { EcoleController } from '../controllers/EcoleController';
import { validateDto } from '../middleware/validateDto';
import { CreateEcoleDto } from '../dtos/ecole.dto';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/schoolAuth';

const router = Router();
const ecoleController = new EcoleController();

/**
 * @swagger
 * /api/ecoles:
 *   post:
 *     tags:
 *       - Écoles
 *     summary: Créer une nouvelle école
 *     description: Permet de créer une nouvelle école avec les informations fournies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEcoleDto'
 *     responses:
 *       201:
 *         description: École créée avec succès
 *       400:
 *         description: Données invalides
 */
/**
 * POST /api/ecoles
 * Créer une nouvelle école
 */
router.post('/', authMiddleware, validateDto(CreateEcoleDto), (req, res) => ecoleController.createEcole(req, res));

/**
 * GET /api/ecoles
 * Récupérer toutes les écoles
 * Query params:
 * - name: string (optionnel) - Filtrer par nom
 * - address: string (optionnel) - Filtrer par adresse
 */
router.get('/', authMiddleware, (req, res) => ecoleController.getEcoles(req, res));

/**
 * GET /api/ecoles/:id
 * Récupérer une école par son ID
 * Params:
 * - id: string (requis) - ID de l'école
 */
router.get('/:id', authMiddleware, (req, res) => ecoleController.getEcoleById(req, res));

/**
 * PUT /api/ecoles/:id
 * Mettre à jour une école
 * Params:
 * - id: string (requis) - ID de l'école
 * Body:
 * - name: string (optionnel) - Nouveau nom
 * - address: string (optionnel) - Nouvelle adresse
 * - email: string (optionnel) - Nouvel email
 * - phoneNumber: string (optionnel) - Nouveau numéro de téléphone
 */
router.put('/:id', authMiddleware, requireAdmin, (req, res) => ecoleController.updateEcole(req, res));

/**
 * DELETE /api/ecoles/:id
 * Supprimer une école
 * Params:
 * - id: string (requis) - ID de l'école
 */
router.delete('/:id', authMiddleware, requireSuperAdmin, (req, res) => ecoleController.deleteEcole(req, res));

/**
 * POST /api/ecoles/:id/sync-groupe
 * Synchroniser le groupe de partage associé à l'école
 * Params:
 * - id: string (requis) - ID de l'école
 */
router.post('/:id/sync-groupe', authMiddleware, requireAdmin, (req, res) => ecoleController.syncEcoleGroupe(req, res));

/**
 * POST /api/ecoles/groupes/:groupeId/ecoles/:ecoleId
 * Ajouter une école à un groupe de partage
 * Params:
 * - groupeId: string (requis)
 * - ecoleId: string (requis)
 */
router.post('/groupes/:groupeId/ecoles/:ecoleId', authMiddleware, requireAdmin, (req, res) => ecoleController.addEcoleToGroupe(req, res));

/**
 * DELETE /api/ecoles/groupes/:groupeId/ecoles/:ecoleId
 * Retirer une école d'un groupe de partage
 * Params:
 * - groupeId: string (requis)
 * - ecoleId: string (requis)
 */
router.delete('/groupes/:groupeId/ecoles/:ecoleId', authMiddleware, requireAdmin, (req, res) => ecoleController.removeEcoleFromGroupe(req, res));

/**
 * POST /api/ecoles/groupes/sync/ecole/:ecoleId
 * Synchroniser en masse le groupe de partage d'une école
 * Params:
 * - ecoleId: string (requis)
 */
router.post('/groupes/sync/ecole/:ecoleId', authMiddleware, requireAdmin, (req, res) => ecoleController.syncEcoleGroupePartage(req, res));

export default router;