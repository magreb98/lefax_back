import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entity/user";
import { Class } from "../entity/classe";
import { GroupePartage } from "../entity/groupe.partage";
import { QueryRunner } from "typeorm";

/**
 * Service centralisé pour l'inscription automatique des étudiants dans les groupes
 * Utilise des transactions atomiques et des batch operations pour optimiser les performances
 */
export class AutoGroupEnrollmentService {
    private userRepository = AppDataSource.getRepository(User);
    private classRepository = AppDataSource.getRepository(Class);
    private groupePartageRepository = AppDataSource.getRepository(GroupePartage);

    // Métriques pour monitoring
    private metrics = {
        enrollments: 0,
        unenrollments: 0,
        batchEnrollments: 0,
        errors: 0,
        totalDuration: 0,
        avgDuration: 0
    };

    /**
     * Inscrire automatiquement un étudiant dans tous les groupes de sa hiérarchie
     * (Groupe Classe + Groupes Matières + Groupe Filière + Groupe École)
     * 
     * MÉTHODE UNIQUE ET ATOMIQUE avec transaction
     * 
     * @param userId - ID de l'étudiant à inscrire
     * @param classeId - ID de la classe
     * @param transactionalManager - Optionnel: EntityManager transactionnel parent
     * @throws Error si l'utilisateur ou la classe n'existe pas
     */
    async enrollStudentInClassHierarchy(userId: string, classeId: string, transactionalManager?: any): Promise<void> {
        const startTime = Date.now();
        // Si un manager externe est fourni, on l'utilise directement sans créer de nouvelle transaction
        const manager = transactionalManager || AppDataSource.manager;

        // Si pas de manager externe, on crée un QueryRunner pour gérer notre propre transaction
        let queryRunner: QueryRunner | null = null;

        if (!transactionalManager) {
            queryRunner = AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const entityManager = transactionalManager || queryRunner!.manager;

            console.log(`[AutoEnrollment] Starting enrollment for user ${userId} in class ${classeId}`);

            // 2. Récupérer la classe avec TOUTES les relations nécessaires en une seule requête
            const classe = await entityManager.findOne(Class, {
                where: { id: classeId },
                relations: [
                    'groupePartage',
                    'matieres',
                    'matieres.groupePartage',
                    'filiere',
                    'filiere.groupePartage',
                    'filiere.school',
                    'filiere.school.groupePartage'
                ]
            });

            if (!classe) {
                throw new Error(`Classe ${classeId} non trouvée`);
            }

            console.log(`[AutoEnrollment] Class found: ${classe.className}`);
            console.log(`[AutoEnrollment] Filiere: ${classe.filiere?.name || 'N/A'}`);
            console.log(`[AutoEnrollment] School: ${classe.filiere?.school?.schoolName || 'N/A'}`);

            // 1. Mettre à jour l'utilisateur (Classe, Ecole, Rôle)
            const user = await entityManager.findOne(User, {
                where: { id: userId }
            });

            if (!user) {
                throw new Error(`Utilisateur ${userId} non trouvé`);
            }

            let userUpdated = false;

            // Mettre à jour la classe
            if (user.classe?.id !== classe.id) {
                user.classe = classe;
                userUpdated = true;
                console.log(`[AutoEnrollment] Setting user ${userId} class to ${classe.id}`);
            }

            // Mettre à jour l'école (via la filière de la classe)
            if (classe.filiere?.school) {
                if (user.school?.id !== classe.filiere.school.id) {
                    user.school = classe.filiere.school;
                    userUpdated = true;
                    console.log(`[AutoEnrollment] Setting user ${userId} school to ${classe.filiere.school.id}`);
                }
            }

            // Mettre à jour le rôle en ETUDIANT si nécessaire
            if (user.role !== UserRole.ADMIN &&
                user.role !== UserRole.SUPERADMIN &&
                user.role !== UserRole.ENSEIGNANT &&
                user.role !== UserRole.ETUDIANT) {

                console.log(`[AutoEnrollment] Updating user ${userId} role to ETUDIANT (current: ${user.role})`);
                user.role = UserRole.ETUDIANT;
                userUpdated = true;
            }

            if (userUpdated) {
                await entityManager.save(user);
                console.log(`[AutoEnrollment] User ${userId} updated and saved`);
            }

            // 3. Collecter TOUS les IDs de groupes en une seule passe
            const groupeIds: string[] = [];

            // Groupe de la classe
            if (classe.groupePartage?.id) {
                groupeIds.push(classe.groupePartage.id);
                console.log(`[AutoEnrollment] Added class group: ${classe.groupePartage.id}`);
            } else {
                console.warn(`[AutoEnrollment] Class ${classeId} has no GroupePartage`);
            }

            // Groupes des matières
            if (classe.matieres && classe.matieres.length > 0) {
                classe.matieres.forEach((matiere: any) => {
                    if (matiere.groupePartage?.id) {
                        groupeIds.push(matiere.groupePartage.id);
                        console.log(`[AutoEnrollment] Added matiere group: ${matiere.groupePartage.id} (${matiere.matiereName})`);
                    }
                });
                console.log(`[AutoEnrollment] Found ${classe.matieres.length} matieres for class ${classeId}`);
            }

            // Groupe de la filière
            if (classe.filiere?.groupePartage?.id) {
                groupeIds.push(classe.filiere.groupePartage.id);
                console.log(`[AutoEnrollment] Added filiere group: ${classe.filiere.groupePartage.id}`);
            } else {
                console.warn(`[AutoEnrollment] Filiere group missing or filiere not linked`);
            }

            // Groupe de l'école
            if (classe.filiere?.school?.groupePartage?.id) {
                groupeIds.push(classe.filiere.school.groupePartage.id);
                console.log(`[AutoEnrollment] Added school group: ${classe.filiere.school.groupePartage.id}`);
            } else {
                console.warn(`[AutoEnrollment] School group missing or school not linked via filiere`);
            }

            // 4. Batch Insert - UNE SEULE requête pour tous les groupes
            if (groupeIds.length > 0) {
                // Utilisation de la méthode adaptée selon le contexte (EntityManager vs QueryRunner)
                // Pour simplifier, on peut faire des inserts individuels si on est en EntityManager pur sans accès queryRunner facile
                // Ou alors refactoriser batchAddUserToGroups pour accepter EntityManager

                // Pour l'instant, faisons une insertion simple via le repository/manager pour être compatible
                // avec les deux modes (QueryRunner et EntityManager)

                const existingMemberships = await entityManager.createQueryBuilder()
                    .select("gpu.groupe_partage_id", "groupe_partage_id")
                    .from("groupe_partage_users", "gpu")
                    .where("gpu.user_id = :userId", { userId })
                    .andWhere("gpu.groupe_partage_id IN (:...groupeIds)", { groupeIds })
                    .getRawMany();

                console.log(`[AutoEnrollment] Existing memberships:`, existingMemberships);

                const existingGroupIds = new Set(existingMemberships.map((m: any) => m.groupe_partage_id));
                const newGroupIds = groupeIds.filter(id => !existingGroupIds.has(id));

                console.log(`[AutoEnrollment] Total groups: ${groupeIds.length}, Existing: ${existingGroupIds.size}, New: ${newGroupIds.length}`);

                if (newGroupIds.length > 0) {
                    const values = newGroupIds.map(groupeId =>
                        `('${groupeId}', '${userId}')`
                    ).join(', ');

                    await entityManager.query(
                        `INSERT IGNORE INTO groupe_partage_users (groupe_partage_id, user_id) VALUES ${values}`
                    );
                    console.log(`[AutoEnrollment] Inserted user into ${newGroupIds.length} new groups`);
                }
            } else {
                console.warn(`[AutoEnrollment] No groups found for class ${classeId}`);
            }

            // 5. Commit de la transaction SI on a créé le QueryRunner
            if (queryRunner) {
                await queryRunner.commitTransaction();
            }

            const duration = Date.now() - startTime;
            this.updateMetrics('enrollment', duration);

            console.log(`✅ [AutoEnrollment] Student ${userId} enrolled in ${groupeIds.length} groups for class ${classeId} (${duration}ms)`);
        } catch (error) {
            // Rollback en cas d'erreur SI on a créé le QueryRunner
            if (queryRunner) {
                await queryRunner.rollbackTransaction();
            }
            this.metrics.errors++;

            console.error(`❌ [AutoEnrollment] Failed to enroll student ${userId} in class ${classeId}:`, error);
            throw error;
        } finally {
            // Libérer la connexion SI on a créé le QueryRunner
            if (queryRunner) {
                await queryRunner.release();
            }
        }
    }

