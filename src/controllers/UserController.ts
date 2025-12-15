import { Request, Response } from 'express';
import { GroupePartageService } from '../services/GroupePartageService';
import { UserRole } from '../entity/user';
import { UserService } from '../services/Userservice';

export class UserController {
  private userService = new UserService();
  private groupePartageService = new GroupePartageService();

  // ==================== GESTION DES UTILISATEURS ====================

  /**
   * Enregistrer un nouvel utilisateur
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, password, role, phoneNumber, schoolId, classeId } = req.body;

      const user = await this.userService.createUser({
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        role,
        schoolId,
        classeId
      });

      res.status(201).json({
        message: 'Utilisateur enregistré avec succès',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement de l\'utilisateur:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de l\'enregistrement de l\'utilisateur'
      });
    }
  }

  /**
   * Récupérer tous les utilisateurs avec filtres
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { role, schoolId, classeId, isActive } = req.query;

      const users = await this.userService.getAllUsers({
        role: role as UserRole,
        schoolId: schoolId as string,
        classeId: classeId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        requestingUserId: (req as any).userId // On passe l'ID de l'utilisateur connecté
      });

      res.json({
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
          phoneNumber: u.phoneNumber,
          isActive: u.isActive,
          isSuspended: u.isSuspended,
          createdAt: u.createdAt
        }))
      });
    } catch (error: any) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des utilisateurs'
      });
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

      if (!user) {
        res.status(404).json({ message: 'Utilisateur non trouvé' });
        return;
      }

      res.json({ user });
    } catch (error: any) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération de l\'utilisateur'
      });
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role, phoneNumber, password, isActive, isSuspended } = req.body;

      const user = await this.userService.updateUser(id, {
        firstName,
        lastName,
        email,
        role,
        phoneNumber,
        password,
        isActive,
        isSuspended
      });

      res.json({
        message: 'Utilisateur mis à jour avec succès',
        user
      });
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de la mise à jour de l\'utilisateur'
      });
    }
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.userService.deleteUser(id);

      res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de la suppression de l\'utilisateur'
      });
    }
  }

  // ==================== GESTION DES CLASSES ====================

  /**
   * Ajouter un utilisateur à une classe (devient ETUDIANT)
   */
  async addUserToClasse(req: Request, res: Response): Promise<void> {
    try {
      const { userId, classeId } = req.body;

      if (!userId || !classeId) {
        res.status(400).json({
          message: 'Les champs userId et classeId sont requis'
        });
        return;
      }

      const user = await this.userService.addUserToClasse(userId, classeId);

      res.status(200).json({
        message: 'Utilisateur ajouté à la classe avec succès. Rôle mis à jour: ETUDIANT',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          classe: user.classe
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de l\'utilisateur à la classe:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de l\'ajout de l\'utilisateur à la classe'
      });
    }
  }

  /**
   * Ajouter plusieurs utilisateurs à une classe
   */
  async addUsersToClasse(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, classeId } = req.body;

      if (!userIds || !Array.isArray(userIds) || !classeId) {
        res.status(400).json({
          message: 'Les champs userIds (array) et classeId sont requis'
        });
        return;
      }

      const users = await this.userService.addUsersToClasse(userIds, classeId);

