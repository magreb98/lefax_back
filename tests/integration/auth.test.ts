import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';

describe('Auth Endpoints', () => {
    let authToken: string;
    let testUserId: string;

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
    });

    afterAll(async () => {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });

    describe('POST /api/users/register', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send({
                    firstName: 'Test',
                    lastName: 'User',
                    email: `test${Date.now()}@example.com`,
                    password: 'Password123!',
                    phoneNumber: '0612345678',
                    role: 'etudiant',
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message');
        });

        it('should fail with missing fields', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send({
                    firstName: 'Test',
                    email: 'test@example.com',
                });

            expect(response.status).toBe(400);
        });

        it('should fail with duplicate email', async () => {
            const email = `duplicate${Date.now()}@example.com`;

            await request(app)
                .post('/api/users/register')
                .send({
                    firstName: 'Test',
                    lastName: 'User',
                    email,
                    password: 'Password123!',
                });

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    firstName: 'Test2',
                    lastName: 'User2',
                    email,
                    password: 'Password123!',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeAll(async () => {
            // Create a test user
            const email = `login${Date.now()}@example.com`;
            await request(app)
                .post('/api/users/register')
                .send({
                    firstName: 'Login',
                    lastName: 'Test',
                    email,
                    password: 'Password123!',
                });
        });

        it('should login successfully', async () => {
            const email = `login${Date.now()}@example.com`;

            // Register first
            await request(app)
                .post('/api/users/register')
                .send({
                    firstName: 'Login',
                    lastName: 'Test',
                    email,
                    password: 'Password123!',
                });

            // Then login
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email,
                    password: 'Password123!',
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');

            authToken = response.body.token;
            testUserId = response.body.user.id;
        });

        it('should fail with wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword',
                });

            expect(response.status).toBe(401);
        });

        it('should fail with missing credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should get current user with valid token', async () => {
            if (!authToken) {
                // Create and login a user first
                const email = `me${Date.now()}@example.com`;
                await request(app)
                    .post('/api/users/register')
                    .send({
                        firstName: 'Me',
                        lastName: 'Test',
                        email,
                        password: 'Password123!',
                    });

                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({ email, password: 'Password123!' });

                authToken = loginResponse.body.token;
            }

            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('email');
        });

        it('should fail without token', async () => {
            const response = await request(app).get('/api/auth/me');

            expect(response.status).toBe(401);
        });

        it('should fail with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid_token');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should refresh token', async () => {
            if (!authToken) {
                const email = `refresh${Date.now()}@example.com`;
                await request(app)
                    .post('/api/users/register')
                    .send({
                        firstName: 'Refresh',
                        lastName: 'Test',
                        email,
                        password: 'Password123!',
                    });

                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({ email, password: 'Password123!' });

                authToken = loginResponse.body.token;
            }

            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await request(app).post('/api/auth/logout');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });
    });
});
