import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Document } from "./document";
import { GroupePartage } from "./groupe.partage";

@Entity()
export class DocumentCategorie {

    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the document category' })
    id!: string;

    @Column()
    @ApiProperty({ description: 'Name of the document category' })
    categorieName!: string;

    @Column({ nullable: true })
    @ApiProperty({ description: 'Description of the document category' })
    description?: string;

    // Catégorie globale (créée par SUPERADMIN, visible partout)
    @Column({ default: false })
    @ApiProperty({ description: 'Indicates if category is global (visible in all groups)' })
    isGlobal!: boolean;

    // Groupe auquel appartient la catégorie (null si globale)
    @ManyToOne(() => GroupePartage, { nullable: true })
    @JoinColumn({ name: 'groupe_partage_id' })
    @ApiProperty({ description: 'Group to which the category belongs (null for global categories)' })
    groupePartage?: GroupePartage;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt!: Date;

    @OneToMany(() => Document, document => document.categorie)
    @ApiProperty({ description: 'List of documents in the category' })
    documents!: Document[];
}