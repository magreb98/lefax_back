import { Request } from 'express';
import { User } from '../entity/user';

/**
 * Interface étendue de Request avec les informations d'authentification
 */
export interface AuthRequest extends Request {
  /**
   * Utilisateur authentifié avec toutes ses relations
   */
  user?: User;
  
  /**
   * ID de l'utilisateur authentifié (pour accès rapide)
   */
  userId?: string;
}