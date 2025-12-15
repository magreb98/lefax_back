import { AppDataSource } from "../config/database";
import { Ecole } from "../entity/ecole";
import { Filiere } from "../entity/filiere";
import { Class } from "../entity/classe";
import { User, UserRole } from "../entity/user";
import { EnseignementAssignment } from "../entity/enseignement.assigment";
import { GroupePartage, GroupePartageType } from "../entity/groupe.partage";
import { Document } from "../entity/document";
import { DocumentCategorie } from "../entity/document.categorie";
import { Brackets, SelectQueryBuilder } from 'typeorm';


export class GroupePartageService {
    private groupePartageRepository = AppDataSource.getRepository(GroupePartage);
    private ecoleRepository = AppDataSource.getRepository(Ecole);
    private filiereRepository = AppDataSource.getRepository(Filiere);
    private classRepository = AppDataSource.getRepository(Class);
    private userRepository = AppDataSource.getRepository(User);
    private enseignementRepository = AppDataSource.getRepository(EnseignementAssignment);
    private documentRepository = AppDataSource.getRepository(Document);
    private documentCategorieRepository = AppDataSource.getRepository(DocumentCategorie);


    /**
     * Récupérer un groupe de partage par son ID
     */
    // async getGroupePartage(id: string): Promise<GroupePartage> {
    //     return this.groupePartageRepository.findOne({ where: { id } });
    // }

    async getAllGroupePartage(user?: any, ownedOnly?: boolean): Promise<GroupePartage[]> {
        console.log('Using Refactored implementation of getAllGroupePartage');

        // Récupère le groupe public (nom 'public')
        const publicGroup = await this.groupePartageRepository.findOne({
            where: { groupeName: 'public' },
            relations: ['users', 'documents', 'owner', 'ecole', 'filiere', 'classe']
        });

        // Sécurité : si pas d'utilisateur, retourne seulement le groupe public
        if (!user || !user.id) {
            return publicGroup ? [publicGroup] : [];
        }

        const userId = user.id;

        // 1. Base Query avec toutes les relations nécessaires pour l'affichage
        const qb = this.groupePartageRepository.createQueryBuilder('groupe')
            .leftJoinAndSelect('groupe.users', 'users')
            .leftJoinAndSelect('groupe.documents', 'documents')
            .leftJoinAndSelect('groupe.owner', 'owner')
            .leftJoinAndSelect('groupe.ecole', 'ecole')
            .leftJoinAndSelect('groupe.filiere', 'filiere')
            .leftJoinAndSelect('filiere.school', 'filiereSchool')
            .leftJoinAndSelect('groupe.classe', 'classe')
            .leftJoinAndSelect('classe.filiere', 'classeFiliere')
            .leftJoinAndSelect('classeFiliere.school', 'classeFiliereSchool')
            .leftJoinAndSelect('groupe.matiere', 'matiere')
            .leftJoinAndSelect('matiere.classe', 'matiereClasse')
            .leftJoinAndSelect('matiereClasse.filiere', 'matiereFiliere')
            .leftJoinAndSelect('matiereFiliere.school', 'matiereSchool')
            // Important: We need to filter distinct because of the joins
            .orderBy('groupe.createdAt', 'DESC');

        // 2. CAS : ownedOnly = true (Mes groupes)
        if (ownedOnly) {
            qb.where('owner.id = :userId', { userId });
            const ownedGroups = await qb.getMany();
            if (publicGroup && !ownedGroups.some(g => g.id === publicGroup.id)) {
                ownedGroups.unshift(publicGroup);
            }
            return ownedGroups;
        }

        // 3. CAS : SUPERADMIN -> Voit tout
        if (user.role === UserRole.SUPERADMIN || user.role === 'superadmin') {
            const allGroups = await qb.getMany();
            if (publicGroup && !allGroups.some(g => g.id === publicGroup.id)) {
                allGroups.unshift(publicGroup);
            }
            return allGroups;
        }

        // 4. CAS GÉNÉRAL (Admin, Enseignant, Etudiant)
        // On construit une liste de conditions OR
        // Tout utilisateur voit :
        // - Les groupes dont il est propriétaire
        // - Les groupes dont il est membre

        qb.where(new Brackets((subQb) => {
            // Condition 1: Propriétaire
            subQb.where('owner.id = :userId', { userId })
                // Condition 2: Membre
                .orWhere('users.id = :userId', { userId });

            // SI ADMIN : voit aussi les groupes de ses écoles
            if (user.role === UserRole.ADMIN || user.role === 'admin') {
                let schoolIds: string[] = [];

                if (user.ecoles && user.ecoles.length > 0) {
                    schoolIds.push(...user.ecoles.map((e: any) => e.id));
                }
                if (user.school && user.school.id) {
                    schoolIds.push(user.school.id);
                }
                schoolIds = [...new Set(schoolIds)];

                if (schoolIds.length > 0) {
                    subQb.orWhere('ecole.id IN (:...schoolIds)', { schoolIds })
                        .orWhere('filiereSchool.id IN (:...schoolIds)', { schoolIds })
                        .orWhere('classeFiliereSchool.id IN (:...schoolIds)', { schoolIds })
                        .orWhere('matiereSchool.id IN (:...schoolIds)', { schoolIds });
                }
            }

            // 5. CAS ÉTUDIANT : voit aussi les groupes de sa classe, filière, école
            if (user.role === UserRole.ETUDIANT || user.role === 'etudiant') {
                if (user.classe) {
                    subQb.orWhere('groupe.classe.id = :classeId', { classeId: user.classe.id });

                    if (user.classe.filiere) {
                        subQb.orWhere('groupe.filiere.id = :filiereId', { filiereId: user.classe.filiere.id });
                    }
                }

                if (user.school) {
                    subQb.orWhere('groupe.ecole.id = :schoolId', { schoolId: user.school.id });
                }
            }
        }));

        const resultGroups = await qb.getMany();

        // Toujours ajouter le groupe public s'il n'est pas déjà présent
        if (publicGroup && !resultGroups.some(g => g.id === publicGroup.id)) {
            resultGroups.unshift(publicGroup);
        }

        return resultGroups;
    }

