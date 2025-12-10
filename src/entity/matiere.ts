import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Class } from './classe';
import { Document } from './document';
import { GroupePartage } from './groupe.partage';
import { EnseignementAssignment } from './enseignement.assigment';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Matiere {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the matiere' })
    id!: string;

    @Column()
    @ApiProperty({ description: 'Name of the matiere' })
    matiereName!: string;

    @Column({ type: 'text', nullable: true })
    @ApiProperty({ description: 'Description of the matiere' })
    description?: string;

    @Column({ nullable: true })
    @ApiProperty({ description: 'Code of the matiere' })
    matiereCode?: string;

    // Relation avec la classe
    @ManyToOne(() => Class, classe => classe.matieres, { nullable: false })
    @JoinColumn({ name: 'classe_id' })
    @ApiProperty({ description: 'Class associated with this matiere' })
    classe!: Class;

    // Sous-groupe de partage par matière (nouveau)
    @OneToOne(() => GroupePartage, groupePartage => groupePartage.matiere, { cascade: true, nullable: true })
    @JoinColumn({ name: 'groupe_partage_id' })
    @ApiProperty({ description: 'Groupe partage associated with this matiere for document organization' })
    groupePartage?: GroupePartage;

    // Documents associés à cette matière
    @OneToMany(() => Document, document => document.matiere)
    @ApiProperty({ description: 'Documents associated with this matiere' })
    documents?: Document[];

    // Assignments des enseignants
    @OneToMany(() => EnseignementAssignment, assignment => assignment.matiere)
    @ApiProperty({ description: 'Teaching assignments for this matiere' })
    enseignementAssignments?: EnseignementAssignment[];

    @Column({ default: true })
    @ApiProperty({ description: 'Indicates if the matiere is active' })
    isActive!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt!: Date;
}
