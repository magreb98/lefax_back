import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entity/user";
import { Class } from "../entity/classe";
import { Ecole } from "../entity/ecole";
import { GroupePartage } from "../entity/groupe.partage";
import { GroupePartageService } from "./GroupePartageService";
import bcrypt from 'bcryptjs';

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
        // Vérifier si l'email existe déjà
        const existingUser = await this.userRepository.findOne({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new Error('Cet email est déjà enregistré');
        }

        // Récupérer ou créer le groupe public
        let publicGroup = await this.groupePartageRepository.findOne({
            where: { name: 'Public' }
        });

        if (!publicGroup) {
            publicGroup = await this.groupePartageService.createCustomGroupe(
                'Public',
                'Groupe de partage pour tous les utilisateurs'
            );
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Créer l'utilisateur
        const user = this.userRepository.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashedPassword,
            phoneNumber: data.phoneNumber,
            role: data.role || UserRole.USER,
            groupesPartage: [publicGroup]
        });

        // Associer l'école si fournie
        if (data.schoolId) {
            const school = await this.ecoleRepository.findOne({
                where: { id: data.schoolId }
            });
            if (school) {
                user.school = school;
            }
        }

        // Associer la classe si fournie
        if (data.classeId) {
            const classe = await this.classRepository.findOne({
                where: { id: data.classeId }
            });
            if (classe) {
                user.classe = classe;
                // Si associé à une classe, le rôle devient ETUDIANT
                if (user.role !== UserRole.ENSEIGNANT) {
                    user.role = UserRole.ETUDIANT;
                }
            }
        }

        await this.userRepository.save(user);

        // Synchroniser les groupes de partage si l'utilisateur est dans une classe
        if (data.classeId) {
            await this.groupePartageService.syncClasseGroupePartage(data.classeId);
        }

        return user;
    }

    /**
     * Ajouter un utilisateur à une classe
     * Son rôle devient automatiquement ETUDIANT
     */
    async addUserToClasse(userId: string, classeId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['classe', 'school', 'groupesPartage']
        });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['groupePartage', 'filiere', 'filiere.school']
        });

        if (!classe) {
            throw new Error('Classe non trouvée');
        }

        // Associer la classe à l'utilisateur
        user.classe = classe;

        // Changer le rôle en ETUDIANT (sauf si c'est un enseignant)
        if (user.role !== UserRole.ENSEIGNANT && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
            user.role = UserRole.ETUDIANT;
        }

        // Associer l'école de la classe si l'utilisateur n'a pas d'école
        if (!user.school && classe.filiere?.school) {
            user.school = classe.filiere.school;
        }

        await this.userRepository.save(user);

        // Synchroniser le groupe de partage de la classe
        await this.groupePartageService.syncClasseGroupePartage(classeId);

        return user;
    }

    /**
     * Ajouter plusieurs utilisateurs à une classe
     */
    async addUsersToClasse(userIds: string[], classeId: string): Promise<User[]> {
        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['groupePartage', 'filiere', 'filiere.school']
        });

        if (!classe) {
            throw new Error('Classe non trouvée');
        }

        const users = await this.userRepository.findByIds(userIds);

        if (users.length !== userIds.length) {
            throw new Error('Un ou plusieurs utilisateurs non trouvés');
        }

        const updatedUsers: User[] = [];

        for (const user of users) {
            user.classe = classe;

            // Changer le rôle en ETUDIANT
            if (user.role !== UserRole.ENSEIGNANT && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
                user.role = UserRole.ETUDIANT;
            }

            // Associer l'école si nécessaire
            if (!user.school && classe.filiere?.school) {
                user.school = classe.filiere.school;
            }

            await this.userRepository.save(user);
            updatedUsers.push(user);
        }

        // Synchroniser le groupe de partage de la classe
        await this.groupePartageService.syncClasseGroupePartage(classeId);

        return updatedUsers;
    }

    /**
     * Retirer un utilisateur d'une classe
     */
    async removeUserFromClasse(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['classe']
        });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const classeId = user.classe?.id;

        // Retirer la classe
        user.classe = undefined;

        // Changer le rôle en USER si c'était un étudiant
        if (user.role === UserRole.ETUDIANT) {
            user.role = UserRole.USER;
        }

        await this.userRepository.save(user);

        // Synchroniser le groupe de partage de la classe
        if (classeId) {
            await this.groupePartageService.syncClasseGroupePartage(classeId);
        }

        return user;
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
            .leftJoinAndSelect('user.classe', 'classe')
            .leftJoinAndSelect('user.groupesPartage', 'groupesPartage');

        if (filters?.role) {
            query.andWhere('user.role = :role', { role: filters.role });
        }

        if (filters?.schoolId) {
            query.andWhere('school.id = :schoolId', { schoolId: filters.schoolId });
        }

        if (filters?.classeId) {
            query.andWhere('classe.id = :classeId', { classeId: filters.classeId });
        }

        if (filters?.isActive !== undefined) {
            query.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
        }

        return await query.getMany();
    }

    /**
     * Récupérer un utilisateur par ID
     */
    async getUserById(id: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { id },
            relations: ['school', 'classe', 'groupesPartage', 'enseignements', 'enseignements.ecole', 'enseignements.classe', 'enseignements.matiere']
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

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Mettre à jour les champs
        if (data.firstName) user.firstName = data.firstName;
        if (data.lastName) user.lastName = data.lastName;
        if (data.email) user.email = data.email;
        if (data.phoneNumber) user.phoneNumber = data.phoneNumber;
        if (data.role) user.role = data.role;
        if (data.isActive !== undefined) user.isActive = data.isActive;
        if (data.isSuspended !== undefined) user.isSuspended = data.isSuspended;

        // Hasher le nouveau mot de passe si fourni
        if (data.password) {
            user.password = await bcrypt.hash(data.password, 10);
        }

        await this.userRepository.save(user);
        return user;
    }

    /**
     * Supprimer un utilisateur
     */
    async deleteUser(id: string): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['classe']
        });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const classeId = user.classe?.id;

        await this.userRepository.remove(user);

        // Synchroniser le groupe de partage de la classe si nécessaire
        if (classeId) {
            await this.groupePartageService.syncClasseGroupePartage(classeId);
        }
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

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        user.isActive = !user.isActive;
        await this.userRepository.save(user);

        return user;
    }

    /**
     * Suspendre/Réactiver un utilisateur
     */
    async toggleUserSuspension(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        user.isSuspended = !user.isSuspended;
        await this.userRepository.save(user);

        return user;
    }

    /**
     * Nommer un étudiant délégué ou le destituer
     */
    async toggleUserDelegate(id: string):Promise<User>{
         const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }
       if(!user.classe){
        throw new Error('L\'utilisateur doit appartenir à une salle de classe')
       }
        user.isDelegate = !user.isDelegate;
        await this.userRepository.save(user);

        return user;
    }

    /**
     * Changer l'école d'un utilisateur
     */
    async changeUserSchool(userId: string, schoolId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['school']
        });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const school = await this.ecoleRepository.findOne({
            where: { id: schoolId }
        });

        if (!school) {
            throw new Error('École non trouvée');
        }

        user.school = school;
        await this.userRepository.save(user);

        return user;
    }

    /**
     * Vérifier si un utilisateur peut accéder à une ressource
     */
    async canAccessResource(userId: string, resourceGroupeIds: string[]): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['groupesPartage', 'classe', 'classe.groupePartage', 'school', 'school.groupePartage']
        });

        if (!user) {
            return false;
        }

        // Récupérer tous les IDs des groupes de l'utilisateur
        const userGroupeIds: string[] = [];

        if (user.groupesPartage) {
            user.groupesPartage.forEach(g => userGroupeIds.push(g.id));
        }

        if (user.classe?.groupePartage) {
            userGroupeIds.push(user.classe.groupePartage.id);
        }

        if (user.school?.groupePartage) {
            userGroupeIds.push(user.school.groupePartage.id);
        }

        // Vérifier si l'utilisateur a accès à au moins un des groupes de la ressource
        return resourceGroupeIds.some(id => userGroupeIds.includes(id));
    }


    /**
     * Definir un utilisateur en tant qu'Admin d'une école
     */

    async setAdminSchool(idUser: string, idSchool: string):Promise<void>{
        try {
            const user = await this.userRepository.findOne({where:{id: idUser}});

            if(!user){
                throw new Error('Utilisateur non trouvé');
            }

            const schooll = await this.ecoleRepository.findOne({where:{id: idSchool}});

            if(!schooll){
                throw new Error("Ecolr non ")
            }
        } catch (error) {
            
        }
    }
}