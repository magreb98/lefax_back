import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authMiddleware, authMiddlewareWithQueryToken, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
const documentController = new DocumentController();

// ========== ROUTES UPLOAD (AVEC MIDDLEWARE EXPLICITE) ==========
// L'authentification est vérifiée AVANT le parsing du fichier par multer

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Uploader un nouveau document
 *     description: Permet d'uploader un document avec des métadonnées
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentName:
 *                 type: string
 *               description:
 *                 type: string
 *               categorieId:
 *                 type: string
 *               addedById:
 *                 type: string
 *               matiereId:
 *                 type: string
 *               groupePartageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isdownloadable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Document uploadé avec succès
 *       400:
 *         description: Données invalides
 */
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => documentController.uploadDocument(req, res));

/**
 * POST /api/documents/upload-multiple
 * Uploader plusieurs documents
 * Body (multipart/form-data):
 * - files: fichiers à uploader (max 20)
 * - categorieId: string (requis)
 * - addedById: string (requis)
 * - matiereId: string (optionnel)
 * - groupePartageIds: string[] (optionnel, si non fourni -> groupe public)
 * - isdownloadable: boolean (optionnel, défaut: true)
 */
router.post('/upload-multiple', authMiddleware, upload.array('files', 20), (req, res) => documentController.uploadMultipleDocuments(req, res));

/**
 * GET /api/documents/:id/view
 * Visualiser un document dans le navigateur (PDF, images, etc.)
 * Vérifie que l'utilisateur appartient à au moins un groupe du document
 * Accepte le token via header Authorization OU query parameter ?token=xxx
 */
router.get('/:id/view', authMiddlewareWithQueryToken, (req, res) => documentController.viewDocument(req, res));

/**
 * GET /api/documents/:id/download
 * Télécharger un document
 * Vérifie que l'utilisateur appartient à au moins un groupe du document
 * Accepte le token via header Authorization OU query parameter ?token=xxx
 */
router.get('/:id/download', authMiddlewareWithQueryToken, (req, res) => documentController.downloadDocument(req, res));

// Apply auth middleware to all other routes (after upload routes)
router.use(authMiddleware);

// ========== ROUTES CRUD DE BASE ==========

/**
 * @swagger
 * /api/documents:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Récupérer tous les documents
 *     description: Retourne une liste de documents avec des filtres optionnels
 *     parameters:
 *       - name: categorieId
 *         in: query
 *         schema:
 *           type: string
 *       - name: matiereId
 *         in: query
 *         schema:
 *           type: string
 *       - name: addedById
 *         in: query
 *         schema:
 *           type: string
 *       - name: groupePartageId
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des documents récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       400:
 *         description: Erreur dans les paramètres de requête
 */
router.get('/', (req, res) => documentController.getDocuments(req, res));

/**
 * GET /api/documents/:id
 * Récupérer un document par son ID
 */
router.get('/:id', (req, res) => documentController.getDocumentById(req, res));

/**
 * PUT /api/documents/:id
 * Mettre à jour un document
 * Body:
 * - documentName: string (optionnel)
 * - description: string (optionnel)
 * - categorieId: string (optionnel)
 * - matiereId: string | null (optionnel)
 * - groupePartageIds: string[] (optionnel)
 * - isdownloadable: boolean (optionnel)
 */
router.put('/:id', (req, res) => documentController.updateDocument(req, res));

/**
 * DELETE /api/documents/:id
 * Supprimer un document
 */
router.delete('/:id', (req, res) => documentController.deleteDocument(req, res));

/**
 * POST /api/documents/delete-multiple
 * Supprimer plusieurs documents
 * Body:
 * - documentIds: string[] (requis)
 */
router.post('/delete-multiple', (req, res) => documentController.deleteMultipleDocuments(req, res));

/**
 * POST /api/documents/groupe/add
 * Ajouter un document à un groupe de partage
 * Body:
 * - documentId: string (requis)
 * - groupeId: string (requis)
 */
router.post('/groupe/add', (req, res) => documentController.addDocumentToGroupe(req, res));

/**
 * POST /api/documents/groupes/add
 * Ajouter un document à plusieurs groupes de partage
 * Body:
 * - documentId: string (requis)
 * - groupeIds: string[] (requis)
 */
router.post('/groupes/add', (req, res) => documentController.addDocumentToGroupes(req, res));

/**
 * POST /api/documents/groupe/remove
 * Retirer un document d'un groupe de partage
 * Body:
 * - documentId: string (requis)
 * - groupeId: string (requis)
 */
router.post('/groupe/remove', (req, res) => documentController.removeDocumentFromGroupe(req, res));

/**
 * POST /api/documents/multiple/groupe/add
 * Ajouter plusieurs documents à un groupe de partage
 * Body:
 * - documentIds: string[] (requis)
 * - groupeId: string (requis)
 */
router.post('/multiple/groupe/add', (req, res) => documentController.addMultipleDocumentsToGroupe(req, res));

/**
 * POST /api/documents/multiple/groupes/add
 * Ajouter plusieurs documents à plusieurs groupes de partage
 * Body:
 * - documentIds: string[] (requis)
 * - groupeIds: string[] (requis)
 */
router.post('/multiple/groupes/add', (req, res) => documentController.addMultipleDocumentsToGroupes(req, res));

/**
 * POST /api/documents/multiple/groupe/remove
 * Retirer plusieurs documents d'un groupe de partage
 * Body:
 * - documentIds: string[] (requis)
 * - groupeId: string (requis)
 */
router.post('/multiple/groupe/remove', (req, res) => documentController.removeMultipleDocumentsFromGroupe(req, res));

/**
 * GET /api/documents/user/:userId
 * Récupérer tous les documents accessibles par un utilisateur
 */
router.get('/user/:userId', (req, res) => documentController.getDocumentsByUser(req, res));

/**
 * GET /api/documents/groupe/:groupeId
 * Récupérer tous les documents d'un groupe de partage
 */
router.get('/groupe/:groupeId', (req, res) => documentController.getDocumentsByGroupe(req, res));

/**
 * GET /api/documents/matiere/:matiereId
 * Récupérer tous les documents d'une matière
 */
router.get('/matiere/:matiereId', (req, res) => documentController.getDocumentsByMatiere(req, res));

/**
 * GET /api/documents/categorie/:categorieId
 * Récupérer tous les documents d'une catégorie
 */
router.get('/categorie/:categorieId', (req, res) => documentController.getDocumentsByCategorie(req, res));

/**
 * GET /api/documents/search?q=terme
 * Rechercher des documents par nom ou description
 * Query params:
 * - q: string (requis) - terme de recherche
 */
router.get('/search', (req, res) => documentController.searchDocuments(req, res));

/**
 * GET /api/documents/stats/most-downloaded
 * Récupérer les documents les plus téléchargés
 * Query params:
 * - limit: number (optionnel, défaut: 10)
 */
router.get('/stats/most-downloaded', (req, res) => documentController.getMostDownloadedDocuments(req, res));

/**
 * GET /api/documents/stats/most-viewed
 * Récupérer les documents les plus vus
 * Query params:
 * - limit: number (optionnel, défaut: 10)
 */
router.get('/stats/most-viewed', (req, res) => documentController.getMostViewedDocuments(req, res));

/**
 * GET /api/documents/stats/recent
 * Récupérer les documents récents
 * Query params:
 * - limit: number (optionnel, défaut: 10)
 */
router.get('/stats/recent', (req, res) => documentController.getRecentDocuments(req, res));

export default router;