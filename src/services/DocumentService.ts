import { AppDataSource } from "../config/database";
import { Document } from "../entity/document";
import { DocumentCategorie } from "../entity/document.categorie";
import { User, UserRole } from "../entity/user";
import fs from 'fs';
import path from 'path';
import { Matiere } from "../entity/matiere";
import { GroupePartage, GroupePartageType } from "../entity/groupe.partage";

export class DocumentService {
    private documentRepository = AppDataSource.getRepository(Document);
    private documentCategorieRepository = AppDataSource.getRepository(DocumentCategorie);
    private matiereRepository = AppDataSource.getRepository(Matiere);
    private groupePartageRepository = AppDataSource.getRepository(GroupePartage);
    private userRepository = AppDataSource.getRepository(User);

    /**
     * Récupérer ou créer le groupe de partage public par défaut
     */
    async getOrCreatePublicGroupe(): Promise<GroupePartage> {
        let publicGroupe = await this.groupePartageRepository.findOne({
            where: { groupeName: 'Public', type: GroupePartageType.CUSTOM }
        });

        if (!publicGroupe) {
            publicGroupe = this.groupePartageRepository.create({
                groupeName: 'Public',
                description: 'Groupe de partage public par défaut - accessible à tous',
                type: GroupePartageType.CUSTOM
            });
            await this.groupePartageRepository.save(publicGroupe);
        }

        return publicGroupe;
    }

    /**
     * Créer un nouveau document
     */
    async createDocument(data: {
        documentName: string;
        description?: string;
        documentUrl: string;
        fileSize: number;
        fileType: string;
        categorieId: string;
        addedById: string;
        matiereId?: string;
        groupePartageIds?: string[];
        isdownloadable?: boolean;
    }): Promise<Document> {
        // Récupérer la catégorie
        const categorie = await this.documentCategorieRepository.findOne({
            where: { id: data.categorieId }
        });
        if (!categorie) {
            throw new Error('Catégorie non trouvée');
        }

        // Récupérer l'utilisateur qui ajoute le document
        const addedBy = await this.userRepository.findOne({
            where: { id: data.addedById }
        });
        if (!addedBy) {
            throw new Error('Utilisateur non trouvé');
        }

        // Récupérer la matière si fournie
        let matiere = undefined;
        if (data.matiereId) {
            matiere = await this.matiereRepository.findOne({
                where: { id: data.matiereId }
            });
            if (!matiere) {
                throw new Error('Matière non trouvée');
            }
        }

        // Récupérer les groupes de partage
        let groupesPartage: GroupePartage[] = [];
        if (data.groupePartageIds && data.groupePartageIds.length > 0) {
            groupesPartage = await this.groupePartageRepository.findByIds(data.groupePartageIds);
            if (groupesPartage.length !== data.groupePartageIds.length) {
                throw new Error('Un ou plusieurs groupes de partage non trouvés');
            }
        } else {
            // Si aucun groupe spécifié, utiliser le groupe public
            const publicGroupe = await this.getOrCreatePublicGroupe();
            groupesPartage = [publicGroupe];
        }

        // Créer le document
        const document = this.documentRepository.create({
            documentName: data.documentName,
            description: data.description,
            documentUrl: data.documentUrl,
            fileSize: data.fileSize,
            fileType: data.fileType,
            isdownloadable: data.isdownloadable ?? true,
            downaloadCount: 0,
            viewCount: 0,
            categorie,
            addedBy,
            matiere,
            groupesPartage
        });

        await this.documentRepository.save(document);
        return document;
    }

    /**
     * Ajouter un document à un groupe de partage
     */
    async addDocumentToGroupe(documentId: string, groupeId: string): Promise<Document> {
        const document = await this.documentRepository.findOne({
            where: { id: documentId },
            relations: ['groupesPartage']
        });

        if (!document) {
            throw new Error('Document non trouvé');
        }

        const groupe = await this.groupePartageRepository.findOne({
            where: { id: groupeId }
        });

        if (!groupe) {
            throw new Error('Groupe de partage non trouvé');
        }

        if (!document.groupesPartage) {
            document.groupesPartage = [];
        }

        // Vérifier si le document n'est pas déjà dans le groupe
        if (!document.groupesPartage.some(g => g.id === groupeId)) {
            document.groupesPartage.push(groupe);
            await this.documentRepository.save(document);
        }

        return document;
    }

    /**
     * Ajouter un document à plusieurs groupes de partage
     */
    async addDocumentToGroupes(documentId: string, groupeIds: string[]): Promise<Document> {
        const document = await this.documentRepository.findOne({
            where: { id: documentId },
            relations: ['groupesPartage']
        });

        if (!document) {
            throw new Error('Document non trouvé');
        }

        const groupes = await this.groupePartageRepository.findByIds(groupeIds);

        if (groupes.length !== groupeIds.length) {
            throw new Error('Un ou plusieurs groupes de partage non trouvés');
        }

        if (!document.groupesPartage) {
            document.groupesPartage = [];
        }

        // Ajouter les groupes (sans doublons)
        groupes.forEach(groupe => {
            if (!document.groupesPartage!.some(g => g.id === groupe.id)) {
                document.groupesPartage!.push(groupe);
            }
        });

        await this.documentRepository.save(document);
        return document;
    }

