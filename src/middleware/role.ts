
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entity/user';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    isActive?: boolean;
  };
}

export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé: permissions insuffisantes' });
    }

    next();
  };
};