      res.status(200).json({
        message: `${users.length} utilisateur(s) ajouté(s) à la classe avec succès`,
        users: users.map((u: { id: any; firstName: any; lastName: any; role: any; }) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role
        }))
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout des utilisateurs à la classe:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de l\'ajout des utilisateurs à la classe'
      });
    }
  }

  /**
   * Retirer un utilisateur d'une classe
   */
  async removeUserFromClasse(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await this.userService.removeUserFromClasse(userId);

      res.status(200).json({
        message: 'Utilisateur retiré de la classe avec succès',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Erreur lors du retrait de l\'utilisateur de la classe:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors du retrait de l\'utilisateur de la classe'
      });
    }
  }

  /**
   * Récupérer tous les étudiants d'une classe
   */
  async getStudentsByClasse(req: Request, res: Response): Promise<void> {
    try {
      const { classeId } = req.params;

      const students = await this.userService.getStudentsByClasse(classeId);

      res.json({
        count: students.length,
        students
      });
    } catch (error: any) {
      console.error('Erreur lors de la récupération des étudiants:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des étudiants'
      });
    }
  }

  /**
   * Récupérer tous les étudiants d'une école
   */
  async getStudentsBySchool(req: Request, res: Response): Promise<void> {
    try {
      const { schoolId } = req.params;

      const students = await this.userService.getStudentsBySchool(schoolId);

      res.json({
        count: students.length,
        students
      });
    } catch (error: any) {
      console.error('Erreur lors de la récupération des étudiants:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des étudiants'
      });
    }
  }

  /**
   * Récupérer tous les enseignants
   */
  async getAllTeachers(req: Request, res: Response): Promise<void> {
    try {
      const teachers = await this.userService.getAllTeachers();

      res.json({
        count: teachers.length,
        teachers
      });
    } catch (error: any) {
      console.error('Erreur lors de la récupération des enseignants:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des enseignants'
      });
    }
  }

  // ==================== GESTION DES STATUTS ====================

  /**
   * Activer/Désactiver un utilisateur
   */
  async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await this.userService.toggleUserStatus(id);

      res.json({
        message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
        user: {
          id: user.id,
          isActive: user.isActive
        }
      });
    } catch (error: any) {
      console.error('Erreur lors du changement de statut:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors du changement de statut'
      });
    }
  }

  /**
   * Suspendre/Réactiver un utilisateur
   */
  async toggleUserSuspension(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await this.userService.toggleUserSuspension(id);

      res.json({
        message: `Utilisateur ${user.isSuspended ? 'suspendu' : 'réactivé'} avec succès`,
        user: {
          id: user.id,
          isSuspended: user.isSuspended
        }
      });
    } catch (error: any) {
      console.error('Erreur lors du changement de suspension:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors du changement de suspension'
      });
    }
  }

  /**
   * Changer l'école d'un utilisateur
   */
  async changeUserSchool(req: Request, res: Response): Promise<void> {
    try {
      const { userId, schoolId } = req.body;

      if (!userId || !schoolId) {
        res.status(400).json({
          message: 'Les champs userId et schoolId sont requis'
        });
        return;
      }

      const user = await this.userService.changeUserSchool(userId, schoolId);

      res.json({
        message: 'École de l\'utilisateur changée avec succès',
        user
      });
    } catch (error: any) {
      console.error('Erreur lors du changement d\'école:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors du changement d\'école'
      });
    }
  }

  // ==================== GESTION DES GROUPES DE PARTAGE ====================

  /**
   * Créer un groupe de partage personnalisé
   */
  async createCustomGroupe(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, userIds = [] } = req.body;

      if (!name) {
        res.status(400).json({ message: 'Le nom du groupe est requis' });
        return;
      }

      const groupe = await this.groupePartageService.createCustomGroupe(name, description, userIds);

      res.status(201).json({
        message: 'Groupe créé avec succès',
        groupe
      });
    } catch (error: any) {
      console.error('Erreur lors de la création du groupe:', error);
      res.status(500).json({ message: 'Erreur lors de la création du groupe' });
    }
  }

  /**
   * Ajouter un utilisateur à un groupe personnalisé
   */
  async addUserToCustomGroupe(req: Request, res: Response): Promise<void> {
    try {
      const { groupeId, userId } = req.params;

      await this.groupePartageService.addUserToCustomGroupe(userId, groupeId);

      res.json({ message: 'Utilisateur ajouté au groupe avec succès' });
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de l\'utilisateur au groupe:', error);
      res.status(500).json({
        message: error.message || 'Erreur lors de l\'ajout de l\'utilisateur au groupe'
      });
    }
  }

  /**
   * Ajouter plusieurs utilisateurs à un groupe
   */
  async addUsersToGroupe(req: Request, res: Response): Promise<void> {
    try {
      const { groupeId } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ message: 'Liste d\'utilisateurs invalide' });
        return;
      }

      await this.groupePartageService.addUsersToGroupe(userIds, groupeId);

      res.json({ message: 'Utilisateurs ajoutés au groupe avec succès' });
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout des utilisateurs au groupe:', error);
      res.status(500).json({
        message: error.message || 'Erreur lors de l\'ajout des utilisateurs au groupe'
      });
    }
  }

  /**
   * Retirer un utilisateur d'un groupe
   */
  async removeUserFromGroupe(req: Request, res: Response): Promise<void> {
    try {
      const { groupeId, userId } = req.params;

      await this.groupePartageService.removeUserFromGroupe(userId, groupeId);

      res.json({ message: 'Utilisateur retiré du groupe avec succès' });
    } catch (error: any) {
      console.error('Erreur lors du retrait de l\'utilisateur du groupe:', error);
      res.status(500).json({
        message: error.message || 'Erreur lors du retrait de l\'utilisateur du groupe'
      });
    }
  }

  /**
   * Retirer plusieurs utilisateurs d'un groupe
   */
  async removeUsersFromGroupe(req: Request, res: Response): Promise<void> {
    try {
      const { groupeId } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ message: 'Liste d\'utilisateurs invalide' });
        return;
      }

      await this.groupePartageService.removeUsersFromGroupe(userIds, groupeId);

      res.json({ message: 'Utilisateurs retirés du groupe avec succès' });
    } catch (error: any) {
      console.error('Erreur lors du retrait des utilisateurs du groupe:', error);
      res.status(500).json({
        message: error.message || 'Erreur lors du retrait des utilisateurs du groupe'
      });
    }
  }

  /**
   * Récupérer tous les groupes d'un enseignant
   */
  async getEnseignantGroupes(req: Request, res: Response): Promise<void> {
    try {
      const { enseignantId } = req.params;

      const groupes = await this.groupePartageService.getEnseignantGroupes(enseignantId);

      res.json({ groupes });
    } catch (error: any) {
      console.error('Erreur lors de la récupération des groupes de l\'enseignant:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des groupes de l\'enseignant'
      });
    }
  }

  /**
   * Récupérer tous les enseignants d'un groupe
   */
  async getEnseignantsInGroupe(req: Request, res: Response): Promise<void> {
    try {
      const { groupeId } = req.params;

      const enseignants = await this.groupePartageService.getEnseignantsInGroupe(groupeId);

      res.json({ enseignants });
    } catch (error: any) {
      console.error('Erreur lors de la récupération des enseignants du groupe:', error);
      res.status(500).json({
        message: error.message || 'Erreur lors de la récupération des enseignants du groupe'
      });
    }
  }

  /**
   * Synchroniser après l'affectation d'un enseignant
   */
  async syncAfterEnseignementAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { enseignementId } = req.params;

      await this.groupePartageService.syncAfterEnseignementAssignment(enseignementId);

      res.json({ message: 'Groupes synchronisés après affectation de l\'enseignant' });
    } catch (error: any) {
      console.error('Erreur lors de la synchronisation après affectation:', error);
      res.status(500).json({
        message: error.message || 'Erreur lors de la synchronisation après affectation'
      });
    }
  }

  /**
   * Exclure un �tudiant d'une �cole (ADMIN only)
   */
  async excludeStudentFromSchool(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, schoolId } = req.body;

      if (!studentId || !schoolId) {
        res.status(400).json({
          message: 'Les champs studentId et schoolId sont requis'
        });
        return;
      }

      const student = await this.userService.excludeStudentFromSchool(studentId, schoolId);

      res.status(200).json({
        message: 'Etudiant exclu de l\'école avec succès',
        user: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          role: student.role
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'exclusion de l\'étudiant:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de l\'exclusion de l\'étudiant'
      });
    }
  }

  /**
   * R�cup�rer tous les enseignants d'une �cole
   */
  async getTeachersBySchool(req: Request, res: Response): Promise<void> {
    try {
      const { schoolId } = req.params;

      const teachers = await this.userService.getTeachersBySchool(schoolId);

      res.json({
        count: teachers.length,
        teachers: teachers.map(t => ({
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          phoneNumber: t.phoneNumber,
          createdAt: t.createdAt
        }))
      });
    } catch (error: any) {
      console.error('Erreur lors de la récupération des enseignants:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des enseignants'
      });
    }
  }

  /**
   * Ajouter un enseignant � une �cole
   */
  async addTeacherToSchool(req: Request, res: Response): Promise<void> {
    try {
      const { email, schoolId } = req.body;

      if (!email || !schoolId) {
        res.status(400).json({
          message: 'Les champs email et schoolId sont requis'
        });
        return;
      }

      const teacher = await this.userService.addTeacherToSchool(email, schoolId);

      res.status(200).json({
        message: 'Enseignant ajouté à l\'école avec succès',
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          role: teacher.role
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de l\'enseignant:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de l\'ajout de l\'enseignant'
      });
    }
  }

  /**
   * Assigner des matières à un enseignant
   */
  async assignMatieresToTeacher(req: Request, res: Response): Promise<void> {
    try {
      const { email, matiereIds } = req.body;

      if (!email || !matiereIds || !Array.isArray(matiereIds)) {
        res.status(400).json({
          message: 'L\'email et une liste d\'IDs de matières sont requis'
        });
        return;
      }

      if (matiereIds.length === 0) {
        res.status(400).json({
          message: 'La liste des matières ne peut pas être vide'
        });
        return;
      }

      await this.userService.assignMatieresToTeacher(email, matiereIds);

      res.status(200).json({
        message: `${matiereIds.length} matière(s) assignée(s) à l'enseignant avec succès`
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'assignation des matières:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de l\'assignation des matières'
      });
    }
  }

  /**
   * Retirer un enseignant d'une �cole
   */
  async removeTeacherFromSchool(req: Request, res: Response): Promise<void> {
    try {
      const { userId, schoolId } = req.body;

      if (!userId || !schoolId) {
        res.status(400).json({
          message: 'Les champs userId et schoolId sont requis'
        });
        return;
      }

      const teacher = await this.userService.removeTeacherFromSchool(userId, schoolId);

      res.status(200).json({
        message: 'Enseignant retiré de l\'école avec succès',
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          role: teacher.role
        }
      });
    } catch (error: any) {
      console.error('Erreur lors du retrait de l\'enseignant:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors du retrait de l\'enseignant'
      });
    }
  }

  /**
   * Accorder la permission de voir tous les groupes (ADMIN only)
   */
  async grantViewAllGroupsPermission(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ message: 'userId est requis' });
        return;
      }

      const user = await this.userService.grantViewAllGroupsPermission(userId);

      res.status(200).json({
        message: 'Permission accord�e avec succ�s',
        user: {
          id: user.id,
          canViewAllGroups: user.canViewAllGroups
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'octroi de la permission:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de l\'octroi de la permission'
      });
    }
  }

  /**
   * Révoquer la permission de voir tous les groupes (ADMIN only)
   */
  async revokeViewAllGroupsPermission(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ message: 'userId est requis' });
        return;
      }

      const user = await this.userService.revokeViewAllGroupsPermission(userId);

      res.status(200).json({
        message: 'Permission révoquée avec succès',
        user: {
          id: user.id,
          canViewAllGroups: user.canViewAllGroups
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de la révocation de la permission:', error);
      res.status(400).json({
        message: error.message || 'Erreur lors de la révocation de la permission'
      });
    }
  }
}