    /**
     * Retirer un document d'un groupe de partage
     */
    async removeDocumentFromGroupe(documentId: string, groupeId: string): Promise<Document> {
        const document = await this.documentRepository.findOne({
            where: { id: documentId },
            relations: ['groupesPartage']
        });

        if (!document) {
            throw new Error('Document non trouvé');
        }

        if (document.groupesPartage) {
            document.groupesPartage = document.groupesPartage.filter(g => g.id !== groupeId);

            // Si le document n'a plus de groupe, l'ajouter au groupe public
            if (document.groupesPartage.length === 0) {
                const publicGroupe = await this.getOrCreatePublicGroupe();
                document.groupesPartage = [publicGroupe];
            }

            await this.documentRepository.save(document);
        }

        return document;
    }

    /**
     * Récupérer tous les documents
     */
    async getAllDocuments(options?: {
        categorieId?: string;
        matiereId?: string;
        addedById?: string;
        groupePartageId?: string;
    }): Promise<Document[]> {
        const query = this.documentRepository
            .createQueryBuilder('document')
            .leftJoinAndSelect('document.categorie', 'categorie')
            .leftJoinAndSelect('document.addedBy', 'addedBy')
            .leftJoinAndSelect('document.matiere', 'matiere')
            .leftJoinAndSelect('document.groupesPartage', 'groupesPartage')
            .orderBy('document.createdAt', 'DESC');

        if (options?.categorieId) {
            query.andWhere('categorie.id = :categorieId', { categorieId: options.categorieId });
        }

        if (options?.matiereId) {
            query.andWhere('matiere.id = :matiereId', { matiereId: options.matiereId });
        }

        if (options?.addedById) {
            query.andWhere('addedBy.id = :addedById', { addedById: options.addedById });
        }

        if (options?.groupePartageId) {
            query.andWhere('groupesPartage.id = :groupePartageId', { groupePartageId: options.groupePartageId });
        }

        return await query.getMany();
    }

    /**
     * Récupérer un document par ID
     */
    async getDocumentById(id: string): Promise<Document | null> {
        return await this.documentRepository.findOne({
            where: { id },
            relations: ['categorie', 'addedBy', 'matiere', 'groupesPartage']
        });
    }

    /**
     * Incrémenter le compteur de vues d'un document
     */
    async incrementViewCount(id: string): Promise<Document> {
        const document = await this.documentRepository.findOne({ where: { id } });

        if (!document) {
            throw new Error('Document non trouvé');
        }

        document.viewCount += 1;
        await this.documentRepository.save(document);

        return document;
    }

    /**
     * Incrémenter le compteur de téléchargements d'un document
     */
    async incrementDownloadCount(id: string): Promise<Document> {
        const document = await this.documentRepository.findOne({ where: { id } });

        if (!document) {
            throw new Error('Document non trouvé');
        }

        document.downaloadCount += 1;
        await this.documentRepository.save(document);

        return document;
    }

    /**
     * Mettre à jour un document
     */
    async updateDocument(id: string, data: {
        documentName?: string;
        description?: string;
        categorieId?: string;
        matiereId?: string | null;
        groupePartageIds?: string[];
        isdownloadable?: boolean;
    }): Promise<Document> {
        const document = await this.documentRepository.findOne({
            where: { id },
            relations: ['categorie', 'matiere', 'groupesPartage']
        });

        if (!document) {
            throw new Error('Document non trouvé');
        }

        // Mettre à jour les champs simples
        if (data.documentName) document.documentName = data.documentName;
        if (data.description !== undefined) document.description = data.description;
        if (data.isdownloadable !== undefined) document.isdownloadable = data.isdownloadable;

        // Mettre à jour la catégorie
        if (data.categorieId) {
            const categorie = await this.documentCategorieRepository.findOne({
                where: { id: data.categorieId }
            });
            if (!categorie) {
                throw new Error('Catégorie non trouvée');
            }
            document.categorie = categorie;
        }

        // Mettre à jour la matière
        if (data.matiereId !== undefined) {
            if (data.matiereId === null) {
                document.matiere = undefined;
            } else {
                const matiere = await this.matiereRepository.findOne({
                    where: { id: data.matiereId }
                });
                if (!matiere) {
                    throw new Error('Matière non trouvée');
                }
                document.matiere = matiere;
            }
        }

        // Mettre à jour les groupes de partage
        if (data.groupePartageIds !== undefined) {
            if (data.groupePartageIds.length === 0) {
                // Si aucun groupe spécifié, utiliser le groupe public
                const publicGroupe = await this.getOrCreatePublicGroupe();
                document.groupesPartage = [publicGroupe];
            } else {
                const groupes = await this.groupePartageRepository.findByIds(data.groupePartageIds);
                if (groupes.length !== data.groupePartageIds.length) {
                    throw new Error('Un ou plusieurs groupes de partage non trouvés');
                }
                document.groupesPartage = groupes;
            }
        }

        await this.documentRepository.save(document);
        return document;
    }

