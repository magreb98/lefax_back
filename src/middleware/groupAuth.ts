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

/**
 * Fonction utilitaire pour vérifier si un utilisateur peut publier dans un groupe
 * Retourne un objet { canPublish: boolean, reason?: string }
 */
export const canUserPublishToGroup = async (
    user: any,
    groupeId: string
): Promise<{ canPublish: boolean; reason?: string }> => {
    try {
        if (!user) {
            return { canPublish: false, reason: 'Utilisateur non authentifié' };
        }

        const groupeRepository = AppDataSource.getRepository(GroupePartage);
        const groupe = await groupeRepository.findOne({
            where: { id: groupeId },
            relations: ['owner', 'allowedPublishers', 'matiere', 'classe', 'ecole', 'classe.filiere', 'classe.filiere.school']
        });

        if (!groupe) {
            return { canPublish: false, reason: 'Groupe non trouvé' };
        }

        // SUPERADMIN peut publier partout
        if (user.role === UserRole.SUPERADMIN) {
            return { canPublish: true };
        }

        // ADMIN peut publier dans tous les groupes de son école
        if (user.role === UserRole.ADMIN && user.school) {
            // Vérifier si le groupe appartient à l'école de l'admin
            if (groupe.ecole?.id === user.school.id) {
                return { canPublish: true };
            }
            // Si c'est un groupe de classe, vérifier l'école via la filière
            if (groupe.classe?.filiere?.school?.id === user.school.id) {
                return { canPublish: true };
            }
        }

        // Propriétaire du groupe peut toujours publier
        if (groupe.owner?.id === user.id) {
            return { canPublish: true };
        }

        // ENSEIGNANT peut publier dans les groupes de matières qu'il enseigne
        if (user.role === UserRole.ENSEIGNANT && groupe.type === 'matiere' && groupe.matiere) {
            const matiereRepository = AppDataSource.getRepository(Matiere);
            const matiere = await matiereRepository.findOne({
                where: { id: groupe.matiere.id },
                relations: ['enseignementAssignments', 'enseignementAssignments.enseignant']
            });

            if (matiere?.enseignementAssignments) {
                const isTeacher = matiere.enseignementAssignments.some(
                    (e: any) => e.enseignant?.id === user.id
                );
                if (isTeacher) {
                    return { canPublish: true };
                }
            }
        }

        // Vérifier si l'utilisateur est dans la liste des allowedPublishers
        if (groupe.allowedPublishers?.some(p => p.id === user.id)) {
            return { canPublish: true };
        }

        return {
            canPublish: false,
            reason: 'Vous n\'êtes pas autorisé à publier dans ce groupe'
        };

    } catch (error: any) {
        console.error('Erreur lors de la vérification des droits de publication:', error);
        return { canPublish: false, reason: 'Erreur lors de la vérification des permissions' };
    }
};

/**
 * Vérifie si un utilisateur peut publier dans TOUS les groupes spécifiés
 * Si aucun groupe n'est spécifié, retourne true (upload sans groupe)
 */
export const canUserPublishToGroups = async (
    user: any,
    groupeIds: string[]
): Promise<{ canPublish: boolean; deniedGroups: string[]; reason?: string }> => {
    if (!groupeIds || groupeIds.length === 0) {
        // Si aucun groupe spécifié, autoriser (upload public)
        return { canPublish: true, deniedGroups: [] };
    }

    const deniedGroups: string[] = [];

    for (const groupeId of groupeIds) {
        const result = await canUserPublishToGroup(user, groupeId);
        if (!result.canPublish) {
            deniedGroups.push(groupeId);
        }
    }

    if (deniedGroups.length > 0) {
        return {
            canPublish: false,
            deniedGroups,
            reason: `Vous n'êtes pas autorisé à publier dans ${deniedGroups.length} groupe(s)`
        };
    }

    return { canPublish: true, deniedGroups: [] };
};
