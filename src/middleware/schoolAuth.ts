import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
import { UserRole } from '../entity/user';

/**
 * Middleware pour vérifier que l'utilisateur est SUPERADMIN uniquement
 */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Utilisateur non authentifié',
            error: 'NOT_AUTHENTICATED'
        });
    }

    if (req.user.role !== UserRole.SUPERADMIN) {
        return res.status(403).json({
            message: 'Accès refusé. Seuls les SUPERADMIN peuvent effectuer cette action.',
            error: 'SUPERADMIN_REQUIRED',
            current: req.user.role
        });
    }

    next();
};

/**
 * Middleware pour vérifier que l'ADMIN accède uniquement aux ressources de son école
 * Le schoolId doit être dans req.body ou req.params
 */
export const requireSchoolAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Utilisateur non authentifié',
            error: 'NOT_AUTHENTICATED'
        });
    }

    // SUPERADMIN a accès à toutes les écoles
    if (req.user.role === UserRole.SUPERADMIN) {
        return next();
    }

    // ADMIN doit appartenir à une école
    if (req.user.role === UserRole.ADMIN) {
        if (!req.user.school) {
            return res.status(403).json({
                message: 'Administrateur non associé à une école',
                error: 'NO_SCHOOL'
            });
        }

        // Récupérer le schoolId depuis les params ou le body
        const schoolId = req.params.schoolId || req.body.schoolId;

        if (!schoolId) {
            return res.status(400).json({
                message: 'schoolId manquant dans la requête',
                error: 'MISSING_SCHOOL_ID'
            });
        }

        // Vérifier que l'ADMIN accède à son école
        if (req.user.school.id !== schoolId) {
            return res.status(403).json({
                message: 'Accès refusé. Vous ne pouvez accéder qu\'aux ressources de votre école.',
                error: 'SCHOOL_ACCESS_DENIED',
                userSchool: req.user.school.id,
                requestedSchool: schoolId
            });
        }
    }

    next();
};

/**
 * Middleware pour vérifier que l'utilisateur peut gérer un étudiant spécifique
 * Utilisé pour les opérations sur les étudiants (exclusion, modification, etc.)
 */
export const requireStudentManagementAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Utilisateur non authentifié',
            error: 'NOT_AUTHENTICATED'
        });
    }

    // SUPERADMIN a accès à tous les étudiants
    if (req.user.role === UserRole.SUPERADMIN) {
        return next();
    }

    // ADMIN peut gérer les étudiants de son école
    if (req.user.role === UserRole.ADMIN) {
        if (!req.user.school) {
            return res.status(403).json({
                message: 'Administrateur non associé à une école',
                error: 'NO_SCHOOL'
            });
        }

        // Le schoolId doit correspondre à l'école de l'admin
        const schoolId = req.body.schoolId;
        if (schoolId && req.user.school.id !== schoolId) {
            return res.status(403).json({
                message: 'Vous ne pouvez gérer que les étudiants de votre école',
                error: 'SCHOOL_MISMATCH'
            });
        }

        return next();
    }

    // Les autres rôles n'ont pas accès
    return res.status(403).json({
        message: 'Accès refusé. Permissions insuffisantes.',
        error: 'INSUFFICIENT_PERMISSIONS'
    });
};

/**
 * Middleware pour filtrer automatiquement les requêtes par école pour les ADMIN
 * Ajoute le schoolId de l'admin aux query params
 */
export const autoFilterBySchool = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Utilisateur non authentifié',
            error: 'NOT_AUTHENTICATED'
        });
    }

    // Si l'utilisateur est ADMIN et a une école, filtrer automatiquement
    if (req.user.role === UserRole.ADMIN && req.user.school) {
        // Force le filtrage par l'école de l'admin
        req.query.schoolId = req.user.school.id;
    }

    next();
};
