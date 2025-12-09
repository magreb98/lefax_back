import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { UserRole } from '../entity/user';
import { Ecole } from '../entity/ecole';
import { Filiere } from '../entity/filiere';
import { Class } from '../entity/classe';
import { Matiere } from '../entity/matiere';
import { AuthRequest } from '../types/auth';

/**
 * Middleware pour vérifier que l'utilisateur est un ADMIN avec une école assignée
 * Les SUPERADMIN passent automatiquement (accès global)
 */
export const requireSchoolAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Utilisateur non authentifié',
            error: 'NOT_AUTHENTICATED'
        });
    }

    // SUPERADMIN a accès global
    if (req.user.role === UserRole.SUPERADMIN) {
        return next();
    }

    // Vérifier que l'utilisateur est ADMIN
    if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
            message: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.',
            error: 'NOT_ADMIN',
            requiredRole: 'ADMIN'
        });
    }

    // Vérifier que l'ADMIN a une école assignée
    if (!req.user.school || !req.user.school.id) {
        return res.status(403).json({
            message: 'Vous devez être associé à une école pour effectuer cette action.',
            error: 'NO_SCHOOL_ASSIGNED',
            hint: 'Veuillez créer ou être assigné à une école d\'abord'
        });
    }

    next();
};

/**
 * Helper: Récupérer l'ID de l'école depuis une école
 */
export const getSchoolIdFromEcole = async (ecoleId: string): Promise<string | null> => {
    return ecoleId;
};

/**
 * Helper: Récupérer l'ID de l'école depuis une filière
 */
export const getSchoolIdFromFiliere = async (filiereId: string): Promise<string | null> => {
    const filiereRepository = AppDataSource.getRepository(Filiere);
    const filiere = await filiereRepository.findOne({
        where: { id: filiereId },
        relations: ['school']
    });

    return filiere?.school?.id || null;
};

/**
 * Helper: Récupérer l'ID de l'école depuis une classe
 */
export const getSchoolIdFromClasse = async (classeId: string): Promise<string | null> => {
    const classeRepository = AppDataSource.getRepository(Class);
    const classe = await classeRepository.findOne({
        where: { id: classeId },
        relations: ['filiere', 'filiere.school']
    });

    return classe?.filiere?.school?.id || null;
};

/**
 * Helper: Récupérer l'ID de l'école depuis une matière
 */
export const getSchoolIdFromMatiere = async (matiereId: string): Promise<string | null> => {
    const matiereRepository = AppDataSource.getRepository(Matiere);
    const matiere = await matiereRepository.findOne({
        where: { id: matiereId },
        relations: ['classe', 'classe.filiere', 'classe.filiere.school']
    });

    return matiere?.classe?.filiere?.school?.id || null;
};

/**
 * Middleware pour vérifier que la ressource appartient à l'école de l'admin
 * À utiliser après requireSchoolAdmin
 * Supporte: ecole, filiere, classe, matiere
 */
export const requireOwnSchoolOnly = (resourceType: 'ecole' | 'filiere' | 'classe' | 'matiere', paramName: string = 'id') => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Utilisateur non authentifié',
                error: 'NOT_AUTHENTICATED'
            });
        }

        // SUPERADMIN bypass
        if (req.user.role === UserRole.SUPERADMIN) {
            return next();
        }

        const resourceId = req.params[paramName] || req.body[`${resourceType}Id`];

        if (!resourceId) {
            return res.status(400).json({
                message: `ID de ${resourceType} requis`,
                error: 'MISSING_RESOURCE_ID'
            });
        }

        const userSchoolId = req.user.school?.id;
        if (!userSchoolId) {
            return res.status(403).json({
                message: 'Vous n\'êtes pas associé à une école',
                error: 'NO_SCHOOL_ASSIGNED'
            });
        }

        try {
            let resourceSchoolId: string | null = null;

            switch (resourceType) {
                case 'ecole':
                    resourceSchoolId = await getSchoolIdFromEcole(resourceId);
                    break;
                case 'filiere':
                    resourceSchoolId = await getSchoolIdFromFiliere(resourceId);
                    break;
                case 'classe':
                    resourceSchoolId = await getSchoolIdFromClasse(resourceId);
                    break;
                case 'matiere':
                    resourceSchoolId = await getSchoolIdFromMatiere(resourceId);
                    break;
            }

            if (!resourceSchoolId) {
                return res.status(404).json({
                    message: `${resourceType} non trouvée ou école non associée`,
                    error: 'RESOURCE_NOT_FOUND'
                });
            }

            if (resourceSchoolId !== userSchoolId) {
                return res.status(403).json({
                    message: `Accès refusé. Cette ${resourceType} n'appartient pas à votre école.`,
                    error: 'NOT_YOUR_SCHOOL',
                    userSchool: userSchoolId,
                    resourceSchool: resourceSchoolId
                });
            }

            next();
        } catch (error) {
            console.error('Erreur lors de la vérification de propriété de l\'école:', error);
            return res.status(500).json({
                message: 'Erreur lors de la vérification des permissions',
                error: 'PERMISSION_CHECK_ERROR'
            });
        }
    };
};

/**
 * Helper: Vérifier si un utilisateur peut gérer une ressource
 * Retourne true si SUPERADMIN ou ADMIN de la bonne école
 */
export const canUserManageResource = async (
    user: any,
    resourceType: 'ecole' | 'filiere' | 'classe' | 'matiere',
    resourceId: string
): Promise<{ canManage: boolean; reason?: string }> => {
    if (!user) {
        return { canManage: false, reason: 'Utilisateur non authentifié' };
    }

    // SUPERADMIN peut tout gérer
    if (user.role === UserRole.SUPERADMIN) {
        return { canManage: true };
    }

    // Doit être ADMIN
    if (user.role !== UserRole.ADMIN) {
        return { canManage: false, reason: 'Rôle insuffisant - ADMIN requis' };
    }

    // Doit avoir une école
    const userSchoolId = user.school?.id;
    if (!userSchoolId) {
        return { canManage: false, reason: 'Pas d\'école assignée' };
    }

    try {
        let resourceSchoolId: string | null = null;

        switch (resourceType) {
            case 'ecole':
                resourceSchoolId = await getSchoolIdFromEcole(resourceId);
                break;
            case 'filiere':
                resourceSchoolId = await getSchoolIdFromFiliere(resourceId);
                break;
            case 'classe':
                resourceSchoolId = await getSchoolIdFromClasse(resourceId);
                break;
            case 'matiere':
                resourceSchoolId = await getSchoolIdFromMatiere(resourceId);
                break;
        }

        if (!resourceSchoolId) {
            return { canManage: false, reason: 'Ressource non trouvée ou école non associée' };
        }

        if (resourceSchoolId !== userSchoolId) {
            return { canManage: false, reason: 'La ressource n\'appartient pas à votre école' };
        }

        return { canManage: true };
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return { canManage: false, reason: 'Erreur lors de la vérification' };
    }
};
