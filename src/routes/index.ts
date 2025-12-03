import { Router } from "express";
import authRoutes from './auth';
import userRoutes from './users'
import categoryRoutes from './category';
import documentRoutes from './documents';
import ecoleRoutes from './ecoles';
import filiereRoutes from './filieres';
import classeRoutes from './classes';
import groupeRoutes from './groupe.partage';
import notificationRoutes from './notifications';
import matiereRoutes from './matieres';
const router = Router();

/**
 * @swagger
 * /api:
 *   get:
 *     tags:
 *       - Index
 *     summary: Point d'entrée de l'API
 *     description: Retourne les informations générales sur l'API et les routes disponibles.
 *     responses:
 *       200:
 *         description: Informations sur l'API récupérées avec succès
 */

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/ecoles', ecoleRoutes);
router.use('/filieres', filiereRoutes);
router.use('/classes', classeRoutes);
router.use('/groupes', groupeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/matieres', matiereRoutes);

export default router;
