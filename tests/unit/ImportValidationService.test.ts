import { ImportValidationService } from '../../src/services/ImportValidationService';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/entity/user';
import { Class } from '../../src/entity/classe';
import { Matiere } from '../../src/entity/matiere';
import { Repository } from 'typeorm';

// Mock the database
jest.mock('../../src/config/database', () => ({
    AppDataSource: {
        getRepository: jest.fn()
    }
}));

describe('ImportValidationService', () => {
    let service: ImportValidationService;
    let mockUserRepository: jest.Mocked<Repository<User>>;
    let mockClasseRepository: jest.Mocked<Repository<Class>>;
    let mockMatiereRepository: jest.Mocked<Repository<Matiere>>;

    beforeEach(() => {
        // Create mock repositories
        mockUserRepository = {
            findOne: jest.fn()
        } as any;

        mockClasseRepository = {
            findOne: jest.fn()
        } as any;

        mockMatiereRepository = {
            findOne: jest.fn()
        } as any;

        // Setup AppDataSource mock
        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity === User) return mockUserRepository;
            if (entity === Class) return mockClasseRepository;
            if (entity === Matiere) return mockMatiereRepository;
            return null;
        });

        service = new ImportValidationService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateStudentRow', () => {
        const schoolId = '550e8400-e29b-41d4-a716-446655440000';
        const validStudentRow = {
            matricule: 'ETU001',
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@test.com',
            phoneNumber: '0123456789',
            classeId: '550e8400-e29b-41d4-a716-446655440001'
        };

        it('should validate a valid student row successfully', async () => {
            // Mock: no existing email, no existing matricule, class exists
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // First call for email check
                .mockResolvedValueOnce(null); // Second call for matricule check
            mockClasseRepository.findOne.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' } as Class);

            const result = await service.validateStudentRow(validStudentRow, 2, schoolId);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.data).toBeDefined();
            expect(result.data?.matricule).toBe('ETU001');
        });

        it('should reject row with missing matricule', async () => {
            const invalidRow = { ...validStudentRow, matricule: '' };

            const result = await service.validateStudentRow(invalidRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            const matriculeError = result.errors.find(e => e.field === 'matricule');
            expect(matriculeError).toBeDefined();
            expect(matriculeError?.message).toContain('required');
        });

        it('should reject row with non-alphanumeric matricule', async () => {
            const invalidRow = { ...validStudentRow, matricule: 'ETU-001!' };

            const result = await service.validateStudentRow(invalidRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            const matriculeError = result.errors.find(e => e.field === 'matricule');
            expect(matriculeError).toBeDefined();
            expect(matriculeError?.message).toContain('alphanumeric');
        });

        it('should reject row with invalid email format', async () => {
            const invalidRow = { ...validStudentRow, email: 'invalid-email' };

            const result = await service.validateStudentRow(invalidRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            const emailError = result.errors.find(e => e.field === 'email');
            expect(emailError).toBeDefined();
            expect(emailError?.message).toContain('email');
        });

        it('should reject row with duplicate email', async () => {
            // Mock: email already exists
            mockUserRepository.findOne.mockResolvedValueOnce({ 
                id: 'existing-user-id', 
                email: validStudentRow.email 
            } as User);
            mockUserRepository.findOne.mockResolvedValueOnce(null); // matricule check
            mockClasseRepository.findOne.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' } as Class);

            const result = await service.validateStudentRow(validStudentRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            const emailError = result.errors.find(e => e.field === 'email');
            expect(emailError).toBeDefined();
            expect(emailError?.message).toBe('Email already exists');
        });

        it('should reject row with duplicate matricule in same school', async () => {
            // Mock: no existing email, but matricule exists in school
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // First call for email check
                .mockResolvedValueOnce({ 
                    id: 'existing-user-id', 
                    matricule: validStudentRow.matricule 
                } as User); // Second call for matricule check
            mockClasseRepository.findOne.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' } as Class);

            const result = await service.validateStudentRow(validStudentRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            const matriculeError = result.errors.find(e => e.field === 'matricule');
            expect(matriculeError).toBeDefined();
            expect(matriculeError?.message).toBe('Matricule already exists in this school');
        });

        it('should reject row with non-existent classeId', async () => {
            // Mock: no existing email, no existing matricule, but class doesn't exist
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce(null); // matricule check
            mockClasseRepository.findOne.mockResolvedValue(null);

            const result = await service.validateStudentRow(validStudentRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            const classeError = result.errors.find(e => e.field === 'classeId');
            expect(classeError).toBeDefined();
            expect(classeError?.message).toBe('Class not found');
        });

        it('should reject row with invalid UUID for classeId', async () => {
            const invalidRow = { ...validStudentRow, classeId: 'not-a-uuid' };

            const result = await service.validateStudentRow(invalidRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            const classeError = result.errors.find(e => e.field === 'classeId');
            expect(classeError).toBeDefined();
            expect(classeError?.message).toContain('UUID');
        });

        it('should include row number in error messages', async () => {
            const invalidRow = { ...validStudentRow, email: 'invalid-email' };
            const rowNumber = 42;

            const result = await service.validateStudentRow(invalidRow, rowNumber, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors[0].row).toBe(rowNumber);
        });

        it('should include original data in error messages', async () => {
            const invalidRow = { ...validStudentRow, email: 'invalid-email' };

            const result = await service.validateStudentRow(invalidRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors[0].data).toEqual(invalidRow);
        });

        it('should handle multiple validation errors', async () => {
            const invalidRow = {
                matricule: 'ETU-001!', // Invalid format
                firstName: 'Jean',
                lastName: 'Dupont',
                email: 'invalid-email', // Invalid format
                phoneNumber: '0123456789',
                classeId: 'not-a-uuid' // Invalid UUID
            };

            const result = await service.validateStudentRow(invalidRow, 2, schoolId);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(2);
            expect(result.errors.some(e => e.field === 'matricule')).toBe(true);
            expect(result.errors.some(e => e.field === 'email')).toBe(true);
            expect(result.errors.some(e => e.field === 'classeId')).toBe(true);
        });

        it('should accept alphanumeric matricule with mixed case', async () => {
            const validRow = { ...validStudentRow, matricule: 'Etu001ABC' };
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce(null); // matricule check
            mockClasseRepository.findOne.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' } as Class);

            const result = await service.validateStudentRow(validRow, 2, schoolId);

            expect(result.valid).toBe(true);
            expect(result.data?.matricule).toBe('Etu001ABC');
        });

        it('should accept optional phoneNumber', async () => {
            const validRow = { ...validStudentRow, phoneNumber: undefined };
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce(null); // matricule check
            mockClasseRepository.findOne.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' } as Class);

            const result = await service.validateStudentRow(validRow, 2, schoolId);

            expect(result.valid).toBe(true);
        });
    });

    describe('validateTeacherRow', () => {
        const schoolId = '550e8400-e29b-41d4-a716-446655440000';
        const validTeacherRow = {
            matricule: 'ENS001',
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'marie.martin@test.com',
            phoneNumber: '0987654321',
            matiereIds: '550e8400-e29b-41d4-a716-446655440010,550e8400-e29b-41d4-a716-446655440011'
        };

        it('should validate a valid teacher row successfully', async () => {
            // Mock: no existing email, no existing matricule, all matieres exist
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce(null); // matricule check
            mockMatiereRepository.findOne
                .mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440010' } as Matiere)
                .mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440011' } as Matiere);

            const result = await service.validateTeacherRow(validTeacherRow, 2, schoolId);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.data).toBeDefined();
            expect(result.data?.matricule).toBe('ENS001');
        });

        it('should reject row with duplicate email', async () => {
            // Mock: email already exists
            mockUserRepository.findOne.mockResolvedValueOnce({ 
                id: 'existing-user-id', 
                email: validTeacherRow.email 
            } as User);

            const result = await service.validateTeacherRow(validTeacherRow, 2, schoolId);

            expect(result.valid).toBe(false);
            const emailError = result.errors.find(e => e.field === 'email');
            expect(emailError).toBeDefined();
            expect(emailError?.message).toBe('Email already exists');
        });

        it('should reject row with duplicate matricule in same school', async () => {
            // Mock: no existing email, but matricule exists in school
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // First call for email check
                .mockResolvedValueOnce({ 
                    id: 'existing-user-id', 
                    matricule: validTeacherRow.matricule 
                } as User); // Second call for matricule check

            const result = await service.validateTeacherRow(validTeacherRow, 2, schoolId);

            expect(result.valid).toBe(false);
            const matriculeError = result.errors.find(e => e.field === 'matricule');
            expect(matriculeError).toBeDefined();
            expect(matriculeError?.message).toBe('Matricule already exists in this school');
        });

        it('should reject row with non-existent matiere', async () => {
            // Mock: no existing email, no existing matricule, but one matiere doesn't exist
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce(null); // matricule check
            mockMatiereRepository.findOne
                .mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440010' } as Matiere) // First matiere exists
                .mockResolvedValueOnce(null); // Second matiere doesn't exist

            const result = await service.validateTeacherRow(validTeacherRow, 2, schoolId);

            expect(result.valid).toBe(false);
            const matiereError = result.errors.find(e => e.field === 'matiereIds');
            expect(matiereError).toBeDefined();
            expect(matiereError?.message).toContain('Subject');
            expect(matiereError?.message).toContain('not found');
        });

        it('should handle matiereIds with spaces', async () => {
            const validRow = { ...validTeacherRow, matiereIds: '550e8400-e29b-41d4-a716-446655440010 , 550e8400-e29b-41d4-a716-446655440011 ' };
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce(null); // matricule check
            mockMatiereRepository.findOne
                .mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440010' } as Matiere)
                .mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440011' } as Matiere);

            const result = await service.validateTeacherRow(validRow, 2, schoolId);

            expect(result.valid).toBe(true);
        });

        it('should validate single matiere', async () => {
            const validRow = { ...validTeacherRow, matiereIds: '550e8400-e29b-41d4-a716-446655440010' };
            mockUserRepository.findOne
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce(null); // matricule check
            mockMatiereRepository.findOne.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440010' } as Matiere);

            const result = await service.validateTeacherRow(validRow, 2, schoolId);

            expect(result.valid).toBe(true);
        });

        it('should reject row with missing matiereIds', async () => {
            const invalidRow = { ...validTeacherRow, matiereIds: '' };

            const result = await service.validateTeacherRow(invalidRow, 2, schoolId);

            expect(result.valid).toBe(false);
            const matiereError = result.errors.find(e => e.field === 'matiereIds');
            expect(matiereError).toBeDefined();
        });
    });
});
