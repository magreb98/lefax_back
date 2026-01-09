import { Router } from 'express';
import { userSearchPreferenceController } from '../controllers/UserSearchPreferenceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * GET /api/users/me/search-preferences
 * Récupérer les préférences de recherche de l'utilisateur connecté
 */
router.get('/me/search-preferences', (req, res) =>
    userSearchPreferenceController.getMyPreferences(req, res)
);

/**
 * GET /api/users/me/search-preferences/available
 * Récupérer tous les groupes disponibles pour l'utilisateur
 */
router.get('/me/search-preferences/available', (req, res) =>
    userSearchPreferenceController.getAvailableGroupes(req, res)
);

/**
 * GET /api/users/me/search-preferences/stats
 * Récupérer les statistiques des préférences
 */
router.get('/me/search-preferences/stats', (req, res) =>
    userSearchPreferenceController.getPreferenceStats(req, res)
);

/**
 * PUT /api/users/me/search-preferences/:groupeId
 * Activer/Désactiver un groupe dans les préférences
 */
router.put('/me/search-preferences/:groupeId', (req, res) =>
    userSearchPreferenceController.toggleGroupePreference(req, res)
);

/**
 * POST /api/users/me/search-preferences/reset
 * Réinitialiser les préférences aux valeurs par défaut
 */
router.post('/me/search-preferences/reset', (req, res) =>
    userSearchPreferenceController.resetPreferences(req, res)
);

/**
 * PUT /api/users/me/search-preferences/order
 * Mettre à jour l'ordre d'affichage des préférences
 */
router.put('/me/search-preferences/order', (req, res) =>
    userSearchPreferenceController.updateDisplayOrder(req, res)
);

/**
 * POST /api/users/me/search-preferences/batch-toggle
 * Activer/Désactiver plusieurs groupes en une seule requête
 */
router.post('/me/search-preferences/batch-toggle', (req, res) =>
    userSearchPreferenceController.batchTogglePreferences(req, res)
);

export default router;
