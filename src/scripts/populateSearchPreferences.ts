import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entity/user";
import { UserSearchPreferenceService } from "../services/UserSearchPreferenceService";

/**
 * Script de peuplement des préférences de recherche
 * Crée les préférences par défaut pour tous les étudiants existants
 * 
 * Exécution : npm run ts-node src/scripts/populateSearchPreferences.ts
 */
async function populateSearchPreferences() {
    console.log('🌱 [Populate] Starting search preferences population...');
    console.log('='.repeat(60));

    try {
        // Initialiser la connexion à la base de données
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ [Populate] Database connected');
        }

        const userRepository = AppDataSource.getRepository(User);
        const preferenceService = new UserSearchPreferenceService();

        // Récupérer tous les étudiants qui ont une classe
        console.log('🔍 [Populate] Fetching students with classes...');

        const students = await userRepository.find({
            where: { role: UserRole.ETUDIANT },
            relations: ['classe']
        });

        console.log(`📊 [Populate] Found ${students.length} students`);
        console.log('='.repeat(60));

        let created = 0;
        let skipped = 0;
        let errors = 0;

        // Traiter chaque étudiant
        for (const student of students) {
            try {
                if (!student.classe) {
                    console.log(`⚠️  [Populate] Student ${student.id} (${student.firstName} ${student.lastName}) has no class - SKIPPED`);
                    skipped++;
                    continue;
                }

                // Vérifier si des préférences existent déjà
                const hasPreferences = await preferenceService.hasPreferences(student.id);

                if (hasPreferences) {
                    console.log(`ℹ️  [Populate] Student ${student.id} (${student.firstName} ${student.lastName}) already has preferences - SKIPPED`);
                    skipped++;
                    continue;
                }

                // Créer les préférences par défaut
                await preferenceService.createDefaultPreferences(student.id, student.classe.id);

                created++;
                console.log(`✅ [Populate] Created preferences for student ${student.id} (${student.firstName} ${student.lastName}) - Class: ${student.classe.className}`);
            } catch (error: any) {
                errors++;
                console.error(`❌ [Populate] Error for student ${student.id}:`, error.message);
            }
        }

        console.log('='.repeat(60));
        console.log('📈 [Populate] Migration Summary:');
        console.log(`   ✅ Created:  ${created}`);
        console.log(`   ⏭️  Skipped:  ${skipped}`);
        console.log(`   ❌ Errors:   ${errors}`);
        console.log(`   📊 Total:    ${students.length}`);
        console.log('='.repeat(60));

        if (errors > 0) {
            console.log('⚠️  [Populate] Some errors occurred during population');
        } else {
            console.log('🎉 [Populate] Population completed successfully!');
        }

        // Fermer la connexion
        await AppDataSource.destroy();
        console.log('✅ [Populate] Database connection closed');

    } catch (error) {
        console.error('❌ [Populate] Fatal error during population:', error);
        process.exit(1);
    }
}

// Exécuter le script si appelé directement
if (require.main === module) {
    populateSearchPreferences()
        .then(() => {
            console.log('✅ [Populate] Script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ [Populate] Script failed:', error);
            process.exit(1);
        });
}

export { populateSearchPreferences };
