import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entity/user';
import { formatErrorResponse } from '../util/helper';

export class AuthController {
  private userRepository = AppDataSource.getRepository(User);

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      console.log('Login request received for password:', password);
      if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis' });
      }

      const user = await this.userRepository.findOne({
        where: { email, isActive: true },
        relations: ['school', 'classe', 'ecoles']
      });

      console.log('Login attempt for email:', email);

      if (!user) {
        return res.status(401).json({ message: 'Identifiants invalides' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Identifiants invalides' });
      }

      const jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key-un-peu-plus-secure-comme-ca';
      const jwtExpiresIn: string = process.env.JWT_EXPIRES_IN || '24h';

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        jwtSecret,
        { expiresIn: jwtExpiresIn } as SignOptions
      );

      // Si l'admin n'a pas de school définie mais gère une école, on utilise cette école
      let userSchool = user.school;
      if (!userSchool && user.ecoles && user.ecoles.length > 0) {
        userSchool = user.ecoles[0];
      }

      // Retourner le token et les informations utilisateur (sans le mot de passe)
      const userResponse = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phoneNumber,
        isActive: user.isActive,
        school: userSchool,
        classe: user.classe
      };

      return res.json({
        user: userResponse,
        token
      });
    } catch (error) {
      return res.status(500).json(formatErrorResponse(error));
    }
  }

  async logout(req: Request, res: Response) {
    try {

      return res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors de la déconnexion', error });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['school', 'classe', 'ecoles'],
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'phoneNumber', 'isActive', 'createdAt']
      });

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Si l'admin n'a pas de school définie mais gère une école, on utilise cette école
      let userSchool = user.school;
      if (!userSchool && user.ecoles && user.ecoles.length > 0) {
        userSchool = user.ecoles[0];
      }

      // Retourner l'utilisateur avec le nom complet
      const userResponse = {
        ...user,
        name: `${user.firstName} ${user.lastName}`,
        school: userSchool
      };

      return res.json(userResponse);
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur', error });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        jwtSecret,
        { expiresIn: jwtExpiresIn } as SignOptions
      );

      return res.json({ token });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors du rafraîchissement du token', error });
    }
  }
}
