import { Router } from 'express';
import { GroupePartageController } from '../controllers/GroupePartageController';

const router = Router();

const groupePartageController = new GroupePartageController();

/**
 * @swagger
 * /api/groupes-partage/custom/create:
 *   post:
 *     tags:
 *       - Groupes de Partage
 *     summary: Créer un groupe personnalisé
 *     description: Permet de créer un groupe personnalisé. L'utilisateur connecté devient le propriétaire.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Groupe créé avec succès
 *       400:
 *         description: Données invalides
 */

/**
 * GET /api/groupes-partage/all
 * Récupérer tous les groupes de partage
 */
router.get('/',
    // authMiddleware,
    groupePartageController.getAllGroupePartage.bind(groupePartageController)
);

/**
 * GET /api/groupes/:id
 * Récupérer un groupe de partage par son ID
 */
router.get('/:id', groupePartageController.getGroupeById.bind(groupePartageController));

/**
 * POST /api/groupes-partage/custom/create
 * Créer un groupe personnalisé (authentification requise)
 * L'utilisateur connecté est automatiquement le propriétaire
 */
router.post('/groupes-partage/custom/create',
    // authMiddleware,  // ✨ Authentification requise
    (req, res) => groupePartageController.createCustomGroupe(req, res)
);

/**
 * POST /api/groupes-partage/ecole/create
 * Créer une école avec son groupe (admin uniquement)
 */
router.post('/groupes-partage/ecole/create',
    // authMiddleware,
    // requireAdmin,  // ✨ Admin uniquement
    (req, res) => groupePartageController.createEcoleWithGroupe(req, res)
);

/**
 * POST /api/groupes-partage/filiere/create
 * Créer une filière avec son groupe (admin uniquement)
 */
router.post('/groupes-partage/filiere/create',
    // authMiddleware,
    // requireAdmin,
    (req, res) => groupePartageController.createFiliereWithGroupe(req, res)
);

/**
 * POST /api/groupes-partage/classe/create
 * Créer une classe avec son groupe (admin ou enseignant)
 */
router.post('/groupes-partage/classe/create',
    // authMiddleware,
    // requireTeacher,
    (req, res) => groupePartageController.createClasseWithGroupe(req, res)
);

/**
 * POST /api/groupes-partage/user/add
 * Ajouter un utilisateur à un groupe (authentification requise)
 */
router.post('/groupes-partage/user/add',
    // authMiddleware,
    (req, res) => groupePartageController.addUserToCustomGroupe(req, res)
);

/**
 * GET /api/groupes-partage/enseignant/:enseignantId/groupes
 * Récupérer les groupes d'un enseignant (authentification requise)
 */
router.get('/groupes-partage/enseignant/:enseignantId/groupes',
    // authMiddleware,
    (req, res) => groupePartageController.getEnseignantGroupes(req, res)
);


export default router;
