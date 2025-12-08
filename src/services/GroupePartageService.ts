import { AppDataSource } from "../config/database";
import { Ecole } from "../entity/ecole";
import { Filiere } from "../entity/filiere";
import { Class } from "../entity/classe";
import { User, UserRole } from "../entity/user";
import { EnseignementAssignment } from "../entity/enseignement.assigment";
import { GroupePartage, GroupePartageType } from "../entity/groupe.partage";
import { Document } from "../entity/document";
import { DocumentCategorie } from "../entity/document.categorie";


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

    async getAllGroupePartage(): Promise<GroupePartage[]> {
        return this.groupePartageRepository.find({
            relations: ['users', 'documents', 'owner']
        });
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
                'classe',
                'matiere'
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
            relations: ['ecole', 'classe', 'enseignant']
        });

        if (!enseignement) {
            throw new Error('Enseignement introuvable');
        }

        // Synchroniser le groupe de l'école
        await this.syncEcoleGroupePartage(enseignement.ecole.id);

        // Synchroniser le groupe de la classe
        await this.syncClasseGroupePartage(enseignement.classe.id);
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
        // Créer le groupe de partage
        const groupePartage = this.groupePartageRepository.create({
            groupeName: `Groupe ${ecoleData.schoolName}`,
            description: `Groupe de partage de l'école ${ecoleData.schoolName}`,
            type: GroupePartageType.SCHOOL,
            users: []
        });
        await this.groupePartageRepository.save(groupePartage);

        // Créer l'école avec le groupe de partage
        const ecole = this.ecoleRepository.create({
            ...ecoleData,
            groupePartage
        });
        await this.ecoleRepository.save(ecole);

        return ecole;
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
    async addPublisher(groupeId: string, userId: string): Promise<void> {
        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId },
            relations: ['allowedPublishers']
        });

        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!groupe || !user) {
            throw new Error('Groupe ou utilisateur introuvable');
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
            relations: ['users']
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
}
