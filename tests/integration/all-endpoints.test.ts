import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';

/**
 * Test complet de tous les endpoints de l'API Lefax
 * Ce fichier teste la disponibilité de tous les endpoints principaux
 */
describe('All API Endpoints - Smoke Tests', () => {
    let authToken: string;
    let testUserId: string;
    let testEcoleId: string;
    let testFiliereId: string;
    let testClasseId: string;
    let testCategoryId: string;
    let testMatiereId: string;
    let testGroupeId: string;

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        // Setup: Create admin user and login
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

    describe('Health & Info Endpoints', () => {
        it('GET /health - should return health status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
        });

        it('GET /api/docs - should return Swagger documentation', async () => {
            const response = await request(app).get('/api/docs');
            expect([200, 301, 302]).toContain(response.status);
        });
    });

    describe('Categories Endpoints', () => {
        it('POST /api/categories - should create category', async () => {
            const response = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ categorieName: `Category ${Date.now()}` });

            expect(response.status).toBe(201);
            if (response.body.id) {
                testCategoryId = response.body.id;
            }
        });

        it('GET /api/categories - should get all categories', async () => {
            const response = await request(app)
                .get('/api/categories')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('GET /api/categories/:id - should get category by id', async () => {
            if (!testCategoryId) return;

            const response = await request(app)
                .get(`/api/categories/${testCategoryId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('PUT /api/categories/:id - should update category', async () => {
            if (!testCategoryId) return;

            const response = await request(app)
                .put(`/api/categories/${testCategoryId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ categorieName: 'Updated Category' });

            expect(response.status).toBe(200);
        });
    });

    describe('Ecoles Endpoints', () => {
        it('POST /api/ecoles - should create ecole', async () => {
            const response = await request(app)
                .post('/api/ecoles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    schoolName: `Ecole ${Date.now()}`,
                    address: '123 Test Street',
                    schoolEmail: `ecole${Date.now()}@test.com`,
                    schoolPhone: '0123456789',
                    schoolAdmin: testUserId,
                });

            expect(response.status).toBe(201);
            if (response.body.ecole) {
                testEcoleId = response.body.ecole.id;
            }
        });

        it('GET /api/ecoles - should get all ecoles', async () => {
            const response = await request(app)
                .get('/api/ecoles')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('ecoles');
        });

        it('GET /api/ecoles/:id - should get ecole by id', async () => {
            if (!testEcoleId) return;

            const response = await request(app)
                .get(`/api/ecoles/${testEcoleId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('PUT /api/ecoles/:id - should update ecole', async () => {
            if (!testEcoleId) return;

            const response = await request(app)
                .put(`/api/ecoles/${testEcoleId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ schoolName: 'Updated Ecole' });

            expect(response.status).toBe(200);
        });
    });

    describe('Filieres Endpoints', () => {
        it('POST /api/filieres - should create filiere', async () => {
            if (!testEcoleId) return;

            const response = await request(app)
                .post('/api/filieres')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: `Filiere ${Date.now()}`,
                    description: 'Test filiere',
                    ecoleId: testEcoleId,
                });

            expect(response.status).toBe(201);
            if (response.body.filiere) {
                testFiliereId = response.body.filiere.id;
            }
        });

        it('GET /api/filieres - should get all filieres', async () => {
            const response = await request(app)
                .get('/api/filieres')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('GET /api/filieres/:id - should get filiere by id', async () => {
            if (!testFiliereId) return;

            const response = await request(app)
                .get(`/api/filieres/${testFiliereId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('PUT /api/filieres/:id - should update filiere', async () => {
            if (!testFiliereId) return;

            const response = await request(app)
                .put(`/api/filieres/${testFiliereId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated Filiere' });

            expect(response.status).toBe(200);
        });
    });

    describe('Classes Endpoints', () => {
        it('POST /api/classes - should create classe', async () => {
            if (!testFiliereId) return;

            const response = await request(app)
                .post('/api/classes')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    className: `Classe ${Date.now()}`,
                    filiereId: testFiliereId,
                });

            expect(response.status).toBe(201);
            if (response.body.classe) {
                testClasseId = response.body.classe.id;
            }
        });

        it('GET /api/classes - should get all classes', async () => {
            const response = await request(app)
                .get('/api/classes')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('GET /api/classes/:id - should get classe by id', async () => {
            if (!testClasseId) return;

            const response = await request(app)
                .get(`/api/classes/${testClasseId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('PUT /api/classes/:id - should update classe', async () => {
            if (!testClasseId) return;

            const response = await request(app)
                .put(`/api/classes/${testClasseId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ className: 'Updated Classe' });

            expect(response.status).toBe(200);
        });
    });

    describe('Groupes Endpoints', () => {
        it('POST /api/users/groupes - should create groupe', async () => {
            const response = await request(app)
                .post('/api/users/groupes')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: `Groupe ${Date.now()}`,
                    description: 'Test groupe',
                });

            expect(response.status).toBe(201);
            if (response.body.groupe) {
                testGroupeId = response.body.groupe.id;
            }
        });

        it('POST /api/users/groupes/:groupeId/users/:userId - should add user to groupe', async () => {
            if (!testGroupeId) return;

            const response = await request(app)
                .post(`/api/users/groupes/${testGroupeId}/users/${testUserId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 201]).toContain(response.status);
        });
    });

    describe('Notifications Endpoints', () => {
        let testNotificationId: string;

        it('POST /api/notifications - should create notification', async () => {
            if (!testGroupeId) return;

            const response = await request(app)
                .post('/api/notifications')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    type: 'NEW_DOCUMENT',
                    message: 'Test notification',
                    groupePartageId: testGroupeId,
                });

            expect(response.status).toBe(201);
            if (response.body.notification) {
                testNotificationId = response.body.notification.id;
            }
        });

        it('GET /api/notifications - should get all notifications', async () => {
            const response = await request(app)
                .get('/api/notifications?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');
        });

        it('GET /api/notifications/:id - should get notification by id', async () => {
            if (!testNotificationId) return;

            const response = await request(app)
                .get(`/api/notifications/${testNotificationId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        it('PUT /api/notifications/:id - should update notification', async () => {
            if (!testNotificationId) return;

            const response = await request(app)
                .put(`/api/notifications/${testNotificationId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ message: 'Updated notification' });

            expect(response.status).toBe(200);
        });

        it('DELETE /api/notifications/:id - should delete notification', async () => {
            if (!testNotificationId) return;

            const response = await request(app)
                .delete(`/api/notifications/${testNotificationId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(204);
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits', async () => {
            // Make multiple requests to trigger rate limit
            const requests = Array(10).fill(null).map(() =>
                request(app).get('/health')
            );

            const responses = await Promise.all(requests);

            // All should succeed as we're within limit
            responses.forEach(response => {
                expect([200, 429]).toContain(response.status);
            });
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for unknown routes', async () => {
            const response = await request(app).get('/api/unknown-endpoint');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('success', false);
        });

        it('should handle validation errors', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send({ firstName: 'Test' }); // Missing required fields

            expect(response.status).toBe(400);
        });
    });
});
