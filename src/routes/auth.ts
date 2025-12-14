import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Authentifier un utilisateur
 *     description: Authentifie un utilisateur avec son email et mot de passe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Authentification réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Email ou mot de passe incorrect
 *       400:
 *         description: Données invalides
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Déconnecter l'utilisateur
 *     description: Déconnecte l'utilisateur courant en invalidant son token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         description: Non authentifié
 */
router.post('/logout', authMiddleware, authController.logout.bind(authController));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Récupérer le profil utilisateur
 *     description: Retourne les informations de l'utilisateur actuellement connecté
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authMiddleware, authController.getCurrentUser.bind(authController));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Rafraîchir le token
 *     description: Génère un nouveau token d'accès en utilisant le refresh token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveau token généré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Refresh token invalide ou expiré
 */
router.post('/refresh', authMiddleware, authController.refreshToken.bind(authController));


/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Demander la réinitialisation du mot de passe
 *     description: Envoie un email avec un lien de réinitialisation si le compte existe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email envoyé si le compte existe
 *       500:
 *         description: Erreur serveur
 */
router.post('/forgot-password', authController.forgotPassword.bind(authController));

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Réinitialiser le mot de passe
 *     description: Modifie le mot de passe si le token est valide
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de réinitialisation reçu par email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Mot de passe modifié avec succès
 *       400:
 *         description: Token invalide ou expiré
 *       500:
 *         description: Erreur serveur
 */
router.post('/reset-password/:token', authController.resetPassword.bind(authController));

export default router;