    /**
     * Supprimer un document
     */
    async deleteDocument(id: string): Promise<void> {
        const document = await this.documentRepository.findOne({ where: { id } });

        if (!document) {
            throw new Error('Document non trouvé');
        }

        // Supprimer le fichier physique
        if (document.documentUrl && fs.existsSync(document.documentUrl)) {
            fs.unlinkSync(document.documentUrl);
        }

        await this.documentRepository.remove(document);
    }

    /**
     * Récupérer les documents accessibles par un utilisateur
     * (basé sur ses groupes de partage)
     */
    async getDocumentsByUser(userId: string): Promise<Document[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['groupesPartage', 'classe', 'classe.groupePartage', 'school', 'school.groupePartage']
        });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Récupérer tous les IDs des groupes auxquels l'utilisateur a accès
        const groupeIds: string[] = [];

        // Groupes de partage directs
        if (user.groupesPartage) {
            user.groupesPartage.forEach(g => groupeIds.push(g.id));
        }

        // Groupe de sa classe
        if (user.classe?.groupePartage) {
            groupeIds.push(user.classe.groupePartage.id);
        }

        // Groupe de son école
        if (user.school?.groupePartage) {
            groupeIds.push(user.school.groupePartage.id);
        }

        // Groupe public
        const publicGroupe = await this.getOrCreatePublicGroupe();
        groupeIds.push(publicGroupe.id);

        // Supprimer les doublons
        const uniqueGroupeIds = [...new Set(groupeIds)];

        // Récupérer tous les documents de ces groupes
        return await this.documentRepository
            .createQueryBuilder('document')
            .leftJoinAndSelect('document.categorie', 'categorie')
            .leftJoinAndSelect('document.addedBy', 'addedBy')
            .leftJoinAndSelect('document.matiere', 'matiere')
            .leftJoinAndSelect('document.groupesPartage', 'groupesPartage')
            .where('groupesPartage.id IN (:...groupeIds)', { groupeIds: uniqueGroupeIds })
            .orderBy('document.createdAt', 'DESC')
            .getMany();
    }

    /**
     * Récupérer les documents d'un groupe de partage
     */
    async getDocumentsByGroupe(groupeId: string): Promise<Document[]> {
        return await this.documentRepository
            .createQueryBuilder('document')
            .leftJoinAndSelect('document.categorie', 'categorie')
            .leftJoinAndSelect('document.addedBy', 'addedBy')
            .leftJoinAndSelect('document.matiere', 'matiere')
            .leftJoinAndSelect('document.groupesPartage', 'groupesPartage')
            .where('groupesPartage.id = :groupeId', { groupeId })
            .orderBy('document.createdAt', 'DESC')
            .getMany();
    }

    /**
     * Récupérer les documents d'une matière
     */
    async getDocumentsByMatiere(matiereId: string): Promise<Document[]> {
        return await this.documentRepository.find({
            where: { matiere: { id: matiereId } },
            relations: ['categorie', 'addedBy', 'matiere', 'groupesPartage'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Récupérer les documents d'une catégorie
     */
    async getDocumentsByCategorie(categorieId: string): Promise<Document[]> {
        return await this.documentRepository.find({
            where: { categorie: { id: categorieId } },
            relations: ['categorie', 'addedBy', 'matiere', 'groupesPartage'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Rechercher des documents par nom
     */
    async searchDocuments(searchTerm: string): Promise<Document[]> {
        return await this.documentRepository
            .createQueryBuilder('document')
            .leftJoinAndSelect('document.categorie', 'categorie')
            .leftJoinAndSelect('document.addedBy', 'addedBy')
            .leftJoinAndSelect('document.matiere', 'matiere')
            .leftJoinAndSelect('document.groupesPartage', 'groupesPartage')
            .where('document.documentName LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
            .orWhere('document.description LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
            .orderBy('document.createdAt', 'DESC')
            .getMany();
    }

    /**
     * Récupérer les documents les plus téléchargés
     */
    async getMostDownloadedDocuments(limit: number = 10): Promise<Document[]> {
        return await this.documentRepository.find({
            relations: ['categorie', 'addedBy', 'matiere', 'groupesPartage'],
            order: { downaloadCount: 'DESC' },
            take: limit
        });
    }

    /**
     * Récupérer les documents les plus vus
     */
    async getMostViewedDocuments(limit: number = 10): Promise<Document[]> {
        return await this.documentRepository.find({
            relations: ['categorie', 'addedBy', 'matiere', 'groupesPartage'],
            order: { viewCount: 'DESC' },
            take: limit
        });
    }

    /**
     * Récupérer les documents récents
     */
    async getRecentDocuments(limit: number = 10): Promise<Document[]> {
        return await this.documentRepository.find({
            relations: ['categorie', 'addedBy', 'matiere', 'groupesPartage'],
            order: { createdAt: 'DESC' },
            take: limit
        });
    }
}