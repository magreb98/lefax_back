import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';
import path from 'path';
import fs from 'fs';

describe('Documents Endpoints', () => {
    let authToken: string;
    let testUserId: string;
    let testCategoryId: string;
    let testDocumentId: string;
    let testFilePath: string;

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        // Create test user
        const email = `doctest${Date.now()}@example.com`;
        await request(app)
            .post('/api/users/register')
            .send({
                firstName: 'Doc',
                lastName: 'Test',
                email,
                password: 'Password123!',
            });

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'Password123!' });

        authToken = loginResponse.body.token;
        testUserId = loginResponse.body.user.id;

        // Create test category
        const categoryResponse = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ categorieName: `Test Category ${Date.now()}` });

        testCategoryId = categoryResponse.body.id;

        // Create a test file
        testFilePath = path.join(__dirname, 'test-file.txt');
        fs.writeFileSync(testFilePath, 'This is a test file for upload');
    });

    afterAll(async () => {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });

    describe('POST /api/documents/upload', () => {
        it('should upload a document', async () => {
            const response = await request(app)
                .post('/api/documents/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .field('documentName', 'Test Document')
                .field('description', 'Test description')
                .field('categorieId', testCategoryId)
                .field('addedById', testUserId)
                .field('isdownloadable', 'true')
                .attach('file', testFilePath);

            expect([200, 201]).toContain(response.status);
            if (response.body.document) {
                testDocumentId = response.body.document.id;
            }
        });

        it('should fail without required fields', async () => {
            const response = await request(app)
                .post('/api/documents/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', testFilePath);

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/documents', () => {
        it('should get all documents with pagination', async () => {
            const response = await request(app)
                .get('/api/documents?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('documents');
            expect(response.body).toHaveProperty('count');
        });

        it('should filter documents by category', async () => {
            const response = await request(app)
                .get(`/api/documents?categorieId=${testCategoryId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/documents/:id', () => {
        it('should get document by id', async () => {
            if (!testDocumentId) {
                return; // Skip if no document was created
            }

            const response = await request(app)
                .get(`/api/documents/${testDocumentId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', testDocumentId);
        });
    });

    describe('PUT /api/documents/:id', () => {
        it('should update document', async () => {
            if (!testDocumentId) {
                return;
            }

            const response = await request(app)
                .put(`/api/documents/${testDocumentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    documentName: 'Updated Document Name',
                    description: 'Updated description',
                });

            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/documents/stats/most-viewed', () => {
        it('should get most viewed documents', async () => {
            const response = await request(app)
                .get('/api/documents/stats/most-viewed?limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/documents/stats/most-downloaded', () => {
        it('should get most downloaded documents', async () => {
            const response = await request(app)
                .get('/api/documents/stats/most-downloaded?limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/documents/search', () => {
        it('should search documents', async () => {
            const response = await request(app)
                .get('/api/documents/search?q=test')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('DELETE /api/documents/:id', () => {
        it('should delete document', async () => {
            if (!testDocumentId) {
                return;
            }

            const response = await request(app)
                .delete(`/api/documents/${testDocumentId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 204]).toContain(response.status);
        });
    });
});
