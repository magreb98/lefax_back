import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Récupérer toutes les notifications
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des notifications
 */
router.get('/', asyncHandler(NotificationController.getNotifications));

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Récupérer une notification par ID
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de la notification
 *       404:
 *         description: Notification non trouvée
 */
router.get('/:id', asyncHandler(NotificationController.getNotificationById));

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Créer une nouvelle notification
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - message
 *               - groupePartageId
 *             properties:
 *               type:
 *                 type: string
 *               message:
 *                 type: string
 *               groupePartageId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification créée
 */
router.post('/', asyncHandler(NotificationController.createNotification));

/**
 * @swagger
 * /api/notifications/{id}:
 *   put:
 *     summary: Mettre à jour une notification
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification mise à jour
 */
router.put('/:id', asyncHandler(NotificationController.updateNotification));

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Supprimer une notification
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Notification supprimée
 */
router.delete('/:id', asyncHandler(NotificationController.deleteNotification));

/**
 * @swagger
 * /api/notifications/groupe/{groupeId}:
 *   get:
 *     summary: Récupérer les notifications d'un groupe
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: groupeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notifications du groupe
 */
router.get('/groupe/:groupeId', asyncHandler(NotificationController.getNotificationsByGroupe));

/**
 * @swagger
 * /api/notifications/groupe/{groupeId}:
 *   delete:
 *     summary: Supprimer toutes les notifications d'un groupe
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: groupeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notifications supprimées
 */
router.delete('/groupe/:groupeId', asyncHandler(NotificationController.deleteNotificationsByGroupe));

/**
 * @swagger
 * /api/notifications/mark-read:
 *   post:
 *     summary: Marquer des notifications comme lues
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notifications marquées comme lues
 */
router.post('/mark-read', asyncHandler(NotificationController.markAsRead));

export default router;
