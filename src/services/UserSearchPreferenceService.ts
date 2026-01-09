import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entity/user";
import { UserSearchPreference } from "../entity/user.search.preference";
import { GroupePartage } from "../entity/groupe.partage";
import { Class } from "../entity/classe";

/**
 * Service de gestion des préférences de recherche des utilisateurs
 * Permet aux étudiants de configurer quels groupes apparaissent dans leurs résultats de recherche
 */
export class UserSearchPreferenceService {
    private preferenceRepository = AppDataSource.getRepository(UserSearchPreference);
    private userRepository = AppDataSource.getRepository(User);
    private groupePartageRepository = AppDataSource.getRepository(GroupePartage);
    private classRepository = AppDataSource.getRepository(Class);

    /**
     * Créer les préférences par défaut pour un étudiant
     * Par défaut : Seul le groupe de sa classe est activé
     * 
     * @param userId - ID de l'étudiant
     * @param classeId - ID de la classe
     * @throws Error si l'utilisateur n'est pas un étudiant ou si la classe n'existe pas
     */
    async createDefaultPreferences(userId: string, classeId: string): Promise<void> {
        console.log(`[SearchPreference] Creating default preferences for user ${userId} in class ${classeId}`);

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        if (user.role !== UserRole.ETUDIANT) {
            console.log(`[SearchPreference] User ${userId} is not a student (role: ${user.role}), skipping preference creation`);
            return;
        }

        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['groupePartage']
        });

        if (!classe || !classe.groupePartage) {
            throw new Error('Classe ou groupe de classe introuvable');
        }

        // Vérifier si des préférences existent déjà
        const existingPrefs = await this.preferenceRepository.find({
            where: { user: { id: userId } }
        });

        if (existingPrefs.length > 0) {
            console.log(`[SearchPreference] Preferences already exist for user ${userId}, skipping`);
            return;
        }

        // Créer la préférence par défaut : Groupe de la classe activé
        const defaultPref = this.preferenceRepository.create({
            user,
            groupePartage: classe.groupePartage,
            isEnabled: true,
            isDefault: true,
            displayOrder: 1
        });

        await this.preferenceRepository.save(defaultPref);
        console.log(`✅ [SearchPreference] Default preferences created for student ${userId} (Class: ${classe.className})`);
    }

    /**
     * Récupérer toutes les préférences d'un utilisateur
     * 
     * @param userId - ID de l'utilisateur
     * @returns Liste des préférences avec relations
     */
    async getUserPreferences(userId: string): Promise<UserSearchPreference[]> {
        return await this.preferenceRepository.find({
            where: { user: { id: userId } },
            relations: [
                'groupePartage',
                'groupePartage.classe',
                'groupePartage.filiere',
                'groupePartage.ecole',
                'groupePartage.matiere'
            ],
            order: { displayOrder: 'ASC' }
        });
    }

    /**
     * Récupérer les IDs des groupes activés pour la recherche
     * 
     * @param userId - ID de l'utilisateur
     * @returns Liste des IDs de groupes activés
     */
    async getEnabledGroupeIds(userId: string): Promise<string[]> {
        const preferences = await this.preferenceRepository.find({
            where: {
                user: { id: userId },
                isEnabled: true
            },
            relations: ['groupePartage']
        });

        const groupeIds = preferences.map(pref => pref.groupePartage.id);
        console.log(`[SearchPreference] User ${userId} has ${groupeIds.length} enabled groups`);

        return groupeIds;
    }

    /**
     * Récupérer tous les groupes disponibles pour un étudiant
     * (Groupes de sa hiérarchie : classe, matières, filière, école)
     * 
     * @param userId - ID de l'utilisateur
     * @returns Liste des groupes disponibles
     */
    async getAvailableGroupes(userId: string): Promise<GroupePartage[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: [
                'classe',
                'classe.groupePartage',
                'classe.matieres',
                'classe.matieres.groupePartage',
                'classe.filiere',
                'classe.filiere.groupePartage',
                'classe.filiere.school',
                'classe.filiere.school.groupePartage'
            ]
        });

        if (!user || !user.classe) {
            console.log(`[SearchPreference] User ${userId} has no class, returning empty list`);
            return [];
        }

        const groupes: GroupePartage[] = [];

        // Groupe de la classe
        if (user.classe.groupePartage) {
            groupes.push(user.classe.groupePartage);
        }

        // Groupes des matières
        if (user.classe.matieres) {
            user.classe.matieres.forEach((matiere: any) => {
                if (matiere.groupePartage) {
                    groupes.push(matiere.groupePartage);
                }
            });
        }

        // Groupe de la filière
        if (user.classe.filiere?.groupePartage) {
            groupes.push(user.classe.filiere.groupePartage);
        }

        // Groupe de l'école
        if (user.classe.filiere?.school?.groupePartage) {
            groupes.push(user.classe.filiere.school.groupePartage);
        }

        console.log(`[SearchPreference] User ${userId} has ${groupes.length} available groups`);
        return groupes;
    }

    /**
     * Activer/Désactiver un groupe dans les préférences
     * 
     * @param userId - ID de l'utilisateur
     * @param groupeId - ID du groupe
     * @param isEnabled - État d'activation
     * @returns Préférence mise à jour
     * @throws Error si le groupe ne fait pas partie de la hiérarchie de l'utilisateur
     */
    async toggleGroupePreference(userId: string, groupeId: string, isEnabled: boolean): Promise<UserSearchPreference> {
        console.log(`[SearchPreference] Toggling groupe ${groupeId} to ${isEnabled} for user ${userId}`);

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('Utilisateur introuvable');
        }

        // Vérifier si la préférence existe déjà
        let preference = await this.preferenceRepository.findOne({
            where: {
                user: { id: userId },
                groupePartage: { id: groupeId }
            },
            relations: ['groupePartage']
        });

        if (preference) {
            // Mettre à jour la préférence existante
            preference.isEnabled = isEnabled;
            const updated = await this.preferenceRepository.save(preference);
            console.log(`✅ [SearchPreference] Updated preference for groupe ${groupeId}`);
            return updated;
        } else {
            // Créer une nouvelle préférence
            const groupe = await this.groupePartageRepository.findOne({ where: { id: groupeId } });
            if (!groupe) {
                throw new Error('Groupe introuvable');
            }

            // Vérifier que le groupe fait partie de la hiérarchie de l'étudiant
            const availableGroupes = await this.getAvailableGroupes(userId);
            if (!availableGroupes.some(g => g.id === groupeId)) {
                throw new Error('Ce groupe ne fait pas partie de votre hiérarchie');
            }

            preference = this.preferenceRepository.create({
                user,
                groupePartage: groupe,
                isEnabled,
                isDefault: false,
                displayOrder: 99 // Mettre à la fin par défaut
            });

            const created = await this.preferenceRepository.save(preference);
            console.log(`✅ [SearchPreference] Created new preference for groupe ${groupeId}`);
            return created;
        }
    }

    /**
     * Réinitialiser les préférences aux valeurs par défaut
     * Supprime toutes les préférences et recrée la préférence par défaut (classe uniquement)
     * 
     * @param userId - ID de l'utilisateur
     */
    async resetToDefaults(userId: string): Promise<void> {
        console.log(`[SearchPreference] Resetting preferences to defaults for user ${userId}`);

        // Supprimer toutes les préférences existantes
        await this.preferenceRepository.delete({ user: { id: userId } });

        // Récréer les préférences par défaut
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['classe']
        });

        if (user && user.classe) {
            await this.createDefaultPreferences(userId, user.classe.id);
            console.log(`✅ [SearchPreference] Preferences reset to defaults for user ${userId}`);
        } else {
            console.warn(`[SearchPreference] User ${userId} has no class, cannot reset preferences`);
        }
    }

    /**
     * Mettre à jour l'ordre d'affichage des préférences
     * 
     * @param userId - ID de l'utilisateur
     * @param preferences - Liste des préférences avec leur nouvel ordre
     */
    async updateDisplayOrder(userId: string, preferences: { groupeId: string, order: number }[]): Promise<void> {
        console.log(`[SearchPreference] Updating display order for user ${userId}`);

        for (const pref of preferences) {
            await this.preferenceRepository.update(
                {
                    user: { id: userId },
                    groupePartage: { id: pref.groupeId }
                },
                { displayOrder: pref.order }
            );
        }

        console.log(`✅ [SearchPreference] Display order updated for ${preferences.length} preferences`);
    }

    /**
     * Vérifier si un utilisateur a des préférences configurées
     * 
     * @param userId - ID de l'utilisateur
     * @returns true si l'utilisateur a des préférences
     */
    async hasPreferences(userId: string): Promise<boolean> {
        const count = await this.preferenceRepository.count({
            where: { user: { id: userId } }
        });
        return count > 0;
    }

    /**
     * Obtenir le nombre de groupes activés pour un utilisateur
     * 
     * @param userId - ID de l'utilisateur
     * @returns Nombre de groupes activés
     */
    async getEnabledGroupsCount(userId: string): Promise<number> {
        return await this.preferenceRepository.count({
            where: {
                user: { id: userId },
                isEnabled: true
            }
        });
    }
}
