import { IsEmail, IsNotEmpty, IsString, IsOptional, Matches, IsUUID, IsEnum, IsBoolean } from 'class-validator';

/**
 * DTO de base pour l'import d'utilisateurs
 * Contient les champs communs pour les étudiants et enseignants
 * 
 * Exigences validées:
 * - 4.1: Validation que le matricule est présent et non-vide
 * - 4.2: Validation du format email
 * - 1.3: Validation alphanumérique du matricule
 */
export class BaseImportRowDto {
    @IsNotEmpty({ message: 'Matricule is required' })
    @IsString()
    @Matches(/^[a-zA-Z0-9]+$/, { message: 'Matricule must be alphanumeric' })
    matricule!: string;

    @IsNotEmpty({ message: 'First name is required' })
    @IsString()
    firstName!: string;

    @IsNotEmpty({ message: 'Last name is required' })
    @IsString()
    lastName!: string;

    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email!: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;
}

/**
 * DTO pour l'import d'étudiants
 * Étend BaseImportRowDto avec le champ classeId
 * 
 * Exigences validées:
 * - 3.3: Colonnes attendues pour les étudiants incluent classeId
 * - 4.4: Validation que classeId référence une classe existante
 */
export class StudentImportRowDto extends BaseImportRowDto {
    @IsNotEmpty({ message: 'Class ID is required' })
    @IsUUID('4', { message: 'Class ID must be a valid UUID' })
    classeId!: string;
}

/**
 * DTO pour l'import d'enseignants
 * Étend BaseImportRowDto avec le champ matiereIds
 * 
 * Exigences validées:
 * - 3.4: Colonnes attendues pour les enseignants incluent matiereIds
 * - 4.5: Validation que matiereIds référencent des matières existantes
 */
export class TeacherImportRowDto extends BaseImportRowDto {
    @IsNotEmpty({ message: 'Subject IDs are required' })
    @IsString()
    matiereIds!: string; // Comma-separated UUIDs
}

/**
 * DTO pour la requête d'import
 * Définit le type d'utilisateur à importer et les options d'envoi d'email
 * 
 * Exigences validées:
 * - 8.5: Paramètre pour activer/désactiver l'envoi d'emails
 */
export class ImportRequestDto {
    @IsEnum(['student', 'teacher'], { message: 'User type must be either "student" or "teacher"' })
    userType!: 'student' | 'teacher';

    @IsOptional()
    @IsBoolean({ message: 'Send email must be a boolean value' })
    sendEmail?: boolean;
}

/**
 * Interface pour les erreurs d'import
 * Représente une erreur survenue lors du traitement d'une ligne
 * 
 * Exigences validées:
 * - 4.8: Enregistrement des erreurs avec numéro de ligne et champ concerné
 * - 7.5: Liste des erreurs avec descriptions dans le rapport
 */
export interface ImportError {
    row: number;
    field?: string;
    message: string;
    data?: any;
}

/**
 * Interface pour le rapport d'import
 * Contient toutes les statistiques et détails d'une opération d'import
 * 
 * Exigences validées:
 * - 7.1: Génération d'un rapport après chaque import
 * - 7.2: Nombre total de lignes traitées
 * - 7.3: Nombre d'utilisateurs créés avec succès
 * - 7.4: Nombre de lignes avec erreurs de validation
 * - 7.5: Liste des erreurs avec numéros de ligne et descriptions
 * - 7.6: Liste des doublons (emails ou matricules) détectés
 * - 7.7: Retour du rapport dans la réponse API
 */
export interface ImportReport {
    totalRows: number;
    successCount: number;
    errorCount: number;
    duplicateCount: number;
    errors: ImportError[];
    duplicates: Array<{ row: number; field: string; value: string }>;
    createdUsers: Array<{ email: string; matricule: string }>;
}
