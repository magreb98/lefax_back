import { AppDataSource } from '../config/database';
import { DocumentMetadata, DocumentType } from '../entity/document.metadata';
import { Document } from '../entity/document';
import { Between, Repository } from 'typeorm';

export class DocumentMetadataService {
    private metadataRepository: Repository<DocumentMetadata>;

    constructor() {
        this.metadataRepository = AppDataSource.getRepository(DocumentMetadata);
    }

    /**
     * Définir ou mettre à jour les métadonnées d'un document
     */
    async setDocumentMetadata(
        documentId: string,
        documentType: DocumentType,
        publicationMonth: number,
        publicationYear: number,
        semester?: number,
        academicYear?: string
    ): Promise<DocumentMetadata> {
        // Vérifier si des métadonnées existent déjà pour ce document
        const existing = await this.metadataRepository.findOne({
            where: { document: { id: documentId } }
        });

        if (existing) {
            // Mise à jour
            existing.documentType = documentType;
            existing.publicationMonth = publicationMonth;
            existing.publicationYear = publicationYear;
            if (semester !== undefined) existing.semester = semester;
            if (academicYear) existing.academicYear = academicYear;

            return await this.metadataRepository.save(existing);
        } else {
            // Création
            const metadata = this.metadataRepository.create({
                document: { id: documentId } as Document,
                documentType,
                publicationMonth,
                publicationYear,
                semester,
                academicYear
            });

            return await this.metadataRepository.save(metadata);
        }
    }

    /**
     * Récupérer les documents d'un groupe par type
     */
    async getDocumentsByType(
        groupeId: string,
        type: DocumentType
    ): Promise<DocumentMetadata[]> {
        return await this.metadataRepository
            .createQueryBuilder('metadata')
            .innerJoinAndSelect('metadata.document', 'document')
            .innerJoin('document.groupesPartage', 'groupe')
            .where('groupe.id = :groupeId', { groupeId })
            .andWhere('metadata.documentType = :type', { type })
            .orderBy('metadata.updatedAt', 'DESC')
            .getMany();
    }

    /**
     * Récupérer les documents d'un groupe par période
     */
    async getDocumentsByPeriod(
        groupeId: string,
        month: number,
        year: number
    ): Promise<DocumentMetadata[]> {
        return await this.metadataRepository
            .createQueryBuilder('metadata')
            .innerJoinAndSelect('metadata.document', 'document')
            .innerJoin('document.groupesPartage', 'groupe')
            .where('groupe.id = :groupeId', { groupeId })
            .andWhere('metadata.publicationMonth = :month', { month })
            .andWhere('metadata.publicationYear = :year', { year })
            .orderBy('metadata.updatedAt', 'DESC')
            .getMany();
    }

    /**
     * Récupérer les documents par année académique
     */
    async getDocumentsByAcademicYear(
        groupeId: string,
        academicYear: string
    ): Promise<DocumentMetadata[]> {
        return await this.metadataRepository
            .createQueryBuilder('metadata')
            .innerJoinAndSelect('metadata.document', 'document')
            .innerJoin('document.groupesPartage', 'groupe')
            .where('groupe.id = :groupeId', { groupeId })
            .andWhere('metadata.academicYear = :academicYear', { academicYear })
            .orderBy('metadata.updatedAt', 'DESC')
            .getMany();
    }

    /**
     * Récupérer les documents par semestre
     */
    async getDocumentsBySemester(
        groupeId: string,
        semester: number,
        academicYear: string
    ): Promise<DocumentMetadata[]> {
        return await this.metadataRepository
            .createQueryBuilder('metadata')
            .innerJoinAndSelect('metadata.document', 'document')
            .innerJoin('document.groupesPartage', 'groupe')
            .where('groupe.id = :groupeId', { groupeId })
            .andWhere('metadata.semester = :semester', { semester })
            .andWhere('metadata.academicYear = :academicYear', { academicYear })
            .orderBy('metadata.updatedAt', 'DESC')
            .getMany();
    }

    /**
     * Récupérer les métadonnées d'un document
     */
    async getMetadataByDocumentId(documentId: string): Promise<DocumentMetadata | null> {
        return await this.metadataRepository.findOne({
            where: { document: { id: documentId } },
            relations: ['document']
        });
    }

    /**
     * Supprimer les métadonnées d'un document
     */
    async deleteMetadata(documentId: string): Promise<boolean> {
        const metadata = await this.metadataRepository.findOne({
            where: { document: { id: documentId } }
        });

        if (metadata) {
            await this.metadataRepository.remove(metadata);
            return true;
        }

        return false;
    }
}
