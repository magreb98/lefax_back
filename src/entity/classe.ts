import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Matiere } from "./matiere";
import { Filiere } from "./filiere";
import { GroupePartage } from "./groupe.partage";
import { User } from "./user";
import { EnseignementAssignment } from "./enseignement.assigment";
import { ApiProperty } from '@nestjs/swagger';


@Entity()
export class Class {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the class' })
    id!: string;

    @Column()
    @ApiProperty({ description: 'Name of the class' })
    className!: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt!: Date;

    @OneToOne(() => GroupePartage, groupePartage => groupePartage.classe, { cascade: true })
    @JoinColumn({ name: 'groupe_partage_id' })
    @ApiProperty({ description: 'Group sharing associated with the class' })
    groupePartage!: GroupePartage;

    @ManyToOne(() => Filiere, filiere => filiere.classes, { nullable: false })
    @JoinColumn({ name: 'filiere_id' })
    @ApiProperty({ description: 'Filiere associated with the class' })
    filiere!: Filiere;

    @OneToMany(() => Matiere, matiere => matiere.classe)
    @ApiProperty({ description: 'Subjects in the class' })
    matieres!: Matiere[];

    @OneToMany(() => User, user => user.classe)
    @ApiProperty({ description: 'Students in the class' })
    etudiants!: User[];

    // Relation avec les enseignements
    @OneToMany(() => EnseignementAssignment, assignment => assignment.classe)
    @ApiProperty({ description: 'Teaching assignments in the class' })
    enseignementAssignments!: EnseignementAssignment[];
}