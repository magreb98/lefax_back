import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';
import { GroupePartage } from '../../src/entity/groupe.partage';
import { User, UserRole } from '../../src/entity/user';
import { GroupePartageType } from '../../src/entity/groupe.partage';

describe('Public Group Category Permissions', () => {
    let studentToken: string;
    let studentId: string;
    let teacherToken: string;
    let teacherId: string;

    let publicGroupId: string;
    let privateGroupId: string;

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        // 1. Create Teacher (Admin for the private group)
        const teacherEmail = `teacher${Date.now()}@example.com`;
        await request(app).post('/api/users/register').send({
            firstName: 'Teacher', lastName: 'User', email: teacherEmail, password: 'Password123!', role: UserRole.ENSEIGNANT
        });
        const teacherLogin = await request(app).post('/api/auth/login').send({ email: teacherEmail, password: 'Password123!' });
        teacherToken = teacherLogin.body.token;
        teacherId = teacherLogin.body.user.id;

        // 2. Create Student
        const studentEmail = `student${Date.now()}@example.com`;
        await request(app).post('/api/users/register').send({
            firstName: 'Student', lastName: 'User', email: studentEmail, password: 'Password123!', role: UserRole.ETUDIANT
        });
        const studentLogin = await request(app).post('/api/auth/login').send({ email: studentEmail, password: 'Password123!' });
        studentToken = studentLogin.body.token;
        studentId = studentLogin.body.user.id;

        // 3. Create "Public" Group (Using direct repository access to simulate pre-existing "Public" group)
        const groupeRepo = AppDataSource.getRepository(GroupePartage);
        const userRepo = AppDataSource.getRepository(User);

        const teacherUser = await userRepo.findOne({ where: { id: teacherId } }) as User;
        const studentUser = await userRepo.findOne({ where: { id: studentId } }) as User;

        const publicGroup = groupeRepo.create({
            groupeName: 'Public', // Distinctive Name
            description: 'Public Group',
            type: GroupePartageType.CUSTOM,
            owner: teacherUser,
            users: [teacherUser, studentUser] // Both are members
        });
        await groupeRepo.save(publicGroup);
        publicGroupId = publicGroup.id;

        // 4. Create Private Group
        const privateGroup = groupeRepo.create({
            groupeName: 'Private Class',
            description: 'Private Class Group',
            type: GroupePartageType.CLASS,
            owner: teacherUser,
            users: [teacherUser, studentUser] // Student is member but should NOT be able to create categories because they are STUDENT
        });
        await groupeRepo.save(privateGroup);
        privateGroupId = privateGroup.id;
    });

    afterAll(async () => {
        if (AppDataSource.isInitialized) {
            // Cleanup if needed, but usually tests run in transaction or distinct DB
            const groupeRepo = AppDataSource.getRepository(GroupePartage);
            await groupeRepo.delete(publicGroupId);
            await groupeRepo.delete(privateGroupId);

            const userRepo = AppDataSource.getRepository(User);
            await userRepo.delete(studentId);
            await userRepo.delete(teacherId);

            await AppDataSource.destroy();
        }
    });

    it('Student should be able to create category in Public group', async () => {
        const response = await request(app)
            .post(`/api/groupes-partage/${publicGroupId}/categories`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                categorieName: 'Student Public Category',
                description: 'Created by student in public'
            });

        expect(response.status).toBe(201);
        expect(response.body.category.categorieName).toBe('Student Public Category');
    });

    it('Student should NOT be able to create category in Private group', async () => {
        const response = await request(app)
            .post(`/api/groupes-partage/${privateGroupId}/categories`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                categorieName: 'Student Private Category',
                description: 'Should fail'
            });

        if (response.status !== 403) {
            console.log('UNEXPECTED STATUS:', response.status);
            console.log('RESPONSE BODY:', JSON.stringify(response.body, null, 2));
        }
        // This expectation is what we WANT to achieve. 
        expect(response.status).toBe(403);
    });

    it('Teacher should be able to create category in Private group', async () => {
        const response = await request(app)
            .post(`/api/groupes-partage/${privateGroupId}/categories`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
                categorieName: 'Teacher Private Category',
                description: 'Created by teacher'
            });

        expect(response.status).toBe(201);
    });
});
