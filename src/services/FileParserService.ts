import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { AppError } from '../exceptions/AppError';

/**
 * Service responsable du parsing de fichiers Excel et CSV
 * pour l'import en masse d'utilisateurs
 */
export class FileParserService {
    /**
     * Parse un fichier Excel ou CSV en fonction de son extension
     * @param file - Buffer du fichier uploadé
     * @param fileType - Extension du fichier (.xlsx ou .csv)
     * @returns Array d'objets représentant les lignes du fichier
     * @throws AppError si le type de fichier n'est pas supporté
     */
    async parseFile(file: Buffer, fileType: string): Promise<any[]> {
        const normalizedType = fileType.toLowerCase();
        
        if (normalizedType === '.xlsx') {
            return this.parseExcel(file);
        } else if (normalizedType === '.csv') {
            return this.parseCsv(file);
        }
        
        throw new AppError('Unsupported file type. Only .xlsx and .csv are allowed', 400);
    }

    /**
     * Parse un fichier Excel (.xlsx)
     * @param file - Buffer du fichier Excel
     * @returns Array d'objets représentant les lignes
     */
    private async parseExcel(file: Buffer): Promise<any[]> {
        try {
            // Lire le workbook depuis le buffer
            const workbook = XLSX.read(file, { type: 'buffer' });
            
            // Vérifier qu'il y a au moins une feuille
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new AppError('Excel file is empty or has no sheets', 400);
            }
            
            // Récupérer la première feuille
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir la feuille en array d'objets
            // header: 1 signifie que la première ligne contient les en-têtes
            const data = XLSX.utils.sheet_to_json(worksheet, { 
                raw: false, // Convertir les valeurs en strings
                defval: '' // Valeur par défaut pour les cellules vides
            });
            
            return data;
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to parse Excel file: ${error?.message || 'Unknown error'}`, 400);
        }
    }

    /**
     * Parse un fichier CSV
     * @param file - Buffer du fichier CSV
     * @returns Array d'objets représentant les lignes
     */
    private async parseCsv(file: Buffer): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const results: any[] = [];
            
            // Créer un stream readable depuis le buffer
            const stream = Readable.from(file);
            
            stream
                .pipe(csv({
                    separator: ',', // Délimiteur virgule
                    mapHeaders: ({ header }: { header: string }) => header.trim(), // Nettoyer les en-têtes
                    mapValues: ({ value }: { value: string }) => value.trim() // Nettoyer les valeurs
                }))
                .on('data', (data: any) => {
                    results.push(data);
                })
                .on('end', () => {
                    resolve(results);
                })
                .on('error', (error: any) => {
                    reject(new AppError(`Failed to parse CSV file: ${error?.message || 'Unknown error'}`, 400));
                });
        });
    }

    /**
     * Valide que le fichier contient toutes les colonnes requises
     * @param rows - Array d'objets représentant les lignes du fichier
     * @param userType - Type d'utilisateur ('student' ou 'teacher')
     * @throws AppError si des colonnes requises sont manquantes
     */
    validateFileStructure(rows: any[], userType: 'student' | 'teacher'): void {
        if (!rows || rows.length === 0) {
            throw new AppError('File is empty or has no data rows', 400);
        }

        // Définir les colonnes requises selon le type d'utilisateur
        const requiredColumns = userType === 'student'
            ? ['matricule', 'firstName', 'lastName', 'email', 'phoneNumber', 'classeId']
            : ['matricule', 'firstName', 'lastName', 'email', 'phoneNumber', 'matiereIds'];

        // Récupérer les colonnes présentes dans la première ligne
        const firstRow = rows[0];
        const presentColumns = Object.keys(firstRow);

        // Vérifier que toutes les colonnes requises sont présentes
        const missingColumns = requiredColumns.filter(
            col => !presentColumns.includes(col)
        );

        if (missingColumns.length > 0) {
            throw new AppError(
                `Missing required columns: ${missingColumns.join(', ')}. ` +
                `Expected columns for ${userType}: ${requiredColumns.join(', ')}`,
                400
            );
        }
    }
}
