import { AppDataSource } from '../config/database';
import { Matiere } from '../entity/matiere';
import { Class } from '../entity/classe';
import { GroupePartage, GroupePartageType } from '../entity/groupe.partage';
import { User, UserRole } from '../entity/user';
import { GroupePartageService } from './GroupePartageService';
import { EnseignementAssignment } from '../entity/enseignement.assigment';

export class MatiereService {
    private matiereRepository = AppDataSource.getRepository(Matiere);
    private classRepository = AppDataSource.getRepository(Class);
    private groupePartageService = new GroupePartageService();

    /**
     * Créer une nouvelle matière avec auto-création du sous-groupe
     */
    async createMatiere(data: {
        matiereName: string;
        description?: string;
        matiereCode?: string;
        classeId: string;
        createSubGroup?: boolean;
    }): Promise<Matiere> {
        const classe = await this.classRepository.findOne({
            where: { id: data.classeId },
            relations: ['matieres']
        });

        if (!classe) {
            throw new Error('Classe non trouvée');
        }

        // Vérifier que la matière n'existe pas déjà dans cette classe
        const existingMatiere = classe.matieres?.find(
            m => m.matiereName.toLowerCase() === data.matiereName.toLowerCase()
        );

        if (existingMatiere) {
            throw new Error(`Une matière nommée "${data.matiereName}" existe déjà dans cette classe`);
        }

        // Créer la matière avec son groupe de partage (utilisant la logique centralisée)
        const matiereData = {
            matiereName: data.matiereName,
            description: data.description,
            matiereCode: data.matiereCode,
            classe
        };

        if (data.createSubGroup !== false) {
            return await this.groupePartageService.createMatiereWithGroupe(matiereData, data.classeId);
        } else {
            const matiere = this.matiereRepository.create(matiereData);
            return await this.matiereRepository.save(matiere);
        }
    }

    /**
     * Récupérer toutes les matières d'une classe
     */
    async getMatieresByClasse(classeId: string): Promise<Matiere[]> {
        return await this.matiereRepository.find({
            where: { classe: { id: classeId } },
            relations: ['classe', 'groupePartage', 'enseignementAssignments', 'enseignementAssignments.enseignant'],
            order: { matiereName: 'ASC' }
        });
    }

    /**
     * Récupérer une matière par ID
     */
    async getMatiereById(id: string): Promise<Matiere | null> {
        return await this.matiereRepository.findOne({
            where: { id },
            relations: ['classe', 'groupePartage', 'documents', 'enseignementAssignments', 'enseignementAssignments.enseignant']
        });
    }

    /**
     * Mettre à jour une matière
     */
    async updateMatiere(
        id: string,
        data: {
            matiereName?: string;
            description?: string;
            matiereCode?: string;
        }
    ): Promise<Matiere> {
        const matiere = await this.matiereRepository.findOne({ where: { id } });

        if (!matiere) {
            throw new Error('Matière non trouvée');
        }

        if (data.matiereName) matiere.matiereName = data.matiereName;
        if (data.description !== undefined) matiere.description = data.description;
        if (data.matiereCode !== undefined) matiere.matiereCode = data.matiereCode;

        return await this.matiereRepository.save(matiere);
    }

    /**
     * Supprimer une matière
     */
    async deleteMatiere(id: string): Promise<void> {
        const matiere = await this.matiereRepository.findOne({
            where: { id },
            relations: ['groupePartage', 'enseignementAssignments']
        });

        if (!matiere) {
            throw new Error('Matière non trouvée');
        }

        // Vérifier qu'il n'y a pas d'enseignements actifs
        const activeAssignments = matiere.enseignementAssignments?.filter(a => a.isActive);
        if (activeAssignments && activeAssignments.length > 0) {
            throw new Error('Impossible de supprimer une matière avec des enseignements actifs');
        }

        await this.matiereRepository.remove(matiere);
    }

    /**
     * Activer/Désactiver une matière
     */
    async toggleMatiereStatus(id: string): Promise<Matiere> {
        const matiere = await this.matiereRepository.findOne({ where: { id } });

        if (!matiere) {
            throw new Error('Matière non trouvée');
        }

        matiere.isActive = !matiere.isActive;
        return await this.matiereRepository.save(matiere);
    }

    /**
     * Créer ou récupérer le groupe de partage d'une matière
     */
    async ensureMatiereGroupePartage(matiereId: string): Promise<GroupePartage> {
        const matiere = await this.matiereRepository.findOne({
            where: { id: matiereId },
            relations: ['groupePartage']
        });

        if (!matiere) {
            throw new Error('Matière non trouvée');
        }

        // Si le groupe existe déjà, le retourner
        if (matiere.groupePartage) {
            return matiere.groupePartage;
        }

        // Sinon, le créer
        const groupeName = `${matiere.matiereName}`;
        const description = `Groupe de partage pour la matière ${matiere.matiereName}`;
        const groupe = await this.groupePartageService.createCustomGroupe(groupeName, description, []);

        matiere.groupePartage = groupe;
        await this.matiereRepository.save(matiere);

        return groupe;
    }

