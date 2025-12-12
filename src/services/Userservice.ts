import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entity/user";
import { Class } from "../entity/classe";
import { Ecole } from "../entity/ecole";
import { GroupePartageService } from "./GroupePartageService";
import bcrypt from 'bcryptjs';
import { GroupePartage } from "../entity/groupe.partage";

export class UserService {
    private userRepository = AppDataSource.getRepository(User);
    private classRepository = AppDataSource.getRepository(Class);
    private ecoleRepository = AppDataSource.getRepository(Ecole);
    private groupePartageRepository = AppDataSource.getRepository(GroupePartage);
    private groupePartageService = new GroupePartageService();

    /**
     * Créer un nouvel utilisateur
     */
    async createUser(data: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        phoneNumber: string;
        role?: UserRole;
        schoolId?: string;
        classeId?: string;
    }): Promise<User> {
        const existingUser = await this.userRepository.findOne({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new Error('Cet email est déjà enregistré');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = this.userRepository.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashedPassword,
            phoneNumber: data.phoneNumber,
            role: data.role || UserRole.USER
        });

        if (data.schoolId) {
            const school = await this.ecoleRepository.findOne({ where: { id: data.schoolId } });
            if (school) user.school = school;
        }

        if (data.classeId) {
            const classe = await this.classRepository.findOne({ where: { id: data.classeId } });
            if (classe) {
                user.classe = classe;
                if (user.role !== UserRole.ENSEIGNANT) {
                    user.role = UserRole.ETUDIANT;
                }
            }
        }

        await this.userRepository.save(user);

        // Auto-join user to public group
        await this.addUserToPublicGroup(user.id);

        if (data.classeId) {
            await this.groupePartageService.syncClasseGroupePartage(data.classeId);
        }

        return user;
    }

    /**
     * Trouver ou créer le groupe "Public"
     */
    private async findOrCreatePublicGroup(): Promise<GroupePartage> {
        let publicGroup = await this.groupePartageRepository.findOne({
            where: { groupeName: 'Public' },
            relations: ['users']
        });

        if (!publicGroup) {
            // Créer le groupe Public s'il n'existe pas
            publicGroup = this.groupePartageRepository.create({
                groupeName: 'Public',
                description: 'Groupe public accessible à tous les utilisateurs',
                type: 'custom' as any,
                isActive: true
            });
            await this.groupePartageRepository.save(publicGroup);
        }

        return publicGroup;
    }

    /**
     * Ajouter un utilisateur au groupe Public
     */
    private async addUserToPublicGroup(userId: string): Promise<void> {
        try {
            const publicGroup = await this.findOrCreatePublicGroup();

            // Vérifier si l'utilisateur n'est pas déjà membre
            const isMember = publicGroup.users?.some(u => u.id === userId);

            if (!isMember) {
                await this.groupePartageService.addUserToCustomGroupe(userId, publicGroup.id);
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout au groupe Public:', error);
            // Ne pas bloquer la création de l'utilisateur si l'ajout au groupe Public échoue
        }
    }

    /**
     * Récupérer tous les utilisateurs
     */
    async getAllUsers(filters?: {
        role?: UserRole;
        schoolId?: string;
        classeId?: string;
        isActive?: boolean;
    }): Promise<User[]> {
        const query = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.school', 'school')
            .leftJoinAndSelect('user.classe', 'classe');

        if (filters?.role) query.andWhere('user.role = :role', { role: filters.role });
        if (filters?.schoolId) query.andWhere('school.id = :schoolId', { schoolId: filters.schoolId });
        if (filters?.classeId) query.andWhere('classe.id = :classeId', { classeId: filters.classeId });
        if (filters?.isActive !== undefined) query.andWhere('user.isActive = :isActive', { isActive: filters.isActive });

        return await query.getMany();
    }

    /**
     * Récupérer un utilisateur par ID
     */
    async getUserById(id: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { id },
            relations: ['school', 'classe', 'groupesPartage', 'enseignements', 'enseignements.matiere', 'enseignements.classe', 'ecoles']
        });
    }

    /**
     * Récupérer un utilisateur par email
     */
    async getUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { email },
            relations: ['school', 'classe', 'groupesPartage']
        });
    }

    /**
     * Mettre à jour un utilisateur
     */
    async updateUser(id: string, data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
        password?: string;
        role?: UserRole;
        isActive?: boolean;
        isSuspended?: boolean;
    }): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new Error('Utilisateur non trouvé');

        if (data.firstName) user.firstName = data.firstName;
        if (data.lastName) user.lastName = data.lastName;
        if (data.email) user.email = data.email;
        if (data.phoneNumber) user.phoneNumber = data.phoneNumber;
        if (data.role) user.role = data.role;
        if (data.isActive !== undefined) user.isActive = data.isActive;
        if (data.isSuspended !== undefined) user.isSuspended = data.isSuspended;

        if (data.password) {
            user.password = await bcrypt.hash(data.password, 10);
        }

        return await this.userRepository.save(user);
    }

    /**
     * Supprimer un utilisateur
     */
    async deleteUser(id: string): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['classe']
        });

        if (!user) throw new Error('Utilisateur non trouvé');

        const classeId = user.classe?.id;
        await this.userRepository.remove(user);

        if (classeId) {
            await this.groupePartageService.syncClasseGroupePartage(classeId);
        }
    }

    /**
     * Ajouter un utilisateur à une classe
     */
    async addUserToClasse(userId: string, classeId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['classe', 'school']
        });
        if (!user) throw new Error('Utilisateur non trouvé');

        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['filiere', 'filiere.school']
        });
        if (!classe) throw new Error('Classe non trouvée');

        user.classe = classe;
        if (user.role !== UserRole.ENSEIGNANT && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
            user.role = UserRole.ETUDIANT;
        }

        if (!user.school && classe.filiere?.school) {
            user.school = classe.filiere.school;
        }

        await this.userRepository.save(user);
        await this.groupePartageService.syncClasseGroupePartage(classeId);

        return user;
    }

    /**
     * Retirer un utilisateur d'une classe
     */
    async removeUserFromClasse(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['classe']
        });
        if (!user) throw new Error('Utilisateur non trouvé');

        const classeId = user.classe?.id;
        user.classe = undefined;

        if (user.role === UserRole.ETUDIANT) {
            user.role = UserRole.USER;
        }

        await this.userRepository.save(user);

        if (classeId) {
            await this.groupePartageService.syncClasseGroupePartage(classeId);
        }

        return user;
    }

    /**
     * Récupérer tous les étudiants d'une classe
     */
    async getStudentsByClasse(classeId: string): Promise<User[]> {
        return await this.userRepository.find({
            where: {
                classe: { id: classeId },
                role: UserRole.ETUDIANT
            },
            relations: ['school', 'classe']
        });
    }

    /**
     * Récupérer tous les étudiants d'une école
     */
    async getStudentsBySchool(schoolId: string): Promise<User[]> {
        return await this.userRepository.find({
            where: {
                school: { id: schoolId },
                role: UserRole.ETUDIANT
            },
            relations: ['school', 'classe']
        });
    }

    /**
     * Récupérer tous les enseignants
     */
    async getAllTeachers(): Promise<User[]> {
        return await this.userRepository.find({
            where: { role: UserRole.ENSEIGNANT },
            relations: ['enseignements', 'enseignements.ecole', 'enseignements.classe', 'enseignements.matiere']
        });
    }

    /**
     * Activer/Désactiver un utilisateur
     */
    async toggleUserStatus(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new Error('Utilisateur non trouvé');

        user.isActive = !user.isActive;
        return await this.userRepository.save(user);
    }

    /**
     * Suspendre/Réactiver un utilisateur
     */
    async toggleUserSuspension(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new Error('Utilisateur non trouvé');

        user.isSuspended = !user.isSuspended;
        return await this.userRepository.save(user);
    }

    /**
     * Nommer un étudiant délégué ou le destituer
     */
    async toggleUserDelegate(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new Error('Utilisateur non trouvé');
        if (!user.classe) throw new Error('L\'utilisateur doit appartenir à une salle de classe');

        user.isDelegate = !user.isDelegate;
        return await this.userRepository.save(user);
    }

    /**
     * Vérifier si un utilisateur peut accéder à une ressource
     */
    async canAccessResource(userId: string, resourceGroupeIds: string[]): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['groupesPartage', 'classe', 'classe.groupePartage', 'school', 'school.groupePartage']
        });

        if (!user) return false;

        const userGroupeIds: string[] = [];
        if (user.groupesPartage) {
            user.groupesPartage.forEach(g => userGroupeIds.push(g.id));
        }
        if (user.classe?.groupePartage) userGroupeIds.push(user.classe.groupePartage.id);
        if (user.school?.groupePartage) userGroupeIds.push(user.school.groupePartage.id);

        return resourceGroupeIds.some(id => userGroupeIds.includes(id));
    }

    // ==================== NOUVELLES MÉTHODES POUR LA GESTION DES DROITS ====================

    /**
     * Donner le droit de créer une école à un utilisateur (SUPERADMIN only)
     */
    async grantSchoolCreationRight(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error('Utilisateur non trouvé');
        if (user.canCreateSchool) throw new Error('Cet utilisateur a déjà le droit de créer une école');

        user.canCreateSchool = true;
        return await this.userRepository.save(user);
    }

    /**
     * Révoquer le droit de créer une école (SUPERADMIN only)
     */
    async revokeSchoolCreationRight(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error('Utilisateur non trouvé');
        if (!user.canCreateSchool) throw new Error('Cet utilisateur n\'a pas le droit de créer une école');

        user.canCreateSchool = false;
        return await this.userRepository.save(user);
    }

    /**
     * Promouvoir un utilisateur en ADMIN d'une école
     * Un utilisateur ne peut être admin que d'UNE SEULE école
     */
    async promoteToAdmin(userId: string, ecoleId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['ecoles']
        });
        if (!user) throw new Error('Utilisateur non trouvé');

        // Vérifier que l'utilisateur n'est pas déjà admin d'une autre école
        if (user.ecoles && user.ecoles.length > 0) {
            throw new Error('Cet utilisateur est déjà administrateur d\'une école. Un utilisateur ne peut être admin que d\'une seule école.');
        }

        const ecole = await this.ecoleRepository.findOne({
            where: { id: ecoleId },
            relations: ['schoolAdmin']
        });
        if (!ecole) throw new Error('École non trouvée');

        // Vérifier que l'école n'a pas déjà un admin différent
        if (ecole.schoolAdmin && ecole.schoolAdmin.id !== userId) {
            throw new Error('Cette école a déjà un administrateur');
        }

        // Promouvoir l'utilisateur
        user.role = UserRole.ADMIN;
        user.school = ecole;
        await this.userRepository.save(user);

        // Associer l'utilisateur comme admin de l'école
        ecole.schoolAdmin = user;
        await this.ecoleRepository.save(ecole);

        return user;
    }

    /**
     * Rétrograder un ADMIN en USER
     */
    async demoteFromAdmin(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['ecoles', 'school']
        });
        if (!user) throw new Error('Utilisateur non trouvé');
        if (user.role !== UserRole.ADMIN) throw new Error('Cet utilisateur n\'est pas administrateur');

        // Retirer le rôle ADMIN
        user.role = UserRole.USER;
        user.school = undefined;
        await this.userRepository.save(user);

        // Retirer l'utilisateur comme admin des écoles
        if (user.ecoles && user.ecoles.length > 0) {
            for (const ecole of user.ecoles) {
                ecole.schoolAdmin = null as any;
                await this.ecoleRepository.save(ecole);
            }
        }

        return user;
    }

    /**
     * Vérifier si un utilisateur peut créer une école
     */
    async canCreateSchool(userId: string): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'canCreateSchool']
        });

        return user ? user.canCreateSchool : false;
    }

    /**
     * Vérifier si un utilisateur est admin d'une école spécifique
     */
    async isSchoolAdmin(userId: string, ecoleId: string): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['ecoles']
        });

        if (!user || user.role !== UserRole.ADMIN || !user.ecoles) return false;

        return user.ecoles.some(ecole => ecole.id === ecoleId);
    }

    /**
 * Ajouter plusieurs utilisateurs à une classe
 */
    async addUsersToClasse(userIds: string[], classeId: string): Promise<User[]> {
        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['filiere', 'filiere.school']
        });
        if (!classe) throw new Error('Classe non trouvée');

        const users: User[] = [];

        for (const userId of userIds) {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: ['classe', 'school']
            });

            if (!user) {
                console.warn(`Utilisateur ${userId} non trouvé, ignoré`);
                continue;
            }

            user.classe = classe;
            if (user.role !== UserRole.ENSEIGNANT && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
                user.role = UserRole.ETUDIANT;
            }

            if (!user.school && classe.filiere?.school) {
                user.school = classe.filiere.school;
            }

            await this.userRepository.save(user);
            users.push(user);
        }

        // Synchroniser le groupe de partage une seule fois après avoir ajouté tous les utilisateurs
        await this.groupePartageService.syncClasseGroupePartage(classeId);

        return users;
    }

    /**
     * Changer l'école d'un utilisateur
     */
    async changeUserSchool(userId: string, schoolId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['school']
        });
        if (!user) throw new Error('Utilisateur non trouvé');

        const school = await this.ecoleRepository.findOne({
            where: { id: schoolId }
        });
        if (!school) throw new Error('École non trouvée');

        user.school = school;
        return await this.userRepository.save(user);
    }

    /**
     * Exclure un �tudiant d'une �cole
     */
    async excludeStudentFromSchool(studentId: string, schoolId: string): Promise<User> {
        const student = await this.userRepository.findOne({
            where: { id: studentId },
            relations: ['school', 'classe', 'groupesPartage']
        });

        if (!student) throw new Error('�tudiant non trouv�');
        if (!student.school || student.school.id !== schoolId) {
            throw new Error('Cet étudiant n\'appartient pas à cette école');
        }
        if (student.role !== UserRole.ETUDIANT) {
            throw new Error('Seuls les étudiants peuvent être exclus d\'une école');
        }

        // R�cup�rer tous les groupes li�s � l'�cole
        const schoolGroups = await this.groupePartageRepository
            .createQueryBuilder('groupe')
            .leftJoinAndSelect('groupe.ecole', 'ecole')
            .leftJoinAndSelect('groupe.filiere', 'filiere')
            .leftJoinAndSelect('filiere.school', 'filiereSchool')
            .leftJoinAndSelect('groupe.classe', 'classe')
            .leftJoinAndSelect('classe.filiere', 'classeFiliere')
            .leftJoinAndSelect('classeFiliere.school', 'classeFiliereSchool')
            .where('ecole.id = :schoolId', { schoolId })
            .orWhere('filiereSchool.id = :schoolId', { schoolId })
            .orWhere('classeFiliereSchool.id = :schoolId', { schoolId })
            .getMany();

        // Retirer l'�tudiant de tous les groupes de l'�cole
        if (student.groupesPartage && student.groupesPartage.length > 0) {
            const schoolGroupIds = schoolGroups.map(g => g.id);
            student.groupesPartage = student.groupesPartage.filter(
                g => !schoolGroupIds.includes(g.id)
            );
        }

        // Retirer l'�tudiant de sa classe
        const classeId = student.classe?.id;
        student.classe = undefined;

        // Retirer l'�tudiant de l'�cole
        student.school = undefined;

        // Changer le r�le en USER
        student.role = UserRole.USER;

        await this.userRepository.save(student);

        // Synchroniser le groupe de la classe si n�cessaire
        if (classeId) {
            await this.groupePartageService.syncClasseGroupePartage(classeId);
        }

        return student;
    }

    /**
     * R�cup�rer tous les enseignants d'une �cole
     */
    async getTeachersBySchool(schoolId: string): Promise<User[]> {
        return await this.userRepository.find({
            where: {
                school: { id: schoolId },
                role: UserRole.ENSEIGNANT
            },
            relations: ['school', 'classe', 'enseignements']
        });
    }

    /**
     * Ajouter un enseignant � une �cole
     */
    async addTeacherToSchool(email: string, schoolId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { email: email },
            relations: ['school']
        });

        if (!user) throw new Error('Utilisateur non trouv�');

        const school = await this.ecoleRepository.findOne({
            where: { id: schoolId }
        });

        if (!school) throw new Error('�cole non trouv�e');

        // Promouvoir en enseignant si ce n'est pas d�j� le cas
        if (user.role === UserRole.USER) {
            user.role = UserRole.ENSEIGNANT;
        }

        user.school = school;
        return await this.userRepository.save(user);
    }

    /**
     * Retirer un enseignant d'une �cole
     */
    async removeTeacherFromSchool(userId: string, schoolId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['school']
        });

        if (!user) throw new Error('Utilisateur non trouv�');
        if (!user.school || user.school.id !== schoolId) {
            throw new Error('Cet enseignant n\'appartient pas à cette école');
        }
        if (user.role !== UserRole.ENSEIGNANT) {
            throw new Error('Cet utilisateur n\'est pas un enseignant');
        }

        user.school = undefined;
        user.role = UserRole.USER;

        return await this.userRepository.save(user);
    }

    /**
     * Assigner des matières à un enseignant
     * Crée les entrées EnseignementAssignment et synchronise les permissons
     */
    async assignMatieresToTeacher(email: string, matiereIds: string[]): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { email },
            relations: ['school'] // Besoin de l'école pour vérifier/créer l'assignment
        });

        if (!user) throw new Error('Enseignant introuvable');
        if (user.role !== UserRole.ENSEIGNANT) throw new Error('Utilisateur n\'est pas un enseignant');
        if (!user.school) throw new Error('Enseignant non associé à une école');

        const EnseignementRepository = AppDataSource.getRepository('EnseignementAssignment' as any);
        const MatiereRepository = AppDataSource.getRepository('Matiere' as any);

        for (const matiereId of matiereIds) {
            const matiere = await MatiereRepository.findOne({
                where: { id: matiereId },
                relations: ['classe']
            });

            if (!matiere) {
                console.warn(`Matière ${matiereId} introuvable, ignorée`);
                continue;
            }

            // Vérifier si l'assignation existe déjà
            const existingAssignment = await EnseignementRepository.findOne({
                where: {
                    enseignant: { id: user.id },
                    matiere: { id: matiereId },
                    isActive: true
                }
            });

            if (!existingAssignment) {
                // Créer l'assignation
                const assignment = EnseignementRepository.create({
                    enseignant: user,
                    ecole: user.school,
                    classe: matiere.classe,
                    matiere: matiere,
                    isActive: true
                });
                const savedAssignment = await EnseignementRepository.save(assignment);

                // Synchroniser les permissions (Groupes Matière, Classe, École)
                await this.groupePartageService.syncAfterEnseignementAssignment(savedAssignment.id);
            }
        }
    }

    /**
     * Accorder la permission de voir tous les groupes
     */
    async grantViewAllGroupsPermission(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error('Utilisateur non trouv�');

        user.canViewAllGroups = true;
        return await this.userRepository.save(user);
    }

    /**
     * R�voquer la permission de voir tous les groupes
     */
    async revokeViewAllGroupsPermission(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error('Utilisateur non trouv�');

        user.canViewAllGroups = false;
        return await this.userRepository.save(user);
    }
}
