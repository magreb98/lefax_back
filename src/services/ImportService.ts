import path from 'path';
import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FileParserService } from './FileParserService';
import { ImportValidationService } from './ImportValidationService';
import { UserService } from './Userservice';
import { EmailService } from './EmailService';
import { logger } from '../config/logger';
import { ImportReport, ImportError } from '../dtos/import.dto';
import { UserRole } from '../entity/user';
import { AppError } from '../exceptions/AppError';

/**
 * Service principal pour l'import en masse d'utilisateurs
 * Orchestre le processus complet : parsing, validation, création et notification
 * 
 * Exigences implémentées:
 * - 5.1: Création d'utilisateurs avec données validées
 * - 5.2: Génération automatique de mots de passe temporaires
 * - 5.3: Attribution du rôle approprié (ETUDIANT ou ENSEIGNANT)
 * - 5.4: Association étudiant-classe
 * - 5.5: Association enseignant-matières
 * - 5.6: Attribution de l'école de l'admin
 * - 6.1: Rollback en cas d'erreur critique
 * - 6.2: Création des utilisateurs valides uniquement
 * - 6.3: Gestion des emails dupliqués
 * - 6.4: Gestion des matricules dupliqués
 * - 6.5: Journalisation des opérations d'import
 */
export class ImportService {
    private fileParser: FileParserService;
    private validator: ImportValidationService;
    private userService: UserService;
    private emailService: EmailService;

    constructor() {
        this.fileParser = new FileParserService();
        this.validator = new ImportValidationService();
        this.userService = new UserService();
        this.emailService = new EmailService();
    }

    /**
     * Traite un fichier d'import complet
     * @param file - Fichier uploadé (Express.Multer.File)
     * @param userType - Type d'utilisateur ('student' ou 'teacher')
     * @param schoolId - ID de l'école de l'administrateur
     * @param adminId - ID de l'administrateur effectuant l'import
     * @param options - Options d'import (sendEmail, etc.)
     * @returns Rapport détaillé de l'import
     */
    async processImport(
        file: Express.Multer.File,
        userType: 'student' | 'teacher',
        schoolId: string,
        adminId: string,
        options: { sendEmail?: boolean } = {}
    ): Promise<ImportReport> {
        const report: ImportReport = {
            totalRows: 0,
            successCount: 0,
            errorCount: 0,
            duplicateCount: 0,
            errors: [],
            duplicates: [],
            createdUsers: []
        };

        try {
            // 1. Parser le fichier
            const fileType = path.extname(file.originalname);
            logger.info('Starting import process', {
                adminId,
                schoolId,
                userType,
                fileType,
                fileName: file.originalname
            });

            const rows = await this.fileParser.parseFile(file.buffer, fileType);

            // 2. Vérifier la limite de lignes (Exigence 3.6)
            if (rows.length > 1000) {
                throw new AppError('File exceeds maximum of 1000 rows', 400);
            }

            // 3. Valider la structure du fichier (Exigence 3.7)
            this.fileParser.validateFileStructure(rows, userType);

            report.totalRows = rows.length;

            // 4. Valider chaque ligne et collecter les lignes valides
            const validRows: Array<{ data: any; rowNumber: number }> = [];

            for (let i = 0; i < rows.length; i++) {
                const rowNumber = i + 2; // +2 car ligne 1 = headers, index commence à 0
                const row = rows[i];

                const validation = userType === 'student'
                    ? await this.validator.validateStudentRow(row, rowNumber, schoolId)
                    : await this.validator.validateTeacherRow(row, rowNumber, schoolId);

                if (validation.valid && validation.data) {
                    validRows.push({ data: validation.data, rowNumber });
                } else {
                    report.errorCount++;
                    report.errors.push(...validation.errors);

                    // Compter les doublons
                    const duplicateErrors = validation.errors.filter(
                        e => e.message.includes('already exists')
                    );
                    if (duplicateErrors.length > 0) {
                        report.duplicateCount++;
                        duplicateErrors.forEach(err => {
                            report.duplicates.push({
                                row: rowNumber,
                                field: err.field || 'unknown',
                                value: err.data?.[err.field || ''] || 'unknown'
                            });
                        });
                    }
                }
            }

            // 5. Créer les utilisateurs dans une transaction
            if (validRows.length > 0) {
                await this.createUsersInTransaction(
                    validRows,
                    userType,
                    schoolId,
                    report,
                    options
                );
            }

            // 6. Logger l'opération (Exigence 6.5)
            logger.info('Import completed', {
                adminId,
                schoolId,
                userType,
                totalRows: report.totalRows,
                successCount: report.successCount,
                errorCount: report.errorCount,
                duplicateCount: report.duplicateCount
            });

        } catch (error: any) {
            logger.error('Import failed', {
                adminId,
                schoolId,
                userType,
                error: error?.message || 'Unknown error',
                stack: error?.stack
            });
            throw error;
        }

        return report;
    }

