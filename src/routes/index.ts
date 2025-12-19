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
import searchRoutes from './search';

const router = Router();

// ✅ Middleware de debug pour TOUTES les requêtes
router.use((req, res, next) => {
    console.log(`📍 [${req.method}] ${req.path} - Query:`, req.query);
    next();
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/ecoles', ecoleRoutes);
router.use('/filieres', filiereRoutes);
router.use('/classes', classeRoutes);

// ✅ Log spécifique pour les groupes
router.use('/groupes', (req, res, next) => {
    console.log('🔵 GROUPE ROUTE HIT:', req.method, req.url, 'Query:', req.query);
    next();
}, groupeRoutes);

router.use('/notifications', notificationRoutes);
router.use('/matieres', matiereRoutes);
router.use('/search', searchRoutes);


export default router;