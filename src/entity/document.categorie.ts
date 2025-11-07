import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Document } from "./document";

@Entity()
export class DocumentCategorie {

    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the document category' })
    id!: string;

    @Column()
    @ApiProperty({ description: 'Name of the document category' })
    categorieName!: string;

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