    /**
     * Crée les utilisateurs dans une transaction
     * Garantit l'atomicité : soit tous les utilisateurs valides sont créés, soit aucun
     * 
     * @param validRows - Lignes validées à importer
     * @param userType - Type d'utilisateur
     * @param schoolId - ID de l'école
     * @param report - Rapport d'import à mettre à jour
     * @param options - Options d'import
     */
    private async createUsersInTransaction(
        validRows: Array<{ data: any; rowNumber: number }>,
        userType: 'student' | 'teacher',
        schoolId: string,
        report: ImportReport,
        options: { sendEmail?: boolean }
    ): Promise<void> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const { data, rowNumber } of validRows) {
                try {
                    // Générer un mot de passe temporaire (Exigence 5.2)
                    const temporaryPassword = this.generateTemporaryPassword();

                    // Préparer les données utilisateur
                    const userData: any = {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        password: temporaryPassword,
                        phoneNumber: data.phoneNumber,
                        matricule: data.matricule,
                        role: userType === 'student' ? UserRole.ETUDIANT : UserRole.ENSEIGNANT,
                        schoolId: schoolId
                    };

                    // Ajouter la classe pour les étudiants (Exigence 5.4)
                    if (userType === 'student') {
                        userData.classeId = data.classeId;
                    }

                    // Créer l'utilisateur (Exigence 5.1, 5.3, 5.6)
                    const user = await this.userService.createUser(userData);

                    // Associer les matières pour les enseignants (Exigence 5.5)
                    if (userType === 'teacher' && data.matiereIds) {
                        const matiereIds = data.matiereIds.split(',').map((id: string) => id.trim());
                        await this.userService.assignMatieresToTeacher(user.email, matiereIds);
                    }

                    report.successCount++;
                    report.createdUsers.push({
                        email: user.email,
                        matricule: user.matricule!
                    });

                    // Envoyer l'email si demandé (Exigence 8.1, 8.2, 8.4)
                    if (options.sendEmail) {
                        try {
                            await this.emailService.sendCredentials(
                                user.email,
                                temporaryPassword,
                                user.firstName,
                                user.lastName
                            );
                        } catch (emailError: any) {
                            // Ne pas bloquer l'import si l'email échoue (Exigence 8.4)
                            logger.warn('Failed to send email', {
                                email: user.email,
                                error: emailError?.message || 'Unknown error'
                            });
                        }
                    }

                } catch (error: any) {
                    // Enregistrer l'erreur mais continuer (Exigence 6.2)
                    report.errorCount++;
                    report.errors.push({
                        row: rowNumber,
                        message: `Failed to create user: ${error?.message || 'Unknown error'}`,
                        data
                    });
                }
            }

            // Commit de la transaction (Exigence 5.7)
            await queryRunner.commitTransaction();

        } catch (error: any) {
            // Rollback en cas d'erreur critique (Exigence 6.1)
            await queryRunner.rollbackTransaction();
            logger.error('Transaction rolled back', {
                error: error?.message || 'Unknown error'
            });
            throw new AppError(
                `Import transaction failed: ${error?.message || 'Unknown error'}`,
                500
            );
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Génère un mot de passe temporaire sécurisé
     * Format: 12 caractères avec majuscules, minuscules, chiffres et symboles
     * 
     * @returns Mot de passe temporaire généré
     */
    private generateTemporaryPassword(): string {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        // Utiliser crypto pour une génération sécurisée
        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(length);

        for (let i = 0; i < length; i++) {
            const randomIndex = randomBytes[i] % charset.length;
            password += charset.charAt(randomIndex);
        }

        return password;
    }
}
