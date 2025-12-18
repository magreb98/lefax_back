import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { requireSuperAdmin, requireStudentManagementAccess, autoFilterBySchool } from '../middleware/schoolAuth';

const router = Router();
const userController = new UserController();

// ========== ROUTES CRUD DE BASE ==========
//  IMPORTANT : Les routes spécifiques AVANT les routes avec paramètres dynamiques

/**
 * POST /api/users/register
 * Enregistrer un nouvel utilisateur
 */
router.post('/register', userController.register.bind(userController));

/**
 * GET /api/users/teachers
 * Récupérer tous les enseignants
 */
router.get('/teachers/all', authMiddleware, (req, res) => userController.getAllTeachers(req, res));

/**
 * GET /api/users
 * Récupérer tous les utilisateurs avec filtres optionnels
 */
router.get('/', authMiddleware, autoFilterBySchool, (req, res) => userController.getUsers(req, res));

/**
 * GET /api/users/:id
 * Récupérer un utilisateur par ID
 */
router.get('/:id', authMiddleware, (req, res) => userController.getUserById(req, res));

/**
 * PUT /api/users/:id
 * Mettre à jour un utilisateur
 */
router.put('/:id', authMiddleware, requireAdmin, (req, res) => userController.updateUser(req, res));

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur
 */
router.delete('/:id', authMiddleware, requireSuperAdmin, (req, res) => userController.deleteUser(req, res));

// ========== ROUTES GESTION DES CLASSES ==========

/**
 * POST /api/users/classe/add
 * Ajouter un utilisateur à une classe (devient ETUDIANT)
 */
router.post('/classe/add', authMiddleware, requireAdmin, (req, res) => userController.addUserToClasse(req, res));

/**
 * POST /api/users/classe/add-multiple
 * Ajouter plusieurs utilisateurs à une classe
 */
router.post('/classe/add-multiple', authMiddleware, requireAdmin, (req, res) => userController.addUsersToClasse(req, res));

/**
 * GET /api/users/classe/:classeId/students
 * Récupérer tous les étudiants d'une classe
 */
router.get('/classe/:classeId/students', authMiddleware, (req, res) => userController.getStudentsByClasse(req, res));

/**
 * GET /api/users/school/:schoolId/students
 * Récupérer tous les étudiants d'une école
 */
router.get('/school/:schoolId/students', authMiddleware, (req, res) => userController.getStudentsBySchool(req, res));

/**
 * DELETE /api/users/:userId/classe
 * Retirer un utilisateur d'une classe
 */
router.delete('/:userId/classe', authMiddleware, requireAdmin, (req, res) => userController.removeUserFromClasse(req, res));

/**
 * POST /api/users/exclude-from-school
 * Exclure un étudiant d'une école (ADMIN only)
 */
router.post('/exclude-from-school', authMiddleware, requireStudentManagementAccess, (req, res) => userController.excludeStudentFromSchool(req, res));


// ========== ROUTES GESTION DES STATUTS ==========

/**
 * POST /api/users/change-school
 * Changer l'école d'un utilisateur
 */
router.post('/change-school', authMiddleware, requireAdmin, (req, res) => userController.changeUserSchool(req, res));

/**
 * PATCH /api/users/:id/toggle-status
 * Activer/Désactiver un utilisateur
 */
router.patch('/:id/toggle-status', authMiddleware, requireAdmin, (req, res) => userController.toggleUserStatus(req, res));

/**
 * PATCH /api/users/:id/toggle-suspension
 * Suspendre/Réactiver un utilisateur
 */
router.patch('/:id/toggle-suspension', authMiddleware, requireAdmin, (req, res) => userController.toggleUserSuspension(req, res));

// ========== ROUTES GROUPES DE PARTAGE ==========

/**
 * POST /api/users/groupes
 * Créer un groupe de partage personnalisé
 */
router.post('/groupes', authMiddleware, (req, res) => userController.createCustomGroupe(req, res));

/**
 * POST /api/users/groupes/:groupeId/users/:userId
 * Ajouter un utilisateur à un groupe personnalisé
 */
