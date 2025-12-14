import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entity/user';
import { formatErrorResponse } from '../util/helper';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { MoreThan } from 'typeorm';

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

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        // Pour des raisons de sécurité, on ne dit pas si l'utilisateur existe ou non
        return res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
      }

      // Générer un token unique
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Définir l'expiration (1 heure)
      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 heure

      await this.userRepository.save(user);

      // Créer l'URL de réinitialisation
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

      // Configurer le transporteur email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true pour 465, false pour les autres ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Envoyer l'email
      const message = `
        Vous recevez cet email car vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte.
        
        Veuillez cliquer sur le lien suivant ou le coller dans votre navigateur pour terminer le processus :
        
        ${resetUrl}
        
        Si vous ne l'avez pas demandé, veuillez ignorer cet email et votre mot de passe restera inchangé.
      `;

      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@lefax.com',
          to: user.email,
          subject: 'Réinitialisation du mot de passe',
          text: message
        });
      } catch (emailError) {
        console.error('Erreur d\'envoi d\'email:', emailError);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await this.userRepository.save(user);
        return res.status(500).json({ message: 'Impossible d\'envoyer l\'email' });
      }

      return res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    } catch (error) {
      return res.status(500).json(formatErrorResponse(error));
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const user = await this.userRepository.findOne({
        where: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpires: MoreThan(new Date())
        }
      });

      if (!user) {
        return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou a expiré.' });
      }

      // Hacher le nouveau mot de passe
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await this.userRepository.save(user);

      return res.json({ message: 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.' });
    } catch (error) {
      return res.status(500).json(formatErrorResponse(error));
    }
  }
}
