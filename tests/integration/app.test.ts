import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';

describe('API Health Check', () => {
    beforeAll(async () => {
        // Initialiser la base de données pour les tests
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
    });

    afterAll(async () => {
        // Fermer la connexion après les tests
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });

    it('should return 200 on health check', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
    });

    it('should return 404 for unknown routes', async () => {
        const response = await request(app).get('/api/unknown-route');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('success', false);
    });
});
