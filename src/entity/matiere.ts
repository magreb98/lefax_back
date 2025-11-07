import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Class } from "./classe";
import { Document } from "./document";
import { EnseignementAssignment } from "./enseignement.assigment";

@Entity()
export class Matiere {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    matiereName!: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    @ManyToOne(() => Class, classe => classe.matieres)
    @JoinColumn({ name: 'class_id' })
    classe!: Class;

    @OneToMany(() => Document, document => document.matiere)
    documents!: Document[];

    // Relation avec les enseignements
    @OneToMany(() => EnseignementAssignment, assignment => assignment.matiere)
    enseignementAssignments!: EnseignementAssignment[];
}