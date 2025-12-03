import { AppDataSource } from '../config/database';
import { Matiere } from '../entity/matiere';
import { Class } from '../entity/classe';
import { GroupePartage, GroupePartageType } from '../entity/groupe.partage';
import { User, UserRole } from '../entity/user';
import { GroupePartageService } from './GroupePartageService';

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

        // Créer la matière
        const matiere = this.matiereRepository.create({
            matiereName: data.matiereName,
            description: data.description,
            matiereCode: data.matiereCode,
            classe
        });

        const savedMatiere = await this.matiereRepository.save(matiere);

        // Auto-créer le sous-groupe de partage par défaut
        if (data.createSubGroup !== false) {
            const groupeName = `${savedMatiere.matiereName} - ${classe.className}`;
            const description = `Groupe de partage pour la matière ${savedMatiere.matiereName}`;
            const groupe = await this.groupePartageService.createCustomGroupe(groupeName, description, []);

            savedMatiere.groupePartage = groupe;
            await this.matiereRepository.save(savedMatiere);
        }

        return savedMatiere;
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
}
