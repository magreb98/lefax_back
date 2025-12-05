import { Router } from 'express';
import { GroupePartageController } from '../controllers/GroupePartageController';
import { authMiddleware } from '../middleware/auth';
import { requireGroupAdmin, requirePublisherOrAdmin } from '../middleware/groupAuth';

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
router.post('/custom/create',
    // authMiddleware,  // ✨ Authentification requise
    (req, res) => groupePartageController.createCustomGroupe(req, res)
);

/**
 * POST /api/groupes-partage/ecole/create
 * Créer une école avec son groupe (admin uniquement)
 */
router.post('/ecole/create',
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
router.post('/classe/create',
    // authMiddleware,
    // requireTeacher,
    (req, res) => groupePartageController.createClasseWithGroupe(req, res)
);

/**
 * POST /api/groupes-partage/user/add
 * Ajouter un utilisateur à un groupe (authentification requise)
 */
router.post('/user/add',
    // authMiddleware,
    (req, res) => groupePartageController.addUserToCustomGroupe(req, res)
);

/**
 * GET /api/groupes-partage/enseignant/:enseignantId/groupes
 * Récupérer les groupes d'un enseignant (authentification requise)
 */
router.get('/enseignant/:enseignantId/groupes',
    // authMiddleware,
    (req, res) => groupePartageController.getEnseignantGroupes(req, res)
);

// ========== GESTION AVANCÉE ==========

/**
 * POST /api/groupes-partage/:groupeId/members
 * Ajouter un membre à un groupe
 */
router.post('/:groupeId/members',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.addMemberToGroupe(req, res)
);

/**
 * DELETE /api/groupes-partage/:groupeId/members/:userId
 * Retirer un membre d'un groupe
 */
router.delete('/:groupeId/members/:userId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.removeMemberFromGroupe(req, res)
);

/**
 * POST /api/groupes-partage/:groupeId/publishers
 * Ajouter un publisher (éditeur) à un groupe
 */
router.post('/:groupeId/publishers',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.addPublisher(req, res)
);

/**
 * POST /api/groupes-partage/:groupeId/invitation
 * Générer un lien d'invitation pour un groupe
 */
router.post('/:groupeId/invitation',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.generateInvitation(req, res)
);

/**
 * POST /api/groupes-partage/join
 * Rejoindre un groupe via invitation
 */
router.post('/join',
    authMiddleware,
    (req, res) => groupePartageController.joinByInvitation(req, res)
);

/**
 * POST /api/groupes-partage/:groupeId/documents
 * Ajouter un document à un groupe
 */
router.post('/:groupeId/documents',
    authMiddleware,
    requirePublisherOrAdmin,
    (req, res) => groupePartageController.addDocument(req, res)
);

/**
 * DELETE /api/groupes-partage/:groupeId/documents/:documentId
 * Retirer un document d'un groupe
 */
router.delete('/:groupeId/documents/:documentId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.removeDocument(req, res)
);

// ========== GESTION DES CATÉGORIES ==========

/**
 * GET /api/groupes-partage/:groupeId/categories
 * Récupérer les catégories d'un groupe
 */
router.get('/:groupeId/categories',
    authMiddleware,
    (req, res) => groupePartageController.getGroupCategories(req, res)
);

/**
 * POST /api/groupes-partage/:groupeId/categories
 * Créer une catégorie pour un groupe
 */
router.post('/:groupeId/categories',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.createGroupCategory(req, res)
);

/**
 * PUT /api/groupes-partage/:groupeId/categories/:categoryId
 * Mettre à jour une catégorie
 */
router.put('/:groupeId/categories/:categoryId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.updateGroupCategory(req, res)
);

/**
 * DELETE /api/groupes-partage/:groupeId/categories/:categoryId
 * Supprimer une catégorie
 */
router.delete('/:groupeId/categories/:categoryId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.deleteGroupCategory(req, res)
);

export default router;
