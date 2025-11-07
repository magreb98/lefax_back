import { Router } from 'express';
import { UserController } from '../controllers/UserController';


const router = Router();
const userController = new UserController();

// ========== ROUTES CRUD DE BASE ==========

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags:
 *       - Users
 *     summary: Enregistrer un nouvel utilisateur
 *     description: Crée un nouvel utilisateur avec les informations fournies
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *               schoolId:
 *                 type: string
 *               classeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données invalides
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Récupérer tous les utilisateurs
 *     description: Retourne une liste d'utilisateurs avec des filtres optionnels
 *     parameters:
 *       - name: role
 *         in: query
 *         schema:
 *           type: string
 *       - name: schoolId
 *         in: query
 *         schema:
 *           type: string
 *       - name: classeId
 *         in: query
 *         schema:
 *           type: string
 *       - name: isActive
 *         in: query
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       400:
 *         description: Erreur dans les paramètres de requête
 */

/**
 * GET /api/users
 * Récupérer tous les utilisateurs avec filtres optionnels
 * Query params: role?, schoolId?, classeId?, isActive?
 */
router.get('/', (req, res) => userController.getUsers(req, res));

/**
 * GET /api/users/:id
 * Récupérer un utilisateur par ID
 */
router.get('/:id', (req, res) => userController.getUserById(req, res));

/**
 * PUT /api/users/:id
 * Mettre à jour un utilisateur
 * Body: { firstName?, lastName?, email?, role?, phoneNumber?, password?, isActive?, isSuspended? }
 */
router.put('/:id', (req, res) => userController.updateUser(req, res));

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur
 */
router.delete('/:id', (req, res) => userController.deleteUser(req, res));

// ========== ROUTES GESTION DES CLASSES ==========

/**
 * POST /api/users/classe/add
 * Ajouter un utilisateur à une classe (devient ETUDIANT)
 * Body: { userId: string, classeId: string }
 */
router.post('/classe/add', (req, res) => userController.addUserToClasse(req, res));

/**
 * POST /api/users/classe/add-multiple
 * Ajouter plusieurs utilisateurs à une classe
 * Body: { userIds: string[], classeId: string }
 */
router.post('/classe/add-multiple', (req, res) => userController.addUsersToClasse(req, res));

/**
 * DELETE /api/users/:userId/classe
 * Retirer un utilisateur d'une classe
 */
router.delete('/:userId/classe', (req, res) => userController.removeUserFromClasse(req, res));

/**
 * GET /api/users/classe/:classeId/students
 * Récupérer tous les étudiants d'une classe
 */
router.get('/classe/:classeId/students', (req, res) => userController.getStudentsByClasse(req, res));

/**
 * GET /api/users/school/:schoolId/students
 * Récupérer tous les étudiants d'une école
 */
router.get('/school/:schoolId/students', (req, res) => userController.getStudentsBySchool(req, res));

/**
 * GET /api/users/teachers
 * Récupérer tous les enseignants
 */
router.get('/teachers/all', (req, res) => userController.getAllTeachers(req, res));

// ========== ROUTES GESTION DES STATUTS ==========

/**
 * PATCH /api/users/:id/toggle-status
 * Activer/Désactiver un utilisateur
 */
router.patch('/:id/toggle-status', (req, res) => userController.toggleUserStatus(req, res));

/**
 * PATCH /api/users/:id/toggle-suspension
 * Suspendre/Réactiver un utilisateur
 */
router.patch('/:id/toggle-suspension', (req, res) => userController.toggleUserSuspension(req, res));

/**
 * POST /api/users/change-school
 * Changer l'école d'un utilisateur
 * Body: { userId: string, schoolId: string }
 */
router.post('/change-school', (req, res) => userController.changeUserSchool(req, res));

// ========== ROUTES GROUPES DE PARTAGE ==========

/**
 * POST /api/users/groupes
 * Créer un groupe de partage personnalisé
 * Body: { name: string, description?: string, userIds?: string[] }
 */
router.post('/groupes', (req, res) => userController.createCustomGroupe(req, res));

/**
 * POST /api/users/groupes/:groupeId/users/:userId
 * Ajouter un utilisateur à un groupe personnalisé
 */
router.post('/groupes/:groupeId/users/:userId', (req, res) => userController.addUserToCustomGroupe(req, res));

/**
 * POST /api/users/groupes/:groupeId/users/bulk
 * Ajouter plusieurs utilisateurs à un groupe
 * Body: { userIds: string[] }
 */
router.post('/groupes/:groupeId/users/bulk', (req, res) => userController.addUsersToGroupe(req, res));

/**
 * DELETE /api/users/groupes/:groupeId/users/:userId
 * Retirer un utilisateur d'un groupe
 */
router.delete('/groupes/:groupeId/users/:userId', (req, res) => userController.removeUserFromGroupe(req, res));

/**
 * DELETE /api/users/groupes/:groupeId/users/bulk
 * Retirer plusieurs utilisateurs d'un groupe
 * Body: { userIds: string[] }
 */
router.delete('/groupes/:groupeId/users/bulk', (req, res) => userController.removeUsersFromGroupe(req, res));

/**
 * GET /api/users/enseignants/:enseignantId/groupes
 * Récupérer tous les groupes d'un enseignant
 */
router.get('/enseignants/:enseignantId/groupes', (req, res) => userController.getEnseignantGroupes(req, res));

/**
 * GET /api/users/groupes/:groupeId/enseignants
 * Récupérer tous les enseignants d'un groupe
 */
router.get('/groupes/:groupeId/enseignants', (req, res) => userController.getEnseignantsInGroupe(req, res));

/**
 * POST /api/users/groupes/sync/enseignement/:enseignementId
 * Synchroniser après l'affectation d'un enseignant
 */
router.post('/groupes/sync/enseignement/:enseignementId', (req, res) => userController.syncAfterEnseignementAssignment(req, res));

export default router;