router.post('/groupes/:groupeId/users/:userId', authMiddleware, (req, res) => userController.addUserToCustomGroupe(req, res));

/**
 * POST /api/users/groupes/:groupeId/users/bulk
 * Ajouter plusieurs utilisateurs à un groupe
 */
router.post('/groupes/:groupeId/users/bulk', authMiddleware, (req, res) => userController.addUsersToGroupe(req, res));

/**
 * DELETE /api/users/groupes/:groupeId/users/:userId
 * Retirer un utilisateur d'un groupe
 */
router.delete('/groupes/:groupeId/users/:userId', authMiddleware, (req, res) => userController.removeUserFromGroupe(req, res));

/**
 * DELETE /api/users/groupes/:groupeId/users/bulk
 * Retirer plusieurs utilisateurs d'un groupe
 */
router.delete('/groupes/:groupeId/users/bulk', authMiddleware, (req, res) => userController.removeUsersFromGroupe(req, res));

/**
 * GET /api/users/enseignants/:enseignantId/groupes
 * Récupérer tous les groupes d'un enseignant
 */
router.get('/enseignants/:enseignantId/groupes', authMiddleware, (req, res) => userController.getEnseignantGroupes(req, res));

/**
 * GET /api/users/groupes/:groupeId/enseignants
 * Récupérer tous les enseignants d'un groupe
 */
router.get('/groupes/:groupeId/enseignants', authMiddleware, (req, res) => userController.getEnseignantsInGroupe(req, res));

/**
 * POST /api/users/groupes/sync/enseignement/:enseignementId
 * Synchroniser après l'affectation d'un enseignant
 */
router.post('/groupes/sync/enseignement/:enseignementId', authMiddleware, (req, res) => userController.syncAfterEnseignementAssignment(req, res));

// ========== ROUTES GESTION DES ENSEIGNANTS ==========
/**
 * GET /api/users/school/:schoolId/teachers
 * Récupérer tous les enseignants d'une école
 */
router.get('/school/:schoolId/teachers', authMiddleware, requireAdmin, (req, res) => userController.getTeachersBySchool(req, res));
/**
 * POST /api/users/teachers/add-to-school
 * Ajouter un enseignant à une école (ADMIN only)
 */
router.post('/teachers/add-to-school', authMiddleware, requireAdmin, (req, res) => userController.addTeacherToSchool(req, res));

/**
 * POST /api/users/teachers/assign-matieres
 * Assigner des matières à un enseignant (ADMIN only)
 */
router.post('/teachers/assign-matieres', authMiddleware, requireAdmin, (req, res) => userController.assignMatieresToTeacher(req, res));
/**
 * POST /api/users/teachers/remove-from-school
 * Retirer un enseignant d'une école (ADMIN only)
 */
router.post('/teachers/remove-from-school', authMiddleware, requireAdmin, (req, res) => userController.removeTeacherFromSchool(req, res));

// ========== ROUTES GESTION DES PERMISSIONS ==========

/**
 * POST /api/users/permissions/grant-view-all-groups
 * Accorder la permission de voir tous les groupes (ADMIN only)
 */
router.post('/permissions/grant-view-all-groups', authMiddleware, requireAdmin, (req, res) => userController.grantViewAllGroupsPermission(req, res));

/**
 * POST /api/users/permissions/revoke-view-all-groups
 * Révoquer la permission de voir tous les groupes (ADMIN only)
 */
router.post('/permissions/revoke-view-all-groups', authMiddleware, requireAdmin, (req, res) => userController.revokeViewAllGroupsPermission(req, res));

/**
 * POST /api/users/permissions/grant-school-creation
 * Accorder le droit de créer une école (SUPERADMIN only)
 */
router.post('/permissions/grant-school-creation', authMiddleware, requireSuperAdmin, (req, res) => userController.grantSchoolCreationRight(req, res));

/**
 * POST /api/users/permissions/revoke-school-creation
 * Révoquer le droit de créer une école (SUPERADMIN only)
 */
router.post('/permissions/revoke-school-creation', authMiddleware, requireSuperAdmin, (req, res) => userController.revokeSchoolCreationRight(req, res));

export default router;