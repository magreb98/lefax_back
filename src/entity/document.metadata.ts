import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Document } from './document';
import { ApiProperty } from '@nestjs/swagger';

export enum DocumentType {
    CC = 'cc',
    SESSION_NORMALE = 'session_normale',
    SESSION_RATTRAPAGE = 'session_rattrapage',
    TP = 'tp',
    TD = 'td',
    COURS = 'cours',
    EXERCICES = 'exercices',
    CORRECTION = 'correction',
    AUTRES = 'autres'
}

@Entity()
export class DocumentMetadata {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the document metadata' })
    id!: string;

    // Relation OneToOne avec Document
    @OneToOne(() => Document, { nullable: false })
    @JoinColumn({ name: 'document_id' })
    @ApiProperty({ description: 'Document associated with this metadata' })
    document!: Document;

    // Type de document
    @Column({
        type: 'enum',
        enum: DocumentType,
        default: DocumentType.AUTRES
    })
    @ApiProperty({ description: 'Type of the document' })
    documentType!: DocumentType;

    // Mois de publication (1-12)
    @Column({ type: 'int', nullable: true })
    @ApiProperty({ description: 'Publication month (1-12)' })
    publicationMonth?: number;

    // Année de publication
    @Column({ type: 'int', nullable: true })
    @ApiProperty({ description: 'Publication year' })
    publicationYear?: number;

    // Semestre académique (optionnel)
    @Column({ type: 'int', nullable: true })
    @ApiProperty({ description: 'Academic semester (1 or 2)' })
    semester?: number;

    // Année académique (format: 2023-2024)
    @Column({ nullable: true })
    @ApiProperty({ description: 'Academic year (format: 2023-2024)' })
    academicYear?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt!: Date;
}
