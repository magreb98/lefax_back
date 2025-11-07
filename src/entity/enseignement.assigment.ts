import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user";
import { Ecole } from "./ecole";
import { Class } from "./classe";
import { Matiere } from "./matiere";

@Entity()
export class EnseignementAssignment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // Relation avec l'enseignant
    @ManyToOne(() => User, user => user.enseignements, { nullable: false })
    @JoinColumn({ name: 'enseignant_id' })
    enseignant!: User;

    // Relation avec l'école
    @ManyToOne(() => Ecole, ecole => ecole.enseignementAssignments, { nullable: false })
    @JoinColumn({ name: 'ecole_id' })
    ecole!: Ecole;

    // Relation avec la classe
    @ManyToOne(() => Class, classe => classe.enseignementAssignments, { nullable: false })
    @JoinColumn({ name: 'classe_id' })
    classe!: Class;

    // Relation avec la matière
    @ManyToOne(() => Matiere, matiere => matiere.enseignementAssignments, { nullable: false })
    @JoinColumn({ name: 'matiere_id' })
    matiere!: Matiere;

    // Informations supplémentaires optionnelles
    @Column({ type: 'int', nullable: true })
    heuresParSemaine?: number;

    @Column({ type: 'date', nullable: true })
    dateDebut?: Date;

    @Column({ type: 'date', nullable: true })
    dateFin?: Date;

    @Column({ default: true })
    isActive!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}