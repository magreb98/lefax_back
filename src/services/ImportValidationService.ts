import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entity/user';
import { Class } from '../entity/classe';
import { Matiere } from '../entity/matiere';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { StudentImportRowDto, TeacherImportRowDto, ImportError } from '../dtos/import.dto';

/**
 * Service de validation pour l'import en masse d'utilisateurs
 * Valide chaque ligne d'import selon le type d'utilisateur (étudiant ou enseignant)
 */
export class ImportValidationService {
    private userRepository: Repository<User>;
    private classeRepository: Repository<Class>;
    private matiereRepository: Repository<Matiere>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.classeRepository = AppDataSource.getRepository(Class);
        this.matiereRepository = AppDataSource.getRepository(Matiere);
    }

    /**
     * Valide une ligne d'import pour un étudiant
     * @param row - Données brutes de la ligne
     * @param rowNumber - Numéro de ligne dans le fichier
     * @param schoolId - ID de l'école de l'administrateur
     * @returns Résultat de validation avec erreurs détaillées
     */
    async validateStudentRow(
        row: any,
        rowNumber: number,
        schoolId: string
    ): Promise<{ valid: boolean; errors: ImportError[]; data?: StudentImportRowDto }> {
        const errors: ImportError[] = [];

        // Validation du DTO avec class-validator
        const dto = plainToClass(StudentImportRowDto, row);
        const validationErrors = await validate(dto);

        if (validationErrors.length > 0) {
            // Convertir les erreurs de validation en ImportError
            for (const error of validationErrors) {
                const constraints = error.constraints || {};
                const messages = Object.values(constraints);
                errors.push({
                    row: rowNumber,
                    field: error.property,
                    message: messages.join(', '),
                    data: row
                });
            }
        }

        // Si les validations de base échouent, retourner immédiatement
        if (errors.length > 0) {
            return { valid: false, errors };
        }

        // Vérifier l'unicité de l'email
        const existingEmail = await this.userRepository.findOne({ 
            where: { email: dto.email } 
        });
        if (existingEmail) {
            errors.push({ 
                row: rowNumber, 
                field: 'email', 
                message: 'Email already exists',
                data: row
            });
        }

        // Vérifier l'unicité du matricule dans l'école
        const existingMatricule = await this.userRepository.findOne({
            where: { 
                matricule: dto.matricule, 
                school: { id: schoolId } 
            }
        });
        if (existingMatricule) {
            errors.push({ 
                row: rowNumber, 
                field: 'matricule', 
                message: 'Matricule already exists in this school',
                data: row
            });
        }

        // Vérifier que la classe existe
        const classe = await this.classeRepository.findOne({ 
            where: { id: dto.classeId } 
        });
        if (!classe) {
            errors.push({ 
                row: rowNumber, 
                field: 'classeId', 
                message: 'Class not found',
                data: row
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            data: errors.length === 0 ? dto : undefined
        };
    }

    /**
     * Valide une ligne d'import pour un enseignant
     * @param row - Données brutes de la ligne
     * @param rowNumber - Numéro de ligne dans le fichier
     * @param schoolId - ID de l'école de l'administrateur
     * @returns Résultat de validation avec erreurs détaillées
     */
    async validateTeacherRow(
        row: any,
        rowNumber: number,
        schoolId: string
    ): Promise<{ valid: boolean; errors: ImportError[]; data?: TeacherImportRowDto }> {
        const errors: ImportError[] = [];

        // Validation du DTO avec class-validator
        const dto = plainToClass(TeacherImportRowDto, row);
        const validationErrors = await validate(dto);

        if (validationErrors.length > 0) {
            // Convertir les erreurs de validation en ImportError
            for (const error of validationErrors) {
                const constraints = error.constraints || {};
                const messages = Object.values(constraints);
                errors.push({
                    row: rowNumber,
                    field: error.property,
                    message: messages.join(', '),
                    data: row
                });
            }
        }

        // Si les validations de base échouent, retourner immédiatement
        if (errors.length > 0) {
            return { valid: false, errors };
        }

        // Vérifier l'unicité de l'email
        const existingEmail = await this.userRepository.findOne({ 
            where: { email: dto.email } 
        });
        if (existingEmail) {
            errors.push({ 
                row: rowNumber, 
                field: 'email', 
                message: 'Email already exists',
                data: row
            });
        }

        // Vérifier l'unicité du matricule dans l'école
        const existingMatricule = await this.userRepository.findOne({
            where: { 
                matricule: dto.matricule, 
                school: { id: schoolId } 
            }
        });
        if (existingMatricule) {
            errors.push({ 
                row: rowNumber, 
                field: 'matricule', 
                message: 'Matricule already exists in this school',
                data: row
            });
        }

        // Vérifier que toutes les matières existent
        const matiereIds = dto.matiereIds.split(',').map((id: string) => id.trim());
        for (const matiereId of matiereIds) {
            const matiere = await this.matiereRepository.findOne({ 
                where: { id: matiereId } 
            });
            if (!matiere) {
                errors.push({ 
                    row: rowNumber, 
                    field: 'matiereIds', 
                    message: `Subject ${matiereId} not found`,
                    data: row
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            data: errors.length === 0 ? dto : undefined
        };
    }
}