    /**
     * Récupérer les matières d'un enseignant
     */
    async getMatieresByEnseignant(enseignantId: string): Promise<Matiere[]> {
        return await this.matiereRepository
            .createQueryBuilder('matiere')
            .leftJoinAndSelect('matiere.classe', 'classe')
            .leftJoinAndSelect('matiere.enseignementAssignments', 'enseignement')
            .leftJoinAndSelect('enseignement.enseignant', 'enseignant')
            .where('enseignant.id = :enseignantId', { enseignantId })
            .andWhere('enseignement.isActive = :isActive', { isActive: true })
            .orderBy('matiere.matiereName', 'ASC')
            .getMany();
    }

    /**
     * Rechercher des matières par nom
     */
    async searchMatieres(query: string, classeId?: string): Promise<Matiere[]> {
        const queryBuilder = this.matiereRepository
            .createQueryBuilder('matiere')
            .leftJoinAndSelect('matiere.classe', 'classe')
            .where('LOWER(matiere.matiereName) LIKE LOWER(:query)', { query: `%${query}%` })
            .orWhere('LOWER(matiere.matiereCode) LIKE LOWER(:query)', { query: `%${query}%` });

        if (classeId) {
            queryBuilder.andWhere('classe.id = :classeId', { classeId });
        }

        return await queryBuilder
            .orderBy('matiere.matiereName', 'ASC')
            .getMany();
    }

    /**
     * Assigner un enseignant à une matière
     */
    async addTeacherToMatiere(matiereId: string, teacherId: string): Promise<void> {
        console.log(`Adding teacher ${teacherId} to matiere ${matiereId}`);
        const matiere = await this.matiereRepository.findOne({
            where: { id: matiereId },
            relations: ['classe', 'classe.filiere', 'classe.filiere.school']
        });

        if (!matiere) {
            console.error(`Matiere ${matiereId} not found`);
            throw new Error('Matière non trouvée');
        }

        const userRepository = AppDataSource.getRepository(User);
        const teacher = await userRepository.findOne({ where: { id: teacherId }, relations: ['school'] });

        if (!teacher) {
            console.error(`Teacher ${teacherId} not found`);
            throw new Error('Enseignant non trouvé');
        }
        if (teacher.role !== UserRole.ENSEIGNANT) {
            console.error(`User ${teacherId} is not a teacher, role is ${teacher.role}`);
            throw new Error("L'utilisateur n'est pas un enseignant");
        }

        const EnseignementRepository = AppDataSource.getRepository(EnseignementAssignment);

        // Vérifier si l'assignation existe déjà
        const existingAssignment = await EnseignementRepository.findOne({
            where: {
                enseignant: { id: teacherId },
                matiere: { id: matiereId },
                isActive: true
            }
        });

        if (existingAssignment) {
            console.warn(`Assignment already exists for teacher ${teacherId} and matiere ${matiereId}`);
            throw new Error("L'enseignant est déjà assigné à cette matière");
        }

        const school = teacher.school || matiere.classe.filiere?.school;
        if (!school) {
            console.error(`No school found for assignment. Teacher school: ${teacher.school?.id}, Matiere school: ${matiere.classe.filiere?.school?.id}`);
            throw new Error("Impossible de déterminer l'école pour l'assignation");
        }

        // Créer l'assignation
        const assignment = EnseignementRepository.create({
            enseignant: teacher,
            ecole: school,
            classe: matiere.classe,
            matiere: matiere,
            isActive: true
        });

        try {
            const savedAssignment = await EnseignementRepository.save(assignment);
            console.log(`Assignment created with ID: ${savedAssignment.id}`);

            // Synchroniser les permissions
            await this.groupePartageService.syncAfterEnseignementAssignment(savedAssignment.id);
        } catch (error) {
            console.error("Error saving assignment or syncing:", error);
            throw error;
        }
    }

    /**
     * Retirer un enseignant d'une matière
     */
    async removeTeacherFromMatiere(matiereId: string, teacherId: string): Promise<void> {
        const EnseignementRepository = AppDataSource.getRepository('EnseignementAssignment' as any);

        const assignment = await EnseignementRepository.findOne({
            where: {
                enseignant: { id: teacherId },
                matiere: { id: matiereId },
                isActive: true
            }
        });

        if (!assignment) {
            throw new Error("L'assignation n'existe pas ou est déjà inactive");
        }

        await EnseignementRepository.remove(assignment);

        // Synchroniser les permissions (le retrait de l'enseignant du groupe se fait via la synchro)
        // Note: syncAfterEnseignementAssignment requiert un ID d'assignment, or on vient de le supprimer.
        // On doit appeler syncMatiereGroupePartage directement.
        await this.groupePartageService.syncMatiereGroupePartage(matiereId);
    }
}
