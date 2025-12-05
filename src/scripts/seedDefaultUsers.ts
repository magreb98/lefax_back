import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entity/user';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger';

/**
 * Seed par défaut pour créer des utilisateurs de test pour chaque rôle
 * Exécuté automatiquement au démarrage de l'application
 */
export const seedDefaultUsers = async () => {
    try {
        const userRepository = AppDataSource.getRepository(User);

        // Définition des utilisateurs par défaut pour chaque rôle
        const defaultUsers = [
            {
                email: 'superadmin@lefax.com',
                password: 'SuperAdmin123!',
                firstName: 'Super',
                lastName: 'Admin',
                phoneNumber: '+221771234567',
                role: UserRole.SUPERADMIN,
                isVerified: true,
                isActive: true,
                canCreateSchool: true
            },
            {
                email: 'admin@lefax.com',
                password: 'Admin123!',
                firstName: 'School',
                lastName: 'Admin',
                phoneNumber: '+221772345678',
                role: UserRole.ADMIN,
                isVerified: true,
                isActive: true,
                canCreateSchool: true
            },
            {
                email: 'enseignant@lefax.com',
                password: 'Teacher123!',
                firstName: 'Jean',
                lastName: 'Professeur',
                phoneNumber: '+221773456789',
                role: UserRole.ENSEIGNANT,
                isVerified: true,
                isActive: true
            },
            {
                email: 'etudiant@lefax.com',
                password: 'Student123!',
                firstName: 'Marie',
                lastName: 'Étudiant',
                phoneNumber: '+221774567890',
                role: UserRole.ETUDIANT,
                isVerified: true,
                isActive: true
            },
            {
                email: 'user@lefax.com',
                password: 'User123!',
                firstName: 'Basic',
                lastName: 'User',
                phoneNumber: '+221775678901',
                role: UserRole.USER,
                isVerified: true,
                isActive: true
            }
        ];

        let createdCount = 0;
        let skippedCount = 0;

        for (const userData of defaultUsers) {
            // Vérifier si l'utilisateur existe déjà
            const existingUser = await userRepository.findOne({
                where: { email: userData.email }
            });

            if (existingUser) {
                logger.info(`ℹ️  Utilisateur ${userData.role} existe déjà: ${userData.email}`);
                skippedCount++;
                continue;
            }

            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Créer le nouvel utilisateur
            const newUser = userRepository.create({
                ...userData,
                password: hashedPassword
            });

            await userRepository.save(newUser);
            logger.info(`✅ Utilisateur ${userData.role} créé: ${userData.email}`);
            createdCount++;
        }

        if (createdCount > 0) {
            logger.info(`\n🎉 Seed terminé: ${createdCount} utilisateur(s) créé(s), ${skippedCount} ignoré(s)\n`);
            logger.info('📝 Identifiants de connexion par défaut:');
            logger.info('-----------------------------------');
            defaultUsers.forEach(user => {
                logger.info(`${user.role.toUpperCase().padEnd(15)} | ${user.email.padEnd(30)} | ${user.password}`);
            });
            logger.info('-----------------------------------\n');
        } else {
            logger.info(`ℹ️  Aucun utilisateur créé (${skippedCount} déjà existant(s))`);
        }

    } catch (error) {
        logger.error('❌ Erreur lors du seed des utilisateurs par défaut:', error);
        throw error;
    }
};
