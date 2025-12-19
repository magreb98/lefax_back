import { Request, Response } from 'express';
import { searchService } from '../services/SearchService';

export class SearchController {
    /**
     * GET /api/search/documents
     * Rechercher des documents avec moteur de recherche OpenSearch
     */
    async searchDocuments(req: Request, res: Response): Promise<void> {
        try {
            const { q, fileType, from, size } = req.query;
            const userId = (req as any).user.id;

            if (!q || typeof q !== 'string') {
                res.status(400).json({ message: 'Le terme de recherche "q" est requis' });
                return;
            }

            const results = await searchService.searchDocuments(userId, q, {
                fileType: fileType as string,
                from: from ? parseInt(from as string) : 0,
                size: size ? parseInt(size as string) : 10
            });

            res.status(200).json(results);
        } catch (error: any) {
            console.error('Erreur dans SearchController:', error);
            res.status(500).json({
                message: error.message || 'Erreur lors de la recherche de documents'
            });
        }
    }

    /**
     * GET /api/search/suggestions
     * Obtenir des suggestions d'auto-complétion
     */
    async suggestDocuments(req: Request, res: Response): Promise<void> {
        try {
            const { q } = req.query;

            if (!q || typeof q !== 'string') {
                res.status(200).json([]);
                return;
            }

            const suggestions = await searchService.getSuggestions(q);
            res.status(200).json(suggestions);
        } catch (error: any) {
            console.error('Erreur dans SearchController (suggestions):', error);
            res.status(500).json({
                message: error.message || 'Erreur lors de la récupération des suggestions'
            });
        }
    }
}
