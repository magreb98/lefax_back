import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const searchController = new SearchController();

/**
 * GET /api/search/documents
 * Rechercher des documents avec OpenSearch
 */
router.get('/documents', authMiddleware, (req, res) => searchController.searchDocuments(req, res));
router.get('/suggestions', authMiddleware, (req, res) => searchController.suggestDocuments(req, res));

export default router;