    /**
     * Récupérer un groupe de partage par son ID avec tous ses détails
     */
    async getGroupeById(id: string): Promise<GroupePartage> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id },
            relations: [
                'users',
                'users.classe',
                'users.school',
                'owner',
                'documents',
                'documents.categorie',
                'documents.addedBy',
                'allowedPublishers',
                'ecole',
                'filiere',
                'filiere.school',
                'classe',
                'classe.filiere',
                'classe.filiere.school',
                'matiere',
                'matiere.classe',
                'matiere.classe.filiere',
                'matiere.classe.filiere.school',
                'owner.school'
            ]
        });

        if (!groupe) {
            throw new Error('Groupe de partage non trouvé');
        }

        return groupe;
    }

    /**
     * Synchroniser les utilisateurs d'une classe avec son groupe de partage
     * Inclut les étudiants ET les enseignants affectés à cette classe
     */
    async syncClasseGroupePartage(classeId: string): Promise<void> {
        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['groupePartage', 'groupePartage.users', 'etudiants']
        });

        if (!classe || !classe.groupePartage) {
            throw new Error('Classe ou groupe de partage introuvable');
        }

        // Récupérer tous les étudiants de la classe
        const etudiants = await this.userRepository.find({
            where: {
                classe: { id: classeId },
                role: UserRole.ETUDIANT
            }
        });

        // Récupérer tous les enseignants affectés à cette classe
        const enseignements = await this.enseignementRepository.find({
            where: {
                classe: { id: classeId },
                isActive: true
            },
            relations: ['enseignant']
        });

        const enseignants = enseignements.map(e => e.enseignant);

        // Combiner étudiants et enseignants (sans doublons)
        const allUsers = [...etudiants];
        enseignants.forEach(enseignant => {
            if (!allUsers.some(u => u.id === enseignant.id)) {
                allUsers.push(enseignant);
            }
        });

        // Mettre à jour le groupe de partage
        classe.groupePartage.users = allUsers;

        // Mise à jour des allowedPublishers pour la classe (Enseignants)
        if (!classe.groupePartage.allowedPublishers) {
            classe.groupePartage.allowedPublishers = [];
        }
        const currentPublishers = classe.groupePartage.allowedPublishers || [];
        enseignants.forEach(enseignant => {
            if (!currentPublishers.some((p: User) => p.id === enseignant.id)) {
                currentPublishers.push(enseignant);
            }
        });
        classe.groupePartage.allowedPublishers = currentPublishers;

        await this.groupePartageRepository.save(classe.groupePartage);
    }

    /**
     * Synchroniser les utilisateurs d'une filière avec son groupe de partage
     * Inclut tous les utilisateurs (étudiants + enseignants) de toutes les classes de la filière
     */
    async syncFiliereGroupePartage(filiereId: string): Promise<void> {
        const filiere = await this.filiereRepository.findOne({
            where: { id: filiereId },
            relations: ['groupePartage', 'groupePartage.users', 'classes']
        });

        if (!filiere || !filiere.groupePartage) {
            throw new Error('Filière ou groupe de partage introuvable');
        }

        // Récupérer tous les étudiants de toutes les classes de la filière
        const etudiants = await this.userRepository
            .createQueryBuilder('user')
            .innerJoin('user.classe', 'classe')
            .innerJoin('classe.filiere', 'filiere')
            .where('filiere.id = :filiereId', { filiereId })
            .andWhere('user.role = :role', { role: UserRole.ETUDIANT })
            .getMany();

        // Récupérer tous les enseignants affectés aux classes de cette filière
        const enseignements = await this.enseignementRepository
            .createQueryBuilder('enseignement')
            .innerJoin('enseignement.classe', 'classe')
            .innerJoin('classe.filiere', 'filiere')
            .innerJoinAndSelect('enseignement.enseignant', 'enseignant')
            .where('filiere.id = :filiereId', { filiereId })
            .andWhere('enseignement.isActive = :isActive', { isActive: true })
            .getMany();

        const enseignants = enseignements.map(e => e.enseignant);

        // Combiner étudiants et enseignants (sans doublons)
        const allUsers = [...etudiants];
        enseignants.forEach(enseignant => {
            if (!allUsers.some(u => u.id === enseignant.id)) {
                allUsers.push(enseignant);
            }
        });

        // Mettre à jour le groupe de partage
        filiere.groupePartage.users = allUsers;
        await this.groupePartageRepository.save(filiere.groupePartage);

        // Synchroniser aussi toutes les classes de la filière
        for (const classe of filiere.classes) {
            await this.syncClasseGroupePartage(classe.id);
        }
    }

    /**
     * Synchroniser les utilisateurs d'une école avec son groupe de partage
     * Inclut tous les utilisateurs (étudiants + enseignants) de l'école
     */
    async syncEcoleGroupePartage(ecoleId: string): Promise<void> {
        const ecole = await this.ecoleRepository.findOne({
            where: { id: ecoleId },
            relations: ['groupePartage', 'groupePartage.users', 'filieres', 'filieres.classes']
        });

        if (!ecole || !ecole.groupePartage) {
            throw new Error('École ou groupe de partage introuvable');
        }

        // Récupérer tous les étudiants de l'école
        const etudiants = await this.userRepository.find({
            where: {
                school: { id: ecoleId },
                role: UserRole.ETUDIANT
            }
        });

        // Récupérer tous les enseignants affectés à cette école
        const enseignements = await this.enseignementRepository.find({
            where: {
                ecole: { id: ecoleId },
                isActive: true
            },
            relations: ['enseignant']
        });

        const enseignants = enseignements.map(e => e.enseignant);

        // Combiner étudiants et enseignants (sans doublons)
        const allUsers = [...etudiants];
        enseignants.forEach(enseignant => {
            if (!allUsers.some(u => u.id === enseignant.id)) {
                allUsers.push(enseignant);
            }
        });

        // Mettre à jour le groupe de partage
        ecole.groupePartage.users = allUsers;
        await this.groupePartageRepository.save(ecole.groupePartage);

        // Synchroniser aussi toutes les filières et classes de l'école
        for (const filiere of ecole.filieres) {
            await this.syncFiliereGroupePartage(filiere.id);
        }
    }

    /**
     * Synchroniser les groupes de partage après l'affectation d'un enseignant
     */
    async syncAfterEnseignementAssignment(enseignementId: string): Promise<void> {
        const enseignement = await this.enseignementRepository.findOne({
            where: { id: enseignementId },
            relations: ['ecole', 'classe', 'enseignant', 'matiere']
        });

        if (!enseignement) {
            throw new Error('Enseignement introuvable');
        }

        // Synchroniser le groupe de l'école
        await this.syncEcoleGroupePartage(enseignement.ecole.id);

        // Synchroniser le groupe de la classe
        await this.syncClasseGroupePartage(enseignement.classe.id);

        // Synchroniser le groupe de la matière (Nouveau)
        if (enseignement.matiere) {
            await this.syncMatiereGroupePartage(enseignement.matiere.id);
        }
    }

    /**
     * Synchroniser les groupes après la suppression d'un enseignement
     */
    async syncAfterEnseignementRemoval(ecoleId: string, classeId: string): Promise<void> {
        // Synchroniser le groupe de l'école
        await this.syncEcoleGroupePartage(ecoleId);

        // Synchroniser le groupe de la classe
        await this.syncClasseGroupePartage(classeId);
    }

    /**
     * Créer une école avec son groupe de partage
     */
    async createEcoleWithGroupe(ecoleData: Partial<Ecole>): Promise<Ecole> {
        console.log('START createEcoleWithGroupe', ecoleData);
        // Créer le groupe de partage
        try {
            const groupePartage = this.groupePartageRepository.create({
                groupeName: `Groupe ${ecoleData.schoolName}`,
                description: `Groupe de partage de l'école ${ecoleData.schoolName}`,
                type: GroupePartageType.SCHOOL,
                users: []
            });
            console.log('Saving group...');
            await this.groupePartageRepository.save(groupePartage);
            console.log('Group saved:', groupePartage.id);

            // Récupérer l'utilisateur admin si fourni (ID ou objet)
            let schoolAdminUser: User | null = null;
            if (ecoleData.schoolAdmin) {
                console.log('Processing school admin...');
                // Si c'est un objet User avec ID
                if (typeof ecoleData.schoolAdmin === 'object' && 'id' in ecoleData.schoolAdmin) {
                    schoolAdminUser = await this.userRepository.findOne({ where: { id: (ecoleData.schoolAdmin as User).id } });
                }
                // Si c'est une string ID
                else if (typeof ecoleData.schoolAdmin === 'string') {
                    schoolAdminUser = await this.userRepository.findOne({ where: { id: ecoleData.schoolAdmin } });
                }
                console.log('School admin found:', schoolAdminUser?.id);
            }

            // Créer l'école avec le groupe de partage
            console.log('Creating school entity...');
            const ecole = this.ecoleRepository.create({
                ...ecoleData,
                schoolAdmin: schoolAdminUser || undefined, // Assurer que c'est l'objet User
                groupePartage
            });
            console.log('Saving school entity...');
            await this.ecoleRepository.save(ecole);
            console.log('School saved:', ecole.id);

            // IMPORTANT: Mettre à jour l'utilisateur pour l'associer à l'école
            // Cela permet aux contrôles de permission (user.school) de fonctionner immédiatement
            if (schoolAdminUser) {
                console.log('Updating admin user school...');
                schoolAdminUser.school = ecole;
                // On s'assure aussi qu'il a le droit de créer des écoles s'il est admin
                // (Optionnel mais cohérent)
                await this.userRepository.save(schoolAdminUser);

                // Mettre à jour l'objet ecole retourné avec le bon admin
                ecole.schoolAdmin = schoolAdminUser;
            }

            return ecole;
        } catch (e) {
            console.error('ERROR in createEcoleWithGroupe:', e);
            throw e;
        }
    }

    /**
     * Créer une filière avec son groupe de partage
     */
    async createFiliereWithGroupe(filiereData: Partial<Filiere>): Promise<Filiere> {
        // Créer le groupe de partage
        const groupePartage = this.groupePartageRepository.create({
            groupeName: `Groupe ${filiereData.name}`,
            description: `Groupe de partage de la filière ${filiereData.name}`,
            type: GroupePartageType.FILIERE,
            users: []
        });
        await this.groupePartageRepository.save(groupePartage);

        // Créer la filière avec le groupe de partage
        const filiere = this.filiereRepository.create({
            ...filiereData,
            groupePartage
        });
        await this.filiereRepository.save(filiere);

        return filiere;
    }

    /**
     * Créer une classe avec son groupe de partage
     */
    async createClasseWithGroupe(classeData: Partial<Class>): Promise<Class> {
        // Créer le groupe de partage
        const groupePartage = this.groupePartageRepository.create({
            groupeName: `Groupe ${classeData.className}`,
            description: `Groupe de partage de la classe ${classeData.className}`,
            type: GroupePartageType.CLASS,
            users: []
        });
        await this.groupePartageRepository.save(groupePartage);

        // Créer la classe avec le groupe de partage
        const classe = this.classRepository.create({
            ...classeData,
            groupePartage
        });
        await this.classRepository.save(classe);

        return classe;
    }

    /**
     * Ajouter un utilisateur à un groupe personnalisé
     */
    async addUserToCustomGroupe(userId: string, groupeId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        const user = await this.userRepository.findOne({
            where: { id: userId }
        });

        if (!groupe || !user) {
            throw new Error('Groupe ou utilisateur introuvable');
        }

        if (!groupe.users) {
            groupe.users = [];
        }

        // Vérifier si l'utilisateur n'est pas déjà dans le groupe
        if (!groupe.users.some(u => u.id === userId)) {
            groupe.users.push(user);
            await this.groupePartageRepository.save(groupe);
        }
    }

    /**
     * Créer un groupe de partage personnalisé
     */
    async createCustomGroupe(name: string, description: string, userIds: string[] = []): Promise<GroupePartage> {
        const users = await this.userRepository.findByIds(userIds);

        const groupe = this.groupePartageRepository.create({
            groupeName: name,
            description,
            type: GroupePartageType.CUSTOM,
            users
        });

        await this.groupePartageRepository.save(groupe);
        return groupe;
    }

    /**
     * Récupérer tous les groupes de partage d'un enseignant
     * (basé sur ses affectations d'enseignement)
     */
    async getEnseignantGroupes(enseignantId: string): Promise<GroupePartage[]> {
        const enseignements = await this.enseignementRepository.find({
            where: {
                enseignant: { id: enseignantId },
                isActive: true
            },
            relations: ['ecole', 'ecole.groupePartage', 'classe', 'classe.groupePartage']
        });

        const groupes: GroupePartage[] = [];
        const groupeIds = new Set<string>();

        enseignements.forEach(enseignement => {
            // Ajouter le groupe de l'école
            if (enseignement.ecole.groupePartage && !groupeIds.has(enseignement.ecole.groupePartage.id)) {
                groupes.push(enseignement.ecole.groupePartage);
                groupeIds.add(enseignement.ecole.groupePartage.id);
            }

            // Ajouter le groupe de la classe
            if (enseignement.classe.groupePartage && !groupeIds.has(enseignement.classe.groupePartage.id)) {
                groupes.push(enseignement.classe.groupePartage);
                groupeIds.add(enseignement.classe.groupePartage.id);
            }
        });

        return groupes;
    }

    /**
     * Récupérer tous les enseignants d'un groupe de partage
     */
    async getEnseignantsInGroupe(groupeId: string): Promise<User[]> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        return groupe.users?.filter(u => u.role === UserRole.ENSEIGNANT) || [];
    }

    /**
     * Ajouter une école à un groupe de partage
     * Ajoute tous les utilisateurs (étudiants + enseignants) de l'école au groupe
     */
    async addEcoleToGroupe(ecoleId: string, groupeId: string): Promise<void> {
        const ecole = await this.ecoleRepository.findOne({
            where: { id: ecoleId },
            relations: ['students']
        });

        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!ecole || !groupe) {
            throw new Error('École ou groupe introuvable');
        }

        // Récupérer tous les étudiants de l'école
        const etudiants = await this.userRepository.find({
            where: {
                school: { id: ecoleId },
                role: UserRole.ETUDIANT
            }
        });

        // Récupérer tous les enseignants affectés à cette école
        const enseignements = await this.enseignementRepository.find({
            where: {
                ecole: { id: ecoleId },
                isActive: true
            },
            relations: ['enseignant']
        });

        const enseignants = enseignements.map(e => e.enseignant);

        // Combiner étudiants et enseignants
        const allUsers = [...etudiants, ...enseignants];

        if (!groupe.users) {
            groupe.users = [];
        }

        // Ajouter les utilisateurs au groupe (sans doublons)
        allUsers.forEach(user => {
            if (!groupe.users!.some(u => u.id === user.id)) {
                groupe.users!.push(user);
            }
        });

        await this.groupePartageRepository.save(groupe);
    }

    /**
     * Ajouter une filière à un groupe de partage
     * Ajoute tous les utilisateurs (étudiants + enseignants) de toutes les classes de la filière
     */
    async addFiliereToGroupe(filiereId: string, groupeId: string): Promise<void> {
        const filiere = await this.filiereRepository.findOne({
            where: { id: filiereId },
            relations: ['classes']
        });

        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!filiere || !groupe) {
            throw new Error('Filière ou groupe introuvable');
        }

        // Récupérer tous les étudiants de toutes les classes de la filière
        const etudiants = await this.userRepository
            .createQueryBuilder('user')
            .innerJoin('user.classe', 'classe')
            .innerJoin('classe.filiere', 'filiere')
            .where('filiere.id = :filiereId', { filiereId })
            .andWhere('user.role = :role', { role: UserRole.ETUDIANT })
            .getMany();

        // Récupérer tous les enseignants affectés aux classes de cette filière
        const enseignements = await this.enseignementRepository
            .createQueryBuilder('enseignement')
            .innerJoin('enseignement.classe', 'classe')
            .innerJoin('classe.filiere', 'filiere')
            .innerJoinAndSelect('enseignement.enseignant', 'enseignant')
            .where('filiere.id = :filiereId', { filiereId })
            .andWhere('enseignement.isActive = :isActive', { isActive: true })
            .getMany();

        const enseignants = enseignements.map(e => e.enseignant);

        // Combiner étudiants et enseignants
        const allUsers = [...etudiants, ...enseignants];

        if (!groupe.users) {
            groupe.users = [];
        }

        // Ajouter les utilisateurs au groupe (sans doublons)
        allUsers.forEach(user => {
            if (!groupe.users!.some(u => u.id === user.id)) {
                groupe.users!.push(user);
            }
        });

        await this.groupePartageRepository.save(groupe);
    }

    /**
     * Ajouter une classe à un groupe de partage
     * Ajoute tous les utilisateurs (étudiants + enseignants) de la classe
     */
    async addClasseToGroupe(classeId: string, groupeId: string): Promise<void> {
        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['etudiants']
        });

        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!classe || !groupe) {
            throw new Error('Classe ou groupe introuvable');
        }

        // Récupérer tous les étudiants de la classe
        const etudiants = await this.userRepository.find({
            where: {
                classe: { id: classeId },
                role: UserRole.ETUDIANT
            }
        });

        // Récupérer tous les enseignants affectés à cette classe
        const enseignements = await this.enseignementRepository.find({
            where: {
                classe: { id: classeId },
                isActive: true
            },
            relations: ['enseignant']
        });

        const enseignants = enseignements.map(e => e.enseignant);

        // Combiner étudiants et enseignants
        const allUsers = [...etudiants, ...enseignants];

        if (!groupe.users) {
            groupe.users = [];
        }

        // Ajouter les utilisateurs au groupe (sans doublons)
        allUsers.forEach(user => {
            if (!groupe.users!.some(u => u.id === user.id)) {
                groupe.users!.push(user);
            }
        });

        await this.groupePartageRepository.save(groupe);
    }

    /**
     * Ajouter plusieurs utilisateurs à un groupe de partage
     */
    async addUsersToGroupe(userIds: string[], groupeId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        const users = await this.userRepository.findByIds(userIds);

        if (!groupe.users) {
            groupe.users = [];
        }

        // Ajouter les utilisateurs au groupe (sans doublons)
        users.forEach(user => {
            if (!groupe.users!.some(u => u.id === user.id)) {
                groupe.users!.push(user);
            }
        });

        await this.groupePartageRepository.save(groupe);
    }

    /**
     * Retirer un utilisateur d'un groupe de partage
     */
    async removeUserFromGroupe(userId: string, groupeId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        if (groupe.users) {
            groupe.users = groupe.users.filter(u => u.id !== userId);
            await this.groupePartageRepository.save(groupe);
        }
    }

    /**
     * Retirer plusieurs utilisateurs d'un groupe de partage
     */
    async removeUsersFromGroupe(userIds: string[], groupeId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        if (groupe.users) {
            groupe.users = groupe.users.filter(u => !userIds.includes(u.id));
            await this.groupePartageRepository.save(groupe);
        }
    }

    /**
     * Retirer une école d'un groupe de partage
     * Retire tous les utilisateurs de l'école du groupe
     */
    async removeEcoleFromGroupe(ecoleId: string, groupeId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        // Récupérer tous les utilisateurs de l'école
        const etudiants = await this.userRepository.find({
            where: {
                school: { id: ecoleId }
            }
        });

        const enseignements = await this.enseignementRepository.find({
            where: {
                ecole: { id: ecoleId },
                isActive: true
            },
            relations: ['enseignant']
        });

        const enseignants = enseignements.map(e => e.enseignant);
        const allUsers = [...etudiants, ...enseignants];
        const userIdsToRemove = allUsers.map(u => u.id);

        if (groupe.users) {
            groupe.users = groupe.users.filter(u => !userIdsToRemove.includes(u.id));
            await this.groupePartageRepository.save(groupe);
        }
    }

    /**
     * Retirer une filière d'un groupe de partage
     * Retire tous les utilisateurs de la filière du groupe
     */
    async removeFiliereFromGroupe(filiereId: string, groupeId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        // Récupérer tous les utilisateurs de la filière
        const etudiants = await this.userRepository
            .createQueryBuilder('user')
            .innerJoin('user.classe', 'classe')
            .innerJoin('classe.filiere', 'filiere')
            .where('filiere.id = :filiereId', { filiereId })
            .getMany();

        const enseignements = await this.enseignementRepository
            .createQueryBuilder('enseignement')
            .innerJoin('enseignement.classe', 'classe')
            .innerJoin('classe.filiere', 'filiere')
            .innerJoinAndSelect('enseignement.enseignant', 'enseignant')
            .where('filiere.id = :filiereId', { filiereId })
            .andWhere('enseignement.isActive = :isActive', { isActive: true })
            .getMany();

        const enseignants = enseignements.map(e => e.enseignant);
        const allUsers = [...etudiants, ...enseignants];
        const userIdsToRemove = allUsers.map(u => u.id);

        if (groupe.users) {
            groupe.users = groupe.users.filter(u => !userIdsToRemove.includes(u.id));
            await this.groupePartageRepository.save(groupe);
        }
    }

    /**
     * Retirer une classe d'un groupe de partage
     * Retire tous les utilisateurs de la classe du groupe
     */
    async removeClasseFromGroupe(classeId: string, groupeId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['users']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        // Récupérer tous les utilisateurs de la classe
        const etudiants = await this.userRepository.find({
            where: {
                classe: { id: classeId }
            }
        });

        const enseignements = await this.enseignementRepository.find({
            where: {
                classe: { id: classeId },
                isActive: true
            },
            relations: ['enseignant']
        });

        const enseignants = enseignements.map(e => e.enseignant);
        const allUsers = [...etudiants, ...enseignants];
        const userIdsToRemove = allUsers.map(u => u.id);

        if (groupe.users) {
            groupe.users = groupe.users.filter(u => !userIdsToRemove.includes(u.id));
            await this.groupePartageRepository.save(groupe);
        }
    }

    // ========== GESTION DES PUBLISHERS, INVITATIONS ET DOCUMENTS ==========

    /**
     * Ajouter un éditeur (publisher) au groupe
     */
    async addPublisher(groupeId: string, userId: string, requesterId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: [
                'allowedPublishers', 'owner',
                'ecole',
                'filiere', 'filiere.school',
                'classe', 'classe.filiere', 'classe.filiere.school',
                'matiere', 'matiere.classe', 'matiere.classe.filiere', 'matiere.classe.filiere.school'
            ]
        });

        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!groupe || !user) {
            throw new Error('Groupe ou utilisateur introuvable');
        }

        // Vérifier les permissions : Owner ou Admin de l'école
        let canParams = false;

        // 1. Owner
        if (groupe.owner && groupe.owner.id === requesterId) {
            canParams = true;
        }

        // 2. School Admin (Need to fetch requester full object)
        if (!canParams) {
            const requester = await this.userRepository.findOne({
                where: { id: requesterId },
                relations: ['school', 'ecoles']
            });

            if (requester) {
                // Check if requester is SUPERADMIN
                if (requester.role === UserRole.SUPERADMIN) {
                    canParams = true;
                }
                // Check if requester is ADMIN of the group's school
                else if (requester.role === UserRole.ADMIN) {
                    // Need to find group's school ID
                    let groupSchoolId: string | undefined;

                    // Direct school group
                    if (groupe.ecole) groupSchoolId = groupe.ecole.id;
                    // Filiere group
                    else if (groupe.filiere && groupe.filiere.school) groupSchoolId = groupe.filiere.school.id;
                    // Class group
                    else if (groupe.classe && groupe.classe.filiere && groupe.classe.filiere.school) groupSchoolId = groupe.classe.filiere.school.id;
                    // Matiere group
                    else if (groupe.matiere && groupe.matiere.classe && groupe.matiere.classe.filiere && groupe.matiere.classe.filiere.school) groupSchoolId = groupe.matiere.classe.filiere.school.id;

                    if (groupSchoolId) {
                        // Check if requester administers this school OR belongs to it as admin
                        const isSchoolAdmin = (requester.ecoles && requester.ecoles.some(e => e.id === groupSchoolId)) ||
                            (requester.school && requester.school.id === groupSchoolId);
                        if (isSchoolAdmin) canParams = true;
                    }
                }
            }
        }

        if (!canParams) {
            throw new Error('PERMISSION_DENIED: Vous n\'avez pas les droits pour modifier ce groupe');
        }

        if (!groupe.allowedPublishers) {
            groupe.allowedPublishers = [];
        }

        if (!groupe.allowedPublishers.some(u => u.id === userId)) {
            groupe.allowedPublishers.push(user);
            await this.groupePartageRepository.save(groupe);
        }
    }

    /**
     * Générer un lien d'invitation
     */
    async generateInvitation(groupeId: string, expiresInDays: number): Promise<{ token: string; expiresAt: Date }> {
        const groupe = await this.groupePartageRepository.findOne({ where: { id: groupeId } });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        groupe.invitationToken = token;
        groupe.invitationExpiresAt = expiresAt;

        await this.groupePartageRepository.save(groupe);

        return { token, expiresAt };
    }

    /**
     * Rejoindre un groupe via invitation
     */
    async joinByInvitation(token: string, userId: string): Promise<GroupePartage> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { invitationToken: token },
            relations: ['users', 'classe']
        });

        if (!groupe) {
            throw new Error('Invitation invalide');
        }

        if (!groupe.invitationExpiresAt || groupe.invitationExpiresAt < new Date()) {
            throw new Error('Invitation expirée');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('Utilisateur introuvable');
        }

        if (!groupe.users) {
            groupe.users = [];
        }

        if (!groupe.users.some(u => u.id === userId)) {
            groupe.users.push(user);
            await this.groupePartageRepository.save(groupe);
        }

        // Si le groupe est un groupe de CLASSE, on lance la synchronisation complète de la hiérarchie
        if (groupe.type === GroupePartageType.CLASS && groupe.classe) {
            await this.enrollUserInClassHierarchy(user.id, groupe.classe.id);
        }

        return groupe;
    }

    /**
     * Ajouter un document au groupe
     */
    async addDocument(groupeId: string, documentId: string, categoryId?: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['documents']
        });

        const document = await this.documentRepository.findOne({ where: { id: documentId } });

        if (!groupe || !document) {
            throw new Error('Groupe ou document introuvable');
        }

        if (categoryId) {
            const category = await this.documentCategorieRepository.findOne({ where: { id: categoryId } });
            if (category) {
                document.categorie = category;
                await this.documentRepository.save(document);
            }
        }

        if (!groupe.documents) {
            groupe.documents = [];
        }

        if (!groupe.documents.some(d => d.id === document.id)) {
            groupe.documents.push(document);
            await this.groupePartageRepository.save(groupe);
        }
    }

    /**
     * Retirer un document du groupe
     */
    async removeDocument(groupeId: string, documentId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['documents']
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        if (groupe.documents) {
            groupe.documents = groupe.documents.filter(d => d.id !== documentId);
            await this.groupePartageRepository.save(groupe);
        }
    }

    // ========== GESTION DES CATÉGORIES ==========

    /**
     * Récupérer toutes les catégories d'un groupe
     */
    async getGroupCategories(groupeId: string): Promise<DocumentCategorie[]> {
        // Récupérer les catégories spécifiques au groupe et les catégories globales
        const categories = await this.documentCategorieRepository.find({
            where: [
                { groupePartage: { id: groupeId } },
                { isGlobal: true }
            ],
            order: {
                categorieName: 'ASC'
            }
        });

        return categories;
    }

    /**
     * Créer une catégorie pour un groupe
     */
    async createGroupCategory(groupeId: string, categorieName: string, description?: string, userId?: string): Promise<DocumentCategorie> {
        // Vérifier que le groupe existe
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId }
        });

        if (!groupe) {
            throw new Error('Groupe introuvable');
        }

        // Créer la catégorie
        const category = this.documentCategorieRepository.create({
            categorieName,
            description,
            isGlobal: false,
            groupePartage: groupe
        });

        await this.documentCategorieRepository.save(category);
        return category;
    }

    /**
     * Mettre à jour une catégorie
     */
    async updateGroupCategory(groupeId: string, categoryId: string, categorieName: string, description?: string): Promise<DocumentCategorie> {
        // Récupérer la catégorie
        const category = await this.documentCategorieRepository.findOne({
            where: { id: categoryId },
            relations: ['groupePartage']
        });

        if (!category) {
            throw new Error('Catégorie introuvable');
        }

        // Vérifier que la catégorie appartient bien au groupe
        if (category.groupePartage?.id !== groupeId) {
            throw new Error('Cette catégorie n\'appartient pas à ce groupe');
        }

        // Vérifier que ce n'est pas une catégorie globale
        if (category.isGlobal) {
            throw new Error('Les catégories globales ne peuvent pas être modifiées au niveau du groupe');
        }

        // Mettre à jour le nom
        // Mettre à jour le nom et la description
        category.categorieName = categorieName;
        if (description !== undefined) {
            category.description = description;
        }
        await this.documentCategorieRepository.save(category);

        return category;
    }

    /**
     * Supprimer une catégorie
     */
    async deleteGroupCategory(groupeId: string, categoryId: string): Promise<void> {
        // Récupérer la catégorie
        const category = await this.documentCategorieRepository.findOne({
            where: { id: categoryId },
            relations: ['groupePartage', 'documents']
        });

        if (!category) {
            throw new Error('Catégorie introuvable');
        }

        // Vérifier que la catégorie appartient bien au groupe
        if (category.groupePartage?.id !== groupeId) {
            throw new Error('Cette catégorie n\'appartient pas à ce groupe');
        }

        // Vérifier que ce n'est pas une catégorie globale
        if (category.isGlobal) {
            throw new Error('Les catégories globales ne peuvent pas être supprimées au niveau du groupe');
        }

        // Vérifier qu'il n'y a pas de documents associés
        if (category.documents && category.documents.length > 0) {
            throw new Error('Impossible de supprimer une catégorie contenant des documents');
        }

        // Supprimer la catégorie
        await this.documentCategorieRepository.remove(category);
    }

    // ========== GESTION DES MATIERES ET AUTO-ENROLLMENT ==========

    /**
     * Créer une matière avec son groupe de partage
     * Auto-enroll tous les étudiants de la classe dans le groupe
     */
    async createMatiereWithGroupe(matiereData: any, classeId: string): Promise<any> {
        const MatiereRepository = AppDataSource.getRepository('Matiere' as any);

        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['etudiants', 'filiere', 'filiere.school']
        });

        if (!classe) {
            throw new Error('Classe non trouvée');
        }

        // Créer le groupe de partage pour la matière
        const groupePartage = this.groupePartageRepository.create({
            groupeName: `Matière ${matiereData.matiereName} - ${classe.className}`,
            description: `Groupe de partage pour la matière ${matiereData.matiereName}`,
            type: GroupePartageType.MATIERE,
            users: []
        });
        await this.groupePartageRepository.save(groupePartage);

        // Créer la matière avec le groupe de partage
        const matiere = MatiereRepository.create({
            ...matiereData,
            classe,
            groupePartage
        });
        const savedMatiere = await MatiereRepository.save(matiere) as any;

        // Mise à jour bi-directionnelle : associer la matière au groupe
        groupePartage.matiere = savedMatiere;
        await this.groupePartageRepository.save(groupePartage);

        // Synchroniser le groupe (étudiants + enseignants)
        await this.syncMatiereGroupePartage(savedMatiere.id);

        return savedMatiere;
    }

    /**
     * Synchroniser le groupe de partage d'une matière
     * Enroll tous les étudiants de la classe dans le groupe
     */
    /**
     * Synchroniser le groupe de partage d'une matière
     * Enroll tous les étudiants de la classe et les enseignants affectés
     * Donne les droits de publication aux enseignants
     */
    async syncMatiereGroupePartage(matiereId: string): Promise<void> {
        const MatiereRepository = AppDataSource.getRepository('Matiere' as any);

        const matiere = await MatiereRepository.findOne({
            where: { id: matiereId },
            relations: ['groupePartage', 'groupePartage.users', 'classe', 'classe.etudiants']
        });

        if (!matiere || !matiere.groupePartage) {
            throw new Error('Matière ou groupe de partage introuvable');
        }

        // 1. Récupérer tous les étudiants de la classe
        const etudiants = await this.userRepository.find({
            where: {
                classe: { id: matiere.classe.id },
                role: UserRole.ETUDIANT
            }
        });

        // 2. Récupérer tous les enseignants affectés à cette matière
        const enseignements = await this.enseignementRepository.find({
            where: {
                matiere: { id: matiereId },
                isActive: true
            },
            relations: ['enseignant']
        });
        const enseignants = enseignements.map(e => e.enseignant);

        // 3. Mettre à jour les membres du groupe (Etudiants + Enseignants)
        const allUsers = [...etudiants];
        enseignants.forEach(enseignant => {
            if (!allUsers.some(u => u.id === enseignant.id)) {
                allUsers.push(enseignant);
            }
        });
        matiere.groupePartage.users = allUsers;

        // 4. Mettre à jour les allowedPublishers (Enseignants uniquement)
        if (!matiere.groupePartage.allowedPublishers) {
            matiere.groupePartage.allowedPublishers = [];
        }
        // On remplace ou on ajoute ? Pour l'instant on réinitialise avec les enseignants actuels
        // (On peut vouloir garder des publishers ajoutés manuellement, mais ici c'est une synchro "système")
        // Pour être safe : on ajoute les enseignants s'ils n'y sont pas.
        const currentPublishers = matiere.groupePartage.allowedPublishers || [];
        enseignants.forEach(enseignant => {
            if (!currentPublishers.some((p: User) => p.id === enseignant.id)) {
                currentPublishers.push(enseignant);
            }
        });
        matiere.groupePartage.allowedPublishers = currentPublishers;

        await this.groupePartageRepository.save(matiere.groupePartage);
    }

    /**
     * Enroll tous les étudiants d'une classe dans le groupe d'une matière
     */
    async enrollStudentsInMatiereGroupe(matiereId: string, classeId: string): Promise<void> {
        const MatiereRepository = AppDataSource.getRepository('Matiere' as any);

        const matiere = await MatiereRepository.findOne({
            where: { id: matiereId },
            relations: ['groupePartage', 'groupePartage.users']
        });

        if (!matiere || !matiere.groupePartage) {
            throw new Error('Matière ou groupe de partage introuvable');
        }

        // Récupérer tous les étudiants de la classe
        const etudiants = await this.userRepository.find({
            where: {
                classe: { id: classeId },
                role: UserRole.ETUDIANT
            }
        });

        if (!matiere.groupePartage.users) {
            matiere.groupePartage.users = [];
        }

        // Ajouter les étudiants au groupe (sans doublons)
        etudiants.forEach(etudiant => {
            if (!matiere.groupePartage.users!.some((u: User) => u.id === etudiant.id)) {
                matiere.groupePartage.users!.push(etudiant);
            }
        });

        await this.groupePartageRepository.save(matiere.groupePartage);
    }

    /**
     * Enroll un étudiant dans tous les groupes de matières de sa classe
     * Appelé quand un étudiant est ajouté à une classe
     */
    async enrollStudentInClassMatiereGroupes(userId: string, classeId: string): Promise<void> {
        const MatiereRepository = AppDataSource.getRepository('Matiere' as any);

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('Utilisateur introuvable');
        }

        // Récupérer toutes les matières de la classe avec leurs groupes
        const matieres = await MatiereRepository.find({
            where: { classe: { id: classeId } },
            relations: ['groupePartage', 'groupePartage.users']
        });

        // Enroll l'étudiant dans chaque groupe de matière
        for (const matiere of matieres) {
            if (matiere.groupePartage) {
                if (!matiere.groupePartage.users) {
                    matiere.groupePartage.users = [];
                }


                // Ajouter l'utilisateur s'il n'est pas déjà dans le groupe
                if (!matiere.groupePartage.users.some((u: User) => u.id === userId)) {
                    matiere.groupePartage.users.push(user);
                    await this.groupePartageRepository.save(matiere.groupePartage);
                }
            }
        }

        // Synchroniser aussi le groupe de la classe
        await this.syncClasseGroupePartage(classeId);
    }

    /**
     * Retirer un étudiant de tous les groupes de matières de sa classe
     * Appelé quand un étudiant est retiré d'une classe
     */
    async removeStudentFromClassMatiereGroupes(userId: string, classeId: string): Promise<void> {
        const MatiereRepository = AppDataSource.getRepository('Matiere' as any);

        // Récupérer toutes les matières de la classe avec leurs groupes
        const matieres = await MatiereRepository.find({
            where: { classe: { id: classeId } },
            relations: ['groupePartage', 'groupePartage.users']
        });

        // Retirer l'étudiant de chaque groupe de matière
        for (const matiere of matieres) {
            if (matiere.groupePartage && matiere.groupePartage.users) {
                matiere.groupePartage.users = matiere.groupePartage.users.filter((u: User) => u.id !== userId);
                await this.groupePartageRepository.save(matiere.groupePartage);
            }
        }
    }

    /**
     * Enroll un utilisateur dans toute la hiérarchie de la classe
     * (Groupe Classe + Groupes Matières + Groupe Filière + Groupe École)
     */
    async enrollUserInClassHierarchy(userId: string, classeId: string): Promise<void> {
        console.log(`[SYNC] Starting enrollUserInClassHierarchy for user ${userId} in class ${classeId}`);
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            console.error(`[SYNC] User ${userId} not found`);
            throw new Error('Utilisateur non trouvé');
        }

        // Mettre à jour le rôle en ETUDIANT si ce n'est pas un admin/prof
        // On ne rétrograde pas un admin ou un prof qui rejoindrait une classe
        if (user.role !== UserRole.ADMIN &&
            user.role !== UserRole.SUPERADMIN &&
            user.role !== UserRole.ENSEIGNANT) {

            console.log(`[SYNC] Updating user ${userId} role to ETUDIANT (current: ${user.role})`);
            user.role = UserRole.ETUDIANT;
            await this.userRepository.save(user);
        }

        const classe = await this.classRepository.findOne({
            where: { id: classeId },
            relations: ['groupePartage', 'filiere', 'filiere.groupePartage', 'filiere.school', 'filiere.school.groupePartage']
        });
        if (!classe) {
            console.error(`[SYNC] Class ${classeId} not found`);
            throw new Error('Classe non trouvée');
        }

        console.log(`[SYNC] Class found: ${classe.className}, Filiere: ${classe.filiere?.name}, School: ${classe.filiere?.school?.schoolName}`);

        // 1. Groupe de la CLASSE
        if (classe.groupePartage) {
            console.log(`[SYNC] Adding to Class Group: ${classe.groupePartage.id}`);
            await this.addUserToCustomGroupe(userId, classe.groupePartage.id);
        } else {
            console.warn(`[SYNC] Class ${classeId} has no GroupePartage`);
        }

        // 2. Groupes des MATIÈRES
        const MatiereRepository = AppDataSource.getRepository('Matiere' as any);
        const matieres = await MatiereRepository.find({
            where: { classe: { id: classeId } },
            relations: ['groupePartage']
        });
        console.log(`[SYNC] Found ${matieres.length} matieres for class ${classeId}`);

        for (const matiere of matieres) {
            if (matiere.groupePartage) {
                console.log(`[SYNC] Adding to Matiere Group: ${matiere.groupePartage.id} (Matiere: ${matiere.matiereName})`);
                await this.addUserToCustomGroupe(userId, matiere.groupePartage.id);
            }
        }

        // 3. Groupe de la FILIÈRE
        if (classe.filiere && classe.filiere.groupePartage) {
            console.log(`[SYNC] Adding to Filiere Group: ${classe.filiere.groupePartage.id}`);
            await this.addUserToCustomGroupe(userId, classe.filiere.groupePartage.id);
        } else {
            console.warn(`[SYNC] Filiere group missing or filiere not linked`);
        }

        // 4. Groupe de l'ÉCOLE
        if (classe.filiere && classe.filiere.school && classe.filiere.school.groupePartage) {
            console.log(`[SYNC] Adding to School Group: ${classe.filiere.school.groupePartage.id}`);
            await this.addUserToCustomGroupe(userId, classe.filiere.school.groupePartage.id);
        } else {
            console.warn(`[SYNC] School group missing or school not linked via filiere`);
        }
    }
}

