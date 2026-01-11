import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';
import { UserRole } from '../entity/user';
import { socketService } from '../services/SocketService';
import { Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * /api/admin/broadcast:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Envoyer une notification globale (Broadcast)
 *     description: Envoie un message à tous les utilisateurs connectés via WebSocket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, warning, error]
 *     responses:
 *       200:
 *         description: Message envoyé
 */
router.post('/broadcast', authMiddleware, roleMiddleware([UserRole.SUPERADMIN]), (req: Request, res: Response) => {
    const { message, type } = req.body;

    if (!message) {
        return res.status(400).json({ message: 'Message requis' });
    }

    socketService.broadcastMessage(message, type || 'info');
    return res.json({ message: 'Broadcast envoyé avec succès' });
});

export default router;
