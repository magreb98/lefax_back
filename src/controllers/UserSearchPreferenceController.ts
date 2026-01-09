import { Request, Response } from 'express';
import { UserSearchPreferenceService } from '../services/UserSearchPreferenceService';

/**
 * Controller pour la gestion des préférences de recherche des utilisateurs
 */
export class UserSearchPreferenceController {
    private preferenceService = new UserSearchPreferenceService();

    /**
     * GET /api/users/me/search-preferences
     * Récupérer les préférences de recherche de l'utilisateur connecté
     */
    async getMyPreferences(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;

            console.log(`[PreferenceController] Getting preferences for user ${userId}`);

            const preferences = await this.preferenceService.getUserPreferences(userId);

            res.status(200).json({
                message: 'Préférences récupérées avec succès',
                count: preferences.length,
                preferences
            });
        } catch (error: any) {
            console.error('[PreferenceController] Error getting preferences:', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des préférences',
                error: error.message
            });
        }
    }

    /**
     * GET /api/users/me/search-preferences/available
     * Récupérer tous les groupes disponibles pour l'utilisateur
     */
    async getAvailableGroupes(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;

            console.log(`[PreferenceController] Getting available groupes for user ${userId}`);

            const groupes = await this.preferenceService.getAvailableGroupes(userId);

            res.status(200).json({
                message: 'Groupes disponibles récupérés avec succès',
                count: groupes.length,
                groupes
            });
        } catch (error: any) {
            console.error('[PreferenceController] Error getting available groupes:', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des groupes',
                error: error.message
            });
        }
    }

    /**
     * GET /api/users/me/search-preferences/stats
     * Récupérer les statistiques des préférences de l'utilisateur
     */
    async getPreferenceStats(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;

            console.log(`[PreferenceController] Getting preference stats for user ${userId}`);

            const [hasPreferences, enabledCount] = await Promise.all([
                this.preferenceService.hasPreferences(userId),
                this.preferenceService.getEnabledGroupsCount(userId)
            ]);

            res.status(200).json({
                message: 'Statistiques récupérées avec succès',
                stats: {
                    hasPreferences,
                    enabledGroupsCount: enabledCount
                }
            });
        } catch (error: any) {
            console.error('[PreferenceController] Error getting stats:', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des statistiques',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/users/me/search-preferences/:groupeId
     * Activer/Désactiver un groupe dans les préférences
     */
    async toggleGroupePreference(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { groupeId } = req.params;
            const { isEnabled } = req.body;

            // Validation
            if (typeof isEnabled !== 'boolean') {
                res.status(400).json({
                    message: 'Le champ isEnabled est requis et doit être un booléen'
                });
                return;
            }

            if (!groupeId) {
                res.status(400).json({
                    message: 'L\'ID du groupe est requis'
                });
                return;
            }

            console.log(`[PreferenceController] Toggling groupe ${groupeId} to ${isEnabled} for user ${userId}`);

            const preference = await this.preferenceService.toggleGroupePreference(
                userId,
                groupeId,
                isEnabled
            );

            res.status(200).json({
                message: `Groupe ${isEnabled ? 'activé' : 'désactivé'} avec succès`,
                preference
            });
        } catch (error: any) {
            console.error('[PreferenceController] Error toggling preference:', error);

            // Gestion d'erreurs spécifiques
            if (error.message.includes('ne fait pas partie de votre hiérarchie')) {
                res.status(403).json({
                    message: 'Accès refusé',
                    error: error.message
                });
                return;
            }

            res.status(400).json({
                message: 'Erreur lors de la modification de la préférence',
                error: error.message
            });
        }
    }

    /**
     * POST /api/users/me/search-preferences/reset
     * Réinitialiser les préférences aux valeurs par défaut
     */
    async resetPreferences(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;

            console.log(`[PreferenceController] Resetting preferences for user ${userId}`);

            await this.preferenceService.resetToDefaults(userId);

            res.status(200).json({
                message: 'Préférences réinitialisées aux valeurs par défaut'
            });
        } catch (error: any) {
            console.error('[PreferenceController] Error resetting preferences:', error);
            res.status(400).json({
                message: 'Erreur lors de la réinitialisation',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/users/me/search-preferences/order
     * Mettre à jour l'ordre d'affichage des préférences
     */
    async updateDisplayOrder(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { preferences } = req.body;

            // Validation
            if (!Array.isArray(preferences)) {
                res.status(400).json({
                    message: 'Le champ preferences doit être un tableau'
                });
                return;
            }

            // Valider la structure de chaque élément
            const isValid = preferences.every(pref =>
                pref.groupeId &&
                typeof pref.groupeId === 'string' &&
                typeof pref.order === 'number'
            );

            if (!isValid) {
                res.status(400).json({
                    message: 'Chaque préférence doit contenir groupeId (string) et order (number)'
                });
                return;
            }

            console.log(`[PreferenceController] Updating display order for user ${userId}`);

            await this.preferenceService.updateDisplayOrder(userId, preferences);

            res.status(200).json({
                message: 'Ordre des préférences mis à jour avec succès',
                updatedCount: preferences.length
            });
        } catch (error: any) {
            console.error('[PreferenceController] Error updating order:', error);
            res.status(400).json({
                message: 'Erreur lors de la mise à jour de l\'ordre',
                error: error.message
            });
        }
    }

    /**
     * POST /api/users/me/search-preferences/batch-toggle
     * Activer/Désactiver plusieurs groupes en une seule requête
     */
    async batchTogglePreferences(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { preferences } = req.body;

            // Validation
            if (!Array.isArray(preferences)) {
                res.status(400).json({
                    message: 'Le champ preferences doit être un tableau'
                });
                return;
            }

            const isValid = preferences.every(pref =>
                pref.groupeId &&
                typeof pref.groupeId === 'string' &&
                typeof pref.isEnabled === 'boolean'
            );

            if (!isValid) {
                res.status(400).json({
                    message: 'Chaque préférence doit contenir groupeId (string) et isEnabled (boolean)'
                });
                return;
            }

            console.log(`[PreferenceController] Batch toggling ${preferences.length} preferences for user ${userId}`);

            const results = [];
            const errors = [];

            for (const pref of preferences) {
                try {
                    const result = await this.preferenceService.toggleGroupePreference(
                        userId,
                        pref.groupeId,
                        pref.isEnabled
                    );
                    results.push(result);
                } catch (error: any) {
                    errors.push({
                        groupeId: pref.groupeId,
                        error: error.message
                    });
                }
            }

            res.status(200).json({
                message: 'Modification en lot terminée',
                success: results.length,
                failed: errors.length,
                results,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error: any) {
            console.error('[PreferenceController] Error in batch toggle:', error);
            res.status(400).json({
                message: 'Erreur lors de la modification en lot',
                error: error.message
            });
        }
    }
}

export const userSearchPreferenceController = new UserSearchPreferenceController();
