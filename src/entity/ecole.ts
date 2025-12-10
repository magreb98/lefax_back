import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user";
import { Filiere } from "./filiere";
import { EnseignementAssignment } from "./enseignement.assigment";
import { ApiProperty } from '@nestjs/swagger';
import { GroupePartage } from "./groupe.partage";


@Entity()
export class Ecole {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the school' })
    id!: string;

    @Column()
    @ApiProperty({ description: 'Name of the school' })
    schoolName!: string;

    @Column()
    @ApiProperty({ description: 'Address of the school' })
    address!: string;

    @Column()
    @ApiProperty({ description: 'Email of the school' })
    schoolEmail!: string;

    @Column()
    @ApiProperty({ description: 'Phone number of the school' })
    schoolPhone!: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'school_admin_id' })
    @ApiProperty({ description: 'Admin of the school' })
    schoolAdmin!: User;

    @Column({ default: true })
    @ApiProperty({ description: 'Indicates if the school is active' })
    isActive!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt!: Date;

    @OneToOne(() => GroupePartage, groupePartage => groupePartage.ecole, { cascade: true })
    @JoinColumn({ name: 'groupe_partage_id' })
    @ApiProperty({ description: 'Group sharing associated with the school' })
    groupePartage!: GroupePartage;

    @OneToMany(() => User, user => user.school)
    @ApiProperty({ description: 'List of students in the school' })
    students!: User[];

    @OneToMany(() => Filiere, filiere => filiere.school)
    @ApiProperty({ description: 'List of filieres in the school' })
    filieres!: Filiere[];

    // Relation avec les enseignements
    @OneToMany(() => EnseignementAssignment, assignment => assignment.ecole)
    @ApiProperty({ description: 'List of teaching assignments in the school' })
    enseignementAssignments!: EnseignementAssignment[];
}