    /**
     * Ajouter un utilisateur à plusieurs groupes en une seule requête
     * Utilise INSERT avec ON CONFLICT pour éviter les doublons
     * 
     * @param queryRunner - QueryRunner pour la transaction
     * @param userId - ID de l'utilisateur
     * @param groupeIds - Liste des IDs de groupes
     */
    private async batchAddUserToGroups(
        queryRunner: QueryRunner,
        userId: string,
        groupeIds: string[]
    ): Promise<void> {
        if (groupeIds.length === 0) {
            return;
        }

        // Construire les valeurs pour l'insert
        const values = groupeIds.map(groupeId =>
            `('${groupeId}', '${userId}')`
        ).join(', ');

        // Insert avec ON CONFLICT pour éviter les doublons
        // Note: La syntaxe peut varier selon la base de données (PostgreSQL, MySQL, etc.)
        const query = `
            INSERT IGNORE INTO groupe_partage_users (groupe_partage_id, user_id)
            VALUES ${values}
        `;

        try {
            await queryRunner.query(query);
            console.log(`[AutoEnrollment] Batch insert completed for ${groupeIds.length} groups`);
        } catch (error) {
            console.error(`[AutoEnrollment] Batch insert failed:`, error);
            throw error;
        }
    }

    /**
     * Retirer un étudiant de tous les groupes d'une classe
     * Utilise une transaction pour garantir l'atomicité
     * 
     * @param userId - ID de l'étudiant
     * @param classeId - ID de la classe
     */
    async unenrollStudentFromClassHierarchy(userId: string, classeId: string): Promise<void> {
        const startTime = Date.now();
        const queryRunner = AppDataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            console.log(`[AutoEnrollment] Starting unenrollment for user ${userId} from class ${classeId}`);

            // Récupérer la classe avec toutes les relations
            const classe = await queryRunner.manager.findOne(Class, {
                where: { id: classeId },
                relations: [
                    'groupePartage',
                    'matieres',
                    'matieres.groupePartage',
                    'filiere',
                    'filiere.groupePartage',
                    'filiere.school',
                    'filiere.school.groupePartage'
                ]
            });

            if (!classe) {
                throw new Error(`Classe ${classeId} non trouvée`);
            }

            // Collecter tous les IDs de groupes
            const groupeIds: string[] = [];

            if (classe.groupePartage?.id) {
                groupeIds.push(classe.groupePartage.id);
            }

            if (classe.matieres) {
                classe.matieres.forEach((matiere: any) => {
                    if (matiere.groupePartage?.id) {
                        groupeIds.push(matiere.groupePartage.id);
                    }
                });
            }

            if (classe.filiere?.groupePartage?.id) {
                groupeIds.push(classe.filiere.groupePartage.id);
            }

            if (classe.filiere?.school?.groupePartage?.id) {
                groupeIds.push(classe.filiere.school.groupePartage.id);
            }

            // Batch Delete
            if (groupeIds.length > 0) {
                await this.batchRemoveUserFromGroups(queryRunner, userId, groupeIds);
                console.log(`[AutoEnrollment] Successfully removed user from ${groupeIds.length} groups`);
            }

            await queryRunner.commitTransaction();

            const duration = Date.now() - startTime;
            this.updateMetrics('unenrollment', duration);

            console.log(`✅ [AutoEnrollment] Student ${userId} unenrolled from ${groupeIds.length} groups for class ${classeId} (${duration}ms)`);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.metrics.errors++;

            console.error(`❌ [AutoEnrollment] Failed to unenroll student ${userId} from class ${classeId}:`, error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Retirer un utilisateur de plusieurs groupes en une seule requête
     * 
     * @param queryRunner - QueryRunner pour la transaction
     * @param userId - ID de l'utilisateur
     * @param groupeIds - Liste des IDs de groupes
     */
    private async batchRemoveUserFromGroups(
        queryRunner: QueryRunner,
        userId: string,
        groupeIds: string[]
    ): Promise<void> {
        if (groupeIds.length === 0) {
            return;
        }

        // Construire la condition WHERE avec IN
        const groupeIdsStr = groupeIds.map(id => `'${id}'`).join(', ');

        const query = `
            DELETE FROM groupe_partage_users
            WHERE user_id = '${userId}' AND groupe_partage_id IN (${groupeIdsStr})
        `;

        try {
            await queryRunner.query(query);
            console.log(`[AutoEnrollment] Batch delete completed for ${groupeIds.length} groups`);
        } catch (error) {
            console.error(`[AutoEnrollment] Batch delete failed:`, error);
            throw error;
        }
    }

    /**
     * Inscrire plusieurs étudiants dans une classe en batch
     * Optimisé pour les inscriptions massives
     * 
     * @param userIds - Liste des IDs d'étudiants
     * @param classeId - ID de la classe
     */
    async batchEnrollStudents(userIds: string[], classeId: string): Promise<void> {
        const startTime = Date.now();
        console.log(`[AutoEnrollment] Starting batch enrollment for ${userIds.length} students in class ${classeId}`);

        let successCount = 0;
        let errorCount = 0;

        for (const userId of userIds) {
            try {
                await this.enrollStudentInClassHierarchy(userId, classeId);
                successCount++;
            } catch (error) {
                console.error(`[AutoEnrollment] Failed to enroll student ${userId}:`, error);
                errorCount++;
            }
        }

        const duration = Date.now() - startTime;
        this.metrics.batchEnrollments++;

        console.log(`✅ [AutoEnrollment] Batch enrollment completed: ${successCount} success, ${errorCount} errors (${duration}ms)`);
        console.log(`[AutoEnrollment] Average time per student: ${Math.round(duration / userIds.length)}ms`);
    }

    /**
     * Mettre à jour les métriques de performance
     */
    private updateMetrics(type: 'enrollment' | 'unenrollment', duration: number): void {
        if (type === 'enrollment') {
            this.metrics.enrollments++;
        } else {
            this.metrics.unenrollments++;
        }

        this.metrics.totalDuration += duration;
        const totalOps = this.metrics.enrollments + this.metrics.unenrollments;
        this.metrics.avgDuration = Math.round(this.metrics.totalDuration / totalOps);
    }

    /**
     * Récupérer les métriques de performance
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.enrollments + this.metrics.unenrollments > 0
                ? ((this.metrics.enrollments + this.metrics.unenrollments) /
                    (this.metrics.enrollments + this.metrics.unenrollments + this.metrics.errors) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Réinitialiser les métriques
     */
    resetMetrics(): void {
        this.metrics = {
            enrollments: 0,
            unenrollments: 0,
            batchEnrollments: 0,
            errors: 0,
            totalDuration: 0,
            avgDuration: 0
        };
    }
}
