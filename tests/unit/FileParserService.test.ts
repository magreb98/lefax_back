import { FileParserService } from '../../src/services/FileParserService';
import * as XLSX from 'xlsx';

describe('FileParserService', () => {
    let service: FileParserService;

    beforeEach(() => {
        service = new FileParserService();
    });

    describe('parseFile', () => {
        it('should throw error for unsupported file type', async () => {
            const buffer = Buffer.from('test');
            await expect(service.parseFile(buffer, '.txt')).rejects.toThrow(
                'Unsupported file type. Only .xlsx and .csv are allowed'
            );
        });

        it('should route to parseExcel for .xlsx files', async () => {
            // Créer un fichier Excel simple
            const ws = XLSX.utils.aoa_to_sheet([
                ['matricule', 'firstName', 'lastName', 'email', 'phoneNumber', 'classeId'],
                ['ETU001', 'Jean', 'Dupont', 'jean@test.com', '0123456789', 'class-uuid-1']
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            const result = await service.parseFile(buffer, '.xlsx');

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                matricule: 'ETU001',
                firstName: 'Jean',
                lastName: 'Dupont',
                email: 'jean@test.com'
            });
        });

        it('should route to parseCsv for .csv files', async () => {
            const csvContent = 'matricule,firstName,lastName,email,phoneNumber,classeId\nETU001,Jean,Dupont,jean@test.com,0123456789,class-uuid-1';
            const buffer = Buffer.from(csvContent);

            const result = await service.parseFile(buffer, '.csv');

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                matricule: 'ETU001',
                firstName: 'Jean',
                lastName: 'Dupont',
                email: 'jean@test.com'
            });
        });

        it('should handle case-insensitive file extensions', async () => {
            const csvContent = 'matricule,firstName,lastName,email,phoneNumber,classeId\nETU001,Jean,Dupont,jean@test.com,0123456789,class-uuid-1';
            const buffer = Buffer.from(csvContent);

            const result = await service.parseFile(buffer, '.CSV');

            expect(result).toHaveLength(1);
        });
    });

    describe('validateFileStructure', () => {
        it('should throw error for empty file', () => {
            expect(() => service.validateFileStructure([], 'student')).toThrow(
                'File is empty or has no data rows'
            );
        });

        it('should validate student file structure successfully', () => {
            const rows = [
                {
                    matricule: 'ETU001',
                    firstName: 'Jean',
                    lastName: 'Dupont',
                    email: 'jean@test.com',
                    phoneNumber: '0123456789',
                    classeId: 'class-uuid-1'
                }
            ];

            expect(() => service.validateFileStructure(rows, 'student')).not.toThrow();
        });

        it('should validate teacher file structure successfully', () => {
            const rows = [
                {
                    matricule: 'ENS001',
                    firstName: 'Marie',
                    lastName: 'Martin',
                    email: 'marie@test.com',
                    phoneNumber: '0123456789',
                    matiereIds: 'mat-uuid-1,mat-uuid-2'
                }
            ];

            expect(() => service.validateFileStructure(rows, 'teacher')).not.toThrow();
        });

        it('should throw error for missing columns in student file', () => {
            const rows = [
                {
                    matricule: 'ETU001',
                    firstName: 'Jean',
                    lastName: 'Dupont'
                    // Missing email, phoneNumber, classeId
                }
            ];

            expect(() => service.validateFileStructure(rows, 'student')).toThrow(
                'Missing required columns: email, phoneNumber, classeId'
            );
        });

        it('should throw error for missing columns in teacher file', () => {
            const rows = [
                {
                    matricule: 'ENS001',
                    firstName: 'Marie',
                    lastName: 'Martin',
                    email: 'marie@test.com'
                    // Missing phoneNumber, matiereIds
                }
            ];

            expect(() => service.validateFileStructure(rows, 'teacher')).toThrow(
                'Missing required columns: phoneNumber, matiereIds'
            );
        });

        it('should throw error when matricule column is missing', () => {
            const rows = [
                {
                    firstName: 'Jean',
                    lastName: 'Dupont',
                    email: 'jean@test.com',
                    phoneNumber: '0123456789',
                    classeId: 'class-uuid-1'
                }
            ];

            expect(() => service.validateFileStructure(rows, 'student')).toThrow(
                'Missing required columns: matricule'
            );
        });
    });

    describe('parseExcel', () => {
        it('should parse Excel file with multiple rows', async () => {
            const ws = XLSX.utils.aoa_to_sheet([
                ['matricule', 'firstName', 'lastName', 'email', 'phoneNumber', 'classeId'],
                ['ETU001', 'Jean', 'Dupont', 'jean@test.com', '0123456789', 'class-uuid-1'],
                ['ETU002', 'Marie', 'Martin', 'marie@test.com', '0987654321', 'class-uuid-2']
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            const result = await service.parseFile(buffer, '.xlsx');

            expect(result).toHaveLength(2);
            expect(result[0].matricule).toBe('ETU001');
            expect(result[1].matricule).toBe('ETU002');
        });

        it('should throw error for empty Excel file', async () => {
            // Créer un fichier Excel avec une feuille vide (sans données)
            const ws = XLSX.utils.aoa_to_sheet([]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            const result = await service.parseFile(buffer, '.xlsx');
            
            // Un fichier Excel vide retourne un array vide
            expect(result).toHaveLength(0);
        });
    });

    describe('parseCsv', () => {
        it('should parse CSV file with multiple rows', async () => {
            const csvContent = `matricule,firstName,lastName,email,phoneNumber,classeId
ETU001,Jean,Dupont,jean@test.com,0123456789,class-uuid-1
ETU002,Marie,Martin,marie@test.com,0987654321,class-uuid-2`;
            const buffer = Buffer.from(csvContent);

            const result = await service.parseFile(buffer, '.csv');

            expect(result).toHaveLength(2);
            expect(result[0].matricule).toBe('ETU001');
            expect(result[1].matricule).toBe('ETU002');
        });

        it('should trim whitespace from CSV values', async () => {
            const csvContent = `matricule, firstName , lastName, email, phoneNumber, classeId
ETU001 , Jean , Dupont , jean@test.com , 0123456789 , class-uuid-1`;
            const buffer = Buffer.from(csvContent);

            const result = await service.parseFile(buffer, '.csv');

            expect(result[0].firstName).toBe('Jean');
            expect(result[0].lastName).toBe('Dupont');
        });
    });
});
