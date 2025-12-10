import { Router } from 'express';
import { GroupePartageController } from '../controllers/GroupePartageController';
import { authMiddleware, requireAdmin, requireTeacher } from '../middleware/auth';
import { requireGroupAdmin, requirePublisherOrAdmin } from '../middleware/groupAuth';

const router = Router();

const groupePartageController = new GroupePartageController();

/**
 * GET /api/groupes
 * Récupérer tous les groupes de partage
 * ✅ CORRECTION: Déplacer cette route AVANT les routes avec paramètres
 */
router.get('/',
    authMiddleware,
    (req, res) => {
        console.log('✅ Route / appelée');
        console.log('Query:', req.query);
        return groupePartageController.getAllGroupePartage(req, res);
    }
);

/**
 * POST /api/groupes/custom/create
 * Créer un groupe personnalisé (authentification requise)
 */
router.post('/custom/create',
    authMiddleware,
    (req, res) => groupePartageController.createCustomGroupe(req, res)
);

/**
 * POST /api/groupes/ecole/create
 * Créer une école avec son groupe (admin uniquement)
 */
router.post('/ecole/create',
    authMiddleware,
    requireAdmin,
    (req, res) => groupePartageController.createEcoleWithGroupe(req, res)
);

/**
 * POST /api/groupes/filiere/create
 * Créer une filière avec son groupe (admin uniquement)
 */
router.post('/filiere/create',
    authMiddleware,
    requireAdmin,
    (req, res) => groupePartageController.createFiliereWithGroupe(req, res)
);

/**
 * POST /api/groupes/classe/create
 * Créer une classe avec son groupe (admin ou enseignant)
 */
router.post('/classe/create',
    authMiddleware,
    requireTeacher,
    (req, res) => groupePartageController.createClasseWithGroupe(req, res)
);

/**
 * POST /api/groupes/user/add
 * Ajouter un utilisateur à un groupe (authentification requise)
 */
router.post('/user/add',
    authMiddleware,
    (req, res) => groupePartageController.addUserToCustomGroupe(req, res)
);

/**
 * POST /api/groupes/join
 * Rejoindre un groupe via invitation
 */
router.post('/join',
    authMiddleware,
    (req, res) => groupePartageController.joinByInvitation(req, res)
);

/**
 * GET /api/groupes/enseignant/:enseignantId/groupes
 * Récupérer les groupes d'un enseignant (authentification requise)
 */
router.get('/enseignant/:enseignantId/groupes',
    authMiddleware,
    (req, res) => groupePartageController.getEnseignantGroupes(req, res)
);

/**
 * GET /api/groupes/:id
 * Récupérer un groupe de partage par son ID
 * ⚠️ IMPORTANT: Cette route doit être APRÈS toutes les routes spécifiques
 */
router.get('/:id',
    authMiddleware,
    (req, res) => {
        console.log('✅ Route /:id appelée avec id:', req.params.id);
        return groupePartageController.getGroupeById(req, res);
    }
);

// ========== GESTION AVANCÉE ==========

/**
 * POST /api/groupes/:groupeId/members
 * Ajouter un membre à un groupe
 */
router.post('/:groupeId/members',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.addMemberToGroupe(req, res)
);

/**
 * DELETE /api/groupes/:groupeId/members/:userId
 * Retirer un membre d'un groupe
 */
router.delete('/:groupeId/members/:userId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.removeMemberFromGroupe(req, res)
);

/**
 * POST /api/groupes/:groupeId/publishers
 * Ajouter un publisher (éditeur) à un groupe
 */
router.post('/:groupeId/publishers',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.addPublisher(req, res)
);

/**
 * POST /api/groupes/:groupeId/invitation
 * Générer un lien d'invitation pour un groupe
 */
router.post('/:groupeId/invitation',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.generateInvitation(req, res)
);

/**
 * POST /api/groupes/:groupeId/documents
 * Ajouter un document à un groupe
 */
router.post('/:groupeId/documents',
    authMiddleware,
    requirePublisherOrAdmin,
    (req, res) => groupePartageController.addDocument(req, res)
);

/**
 * DELETE /api/groupes/:groupeId/documents/:documentId
 * Retirer un document d'un groupe
 */
router.delete('/:groupeId/documents/:documentId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.removeDocument(req, res)
);

// ========== GESTION DES CATÉGORIES ==========

/**
 * GET /api/groupes/:groupeId/categories
 * Récupérer les catégories d'un groupe
 */
router.get('/:groupeId/categories',
    authMiddleware,
    (req, res) => groupePartageController.getGroupCategories(req, res)
);

/**
 * POST /api/groupes/:groupeId/categories
 * Créer une catégorie pour un groupe
 */
router.post('/:groupeId/categories',
    authMiddleware,
    (req, res) => groupePartageController.createGroupCategory(req, res)
);

/**
 * PUT /api/groupes/:groupeId/categories/:categoryId
 * Mettre à jour une catégorie
 */
router.put('/:groupeId/categories/:categoryId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.updateGroupCategory(req, res)
);

/**
 * DELETE /api/groupes/:groupeId/categories/:categoryId
 * Supprimer une catégorie
 */
router.delete('/:groupeId/categories/:categoryId',
    authMiddleware,
    requireGroupAdmin,
    (req, res) => groupePartageController.deleteGroupCategory(req, res)
);

export default router;