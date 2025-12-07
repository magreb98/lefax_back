import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entity/user';
import { AuthRequest } from '../types/auth';

/**
 * Middleware d'authentification principal
 * Vérifie le token JWT et charge l'utilisateur dans req.user
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Token d\'accès manquant',
        error: 'NO_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Vérifier la présence du JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET non défini dans les variables d\'environnement');
      return res.status(500).json({
        message: 'Erreur de configuration du serveur',
        error: 'MISSING_JWT_SECRET'
      });
    }

    // Décoder et vérifier le token
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };

    // Récupérer l'utilisateur depuis la base de données
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      relations: ['school', 'classe', 'groupesPartage', 'enseignements']
    });

    // Vérifier l'existence de l'utilisateur
    if (!user) {
      return res.status(401).json({
        message: 'Utilisateur non trouvé',
        error: 'USER_NOT_FOUND'
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Compte désactivé',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Vérifier que l'utilisateur n'est pas suspendu
    if (user.isSuspended) {
      return res.status(403).json({
        message: 'Compte suspendu',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error: any) {
    console.error('Erreur d\'authentification:', error);

    // Gestion des erreurs JWT spécifiques
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expiré',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Token invalide',
        error: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      message: 'Erreur d\'authentification',
      error: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware pour vérifier les rôles
 * À utiliser après authMiddleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Accès refusé. Rôle insuffisant.',
        error: 'INSUFFICIENT_ROLE',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur est admin ou superadmin
 */
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPERADMIN);

/**
 * Middleware pour vérifier que l'utilisateur est enseignant
 */
export const requireTeacher = requireRole(UserRole.ENSEIGNANT, UserRole.ADMIN, UserRole.SUPERADMIN);

/**
 * Middleware pour vérifier que l'utilisateur appartient à une école spécifique
 */
export const requireSchoolMembership = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Utilisateur non authentifié',
      error: 'NOT_AUTHENTICATED'
    });
  }

  if (!req.user.school) {
    return res.status(403).json({
      message: 'Utilisateur non associé à une école',
      error: 'NO_SCHOOL'
    });
  }

  next();
};

/**
 * Middleware pour vérifier que l'utilisateur appartient à une classe spécifique
 */
export const requireClassMembership = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Utilisateur non authentifié',
      error: 'NOT_AUTHENTICATED'
    });
  }

  if (!req.user.classe) {
    return res.status(403).json({
      message: 'Utilisateur non associé à une classe',
      error: 'NO_CLASS'
    });
  }

  next();
};

/**
 * Middleware optionnel d'authentification
 * Ne bloque pas si le token est absent, mais charge l'utilisateur s'il est présent
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Pas de token, on continue sans utilisateur
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      relations: ['school', 'classe', 'groupesPartage']
    });

    if (user && user.isActive && !user.isSuspended) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // En cas d'erreur, on continue sans utilisateur
    next();
  }
};

/**
 * Middleware d'authentification qui accepte le token depuis le header OU le query parameter
 * Utilisé pour les endpoints qui doivent être accessibles via iframe/embed (ex: visualisation de documents)
 */
export const authMiddlewareWithQueryToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Essayer de récupérer le token depuis le header Authorization
    let token: string | undefined;
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else if (req.query.token && typeof req.query.token === 'string') {
      // Sinon, essayer depuis le query parameter
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        message: 'Token d\'accès manquant',
        error: 'NO_TOKEN'
      });
    }

    // Vérifier la présence du JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET non défini dans les variables d\'environnement');
      return res.status(500).json({
        message: 'Erreur de configuration du serveur',
        error: 'MISSING_JWT_SECRET'
      });
    }

    // Décoder et vérifier le token
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };

    // Récupérer l'utilisateur depuis la base de données
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      relations: ['school', 'school.groupePartage', 'classe', 'classe.groupePartage', 'groupesPartage', 'enseignements']
    });

    // Vérifier l'existence de l'utilisateur
    if (!user) {
      return res.status(401).json({
        message: 'Utilisateur non trouvé',
        error: 'USER_NOT_FOUND'
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Compte désactivé',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Vérifier que l'utilisateur n'est pas suspendu
    if (user.isSuspended) {
      return res.status(403).json({
        message: 'Compte suspendu',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error: any) {
    console.error('Erreur d\'authentification:', error);

    // Gestion des erreurs JWT spécifiques
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expiré',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Token invalide',
        error: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      message: 'Erreur d\'authentification',
      error: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware pour vérifier que l'utilisateur est vérifié
 */
export const requireVerified = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Utilisateur non authentifié',
      error: 'NOT_AUTHENTICATED'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      message: 'Email non vérifié. Veuillez vérifier votre email.',
      error: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

/**
 * Middleware pour vérifier que l'utilisateur peut accéder à une ressource
 * basée sur les groupes de partage
 */
export const requireResourceAccess = (getResourceGroupIds: (req: AuthRequest) => Promise<string[]>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié',
        error: 'NOT_AUTHENTICATED'
      });
    }

    try {
      const resourceGroupIds = await getResourceGroupIds(req);

      // Récupérer tous les groupes de l'utilisateur
      const userGroupIds: string[] = [];

      if (req.user.groupesPartage) {
        req.user.groupesPartage.forEach(g => userGroupIds.push(g.id));
      }

      if (req.user.classe?.groupePartage) {
        userGroupIds.push(req.user.classe.groupePartage.id);
      }

      if (req.user.school?.groupePartage) {
        userGroupIds.push(req.user.school.groupePartage.id);
      }

      // Admin et SuperAdmin ont accès à tout
      if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN) {
        return next();
      }

      // Vérifier si l'utilisateur a accès à au moins un groupe de la ressource
      const hasAccess = resourceGroupIds.some(id => userGroupIds.includes(id));

      if (!hasAccess) {
        return res.status(403).json({
          message: 'Accès refusé à cette ressource',
          error: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur lors de la vérification d\'accès:', error);
      return res.status(500).json({
        message: 'Erreur lors de la vérification des permissions',
        error: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};