// document.ts
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { DocumentCategorie } from "./document.categorie";
import { User } from "./user";
import { Matiere } from './matiere';
import { GroupePartage } from './groupe.partage';

@Entity()
export class Document {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the document' })
    id!: string;

    @Column()
    @ApiProperty({ description: 'Name of the document' })
    documentName!: string;

    @Column()
    @ApiProperty({ description: 'URL of the document' })
    documentUrl!: string;

    @Column({ type: 'text', nullable: true })
    @ApiProperty({ description: 'Description of the document' })
    description?: string;

    @Column({ default: true })
    @ApiProperty({ description: 'Indicates if the document is downloadable' })
    isdownloadable!: boolean;

    @Column({ default: 0 })
    @ApiProperty({ description: 'Number of times the document has been downloaded' })
    downaloadCount!: number;

    @Column()
    @ApiProperty({ description: 'Size of the document file' })
    fileSize!: number;

    @Column()
    @ApiProperty({ description: 'Type of the document file' })
    fileType!: string;

    @Column({ default: 0 })
    @ApiProperty({ description: 'Number of times the document has been viewed' })
    viewCount!: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt!: Date;

    @ManyToOne(() => DocumentCategorie, { nullable: false })
    @JoinColumn({ name: 'categorie_id' })
    @ApiProperty({ description: 'Category of the document' })
    categorie?: DocumentCategorie;

    @ManyToOne(() => User, user => user.addedDocuments, { nullable: false })
    @JoinColumn({ name: 'added_by_id' })
    @ApiProperty({ description: 'User who added the document' })
    addedBy!: User;

    @ManyToOne(() => Matiere, { nullable: true })
    @JoinColumn({ name: 'matiere_id' })
    @ApiProperty({ description: 'Subject associated with the document' })
    matiere?: Matiere;

    // Relation ManyToMany avec GroupePartage (côté propriétaire avec JoinTable)
    @ManyToMany(() => GroupePartage, groupePartage => groupePartage.documents, { nullable: true })
    @JoinTable({
        name: 'document_groupes_partage',
        joinColumn: { name: 'document_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'groupe_partage_id', referencedColumnName: 'id' }
    })
    @ApiProperty({ description: 'Groups sharing the document' })
    groupesPartage?: GroupePartage[];
}