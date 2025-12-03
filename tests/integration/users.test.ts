import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';

describe('Users Endpoints', () => {
    let authToken: string;
    let testUserId: string;

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        // Create and login a test user
        const email = `admin${Date.now()}@example.com`;
        await request(app)
            .post('/api/users/register')
            .send({
                firstName: 'Admin',
                lastName: 'Test',
                email,
                password: 'Password123!',
                role: 'admin',
            });

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'Password123!' });

        authToken = loginResponse.body.token;
        testUserId = loginResponse.body.user.id;
    });

    afterAll(async () => {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });

    describe('GET /api/users', () => {
        it('should get all users with pagination', async () => {
            const response = await request(app)
                .get('/api/users?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
        });

        it('should filter users by role', async () => {
            const response = await request(app)
                .get('/api/users?role=etudiant')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
        });

        it('should fail without authentication', async () => {
            const response = await request(app).get('/api/users');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/users/:id', () => {
        it('should get user by id', async () => {
            const response = await request(app)
                .get(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', testUserId);
            expect(response.body).toHaveProperty('email');
        });

        it('should return 404 for non-existent user', async () => {
            const response = await request(app)
                .get('/api/users/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/users/:id', () => {
        it('should update user', async () => {
            const response = await request(app)
                .put(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Name',
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .put(`/api/users/${testUserId}`)
                .send({ firstName: 'Test' });

            expect(response.status).toBe(401);
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('should delete user', async () => {
            // Create a user to delete
            const email = `delete${Date.now()}@example.com`;
            await request(app)
                .post('/api/users/register')
                .send({
                    firstName: 'Delete',
                    lastName: 'Me',
                    email,
                    password: 'Password123!',
                });

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({ email, password: 'Password123!' });

            const userIdToDelete = loginResponse.body.user.id;

            const response = await request(app)
                .delete(`/api/users/${userIdToDelete}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(204);
        });
    });

    describe('POST /api/users/groupes', () => {
        it('should create a groupe', async () => {
            const response = await request(app)
                .post('/api/users/groupes')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: `Test Groupe ${Date.now()}`,
                    description: 'Test description',
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('groupe');
        });
    });
});
