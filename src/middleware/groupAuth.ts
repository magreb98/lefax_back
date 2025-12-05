import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { GroupePartage } from '../entity/groupe.partage';
import { UserRole } from '../entity/user';
import { Matiere } from '../entity/matiere';
import { AuthRequest } from '../types/auth';

/**
 * Middleware pour vérifier que l'utilisateur est administrateur d'un groupe
 * Vérifie si:
 * - L'utilisateur est le propriétaire du groupe, OU
 * - L'utilisateur est SUPERADMIN ou ADMIN, OU
 * - L'utilisateur est enseignant du groupe de matière
 */
export const requireGroupAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: 'Utilisateur non authentifié',
                error: 'NOT_AUTHENTICATED'
            });
        }

        const { groupeId } = req.params;
        if (!groupeId) {
            return res.status(400).json({
                message: 'ID de groupe requis',
                error: 'MISSING_GROUP_ID'
            });
        }

        // Récupérer le groupe avec les relations nécessaires
        const groupeRepository = AppDataSource.getRepository(GroupePartage);
        const groupe = await groupeRepository.findOne({
            where: { id: groupeId },
            relations: ['owner', 'matiere']
        });

        if (!groupe) {
            return res.status(404).json({
                message: 'Groupe non trouvé',
                error: 'GROUP_NOT_FOUND'
            });
        }

        // SuperAdmin et Admin ont toujours accès
        if (req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.ADMIN) {
            return next();
        }

        // Vérifier si l'utilisateur est le propriétaire
        if (groupe.owner && groupe.owner.id === req.user.id) {
            return next();
        }

        // Si c'est un groupe de matière, vérifier si l'utilisateur est l'enseignant
        if (groupe.type === 'matiere' && groupe.matiere && req.user.role === UserRole.ENSEIGNANT) {
            const matiereRepository = AppDataSource.getRepository(Matiere);
            const matiere = await matiereRepository.findOne({
                where: { id: groupe.matiere.id },
                relations: ['enseignementAssignments', 'enseignementAssignments.enseignant']
            });

            if (matiere?.enseignementAssignments) {
                const isTeacher = matiere.enseignementAssignments.some((e: any) => e.enseignant?.id === req.user!.id);
                if (isTeacher) {
                    return next();
                }
            }
        }

        return res.status(403).json({
            message: 'Accès refusé. Vous devez être administrateur ou propriétaire du groupe.',
            error: 'NOT_GROUP_ADMIN'
        });

    } catch (error: any) {
        console.error('Erreur lors de la vérification des droits admin:', error);
        return res.status(500).json({
            message: 'Erreur lors de la vérification des permissions',
            error: 'PERMISSION_CHECK_ERROR'
        });
    }
};

/**
 * Middleware pour vérifier que l'utilisateur peut publier dans un groupe
 * Vérifie si:
 * - L'utilisateur est administrateur du groupe (via requireGroupAdmin), OU
 * - L'utilisateur est dans la liste des allowedPublishers
 */
export const requirePublisherOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: 'Utilisateur non authentifié',
                error: 'NOT_AUTHENTICATED'
            });
        }

        const { groupeId } = req.params;
        if (!groupeId) {
            return res.status(400).json({
                message: 'ID de groupe requis',
                error: 'MISSING_GROUP_ID'
            });
        }

        // Récupérer le groupe avec les relations nécessaires
        const groupeRepository = AppDataSource.getRepository(GroupePartage);
        const groupe = await groupeRepository.findOne({
            where: { id: groupeId },
            relations: ['owner', 'allowedPublishers', 'matiere']
        });

        if (!groupe) {
            return res.status(404).json({
                message: 'Groupe non trouvé',
                error: 'GROUP_NOT_FOUND'
            });
        }

        // SuperAdmin et Admin peuvent toujours publier
        if (req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.ADMIN) {
            return next();
        }

        // Vérifier si l'utilisateur est le propriétaire
        if (groupe.owner && groupe.owner.id === req.user.id) {
            return next();
        }

        // Si c'est un groupe de matière, vérifier si l'utilisateur est l'enseignant
        if (groupe.type === 'matiere' && groupe.matiere && req.user.role === UserRole.ENSEIGNANT) {
            const matiereRepository = AppDataSource.getRepository(Matiere);
            const matiere = await matiereRepository.findOne({
                where: { id: groupe.matiere.id },
                relations: ['enseignementAssignments', 'enseignementAssignments.enseignant']
            });

            if (matiere?.enseignementAssignments) {
                const isTeacher = matiere.enseignementAssignments.some((e: any) => e.enseignant?.id === req.user!.id);
                if (isTeacher) {
                    return next();
                }
            }
        }

        // Vérifier si l'utilisateur est dans la liste des allowedPublishers
        if (groupe.allowedPublishers && groupe.allowedPublishers.some(p => p.id === req.user!.id)) {
            return next();
        }

        return res.status(403).json({
            message: 'Accès refusé. Vous n\'êtes pas autorisé à publier dans ce groupe.',
            error: 'NOT_PUBLISHER'
        });

    } catch (error: any) {
        console.error('Erreur lors de la vérification des droits de publication:', error);
        return res.status(500).json({
            message: 'Erreur lors de la vérification des permissions',
            error: 'PERMISSION_CHECK_ERROR'
        });
    }
};
