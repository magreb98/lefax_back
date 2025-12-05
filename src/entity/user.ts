import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, ManyToMany, BeforeInsert } from "typeorm";
import { Ecole } from "./ecole";
import { Document } from "./document";
import { Class } from "./classe";
import { EnseignementAssignment } from "./enseignement.assigment";
import { GroupePartage } from "./groupe.partage";


export enum UserRole {
    SUPERADMIN = 'superadmin',
    ADMIN = 'admin',
    USER = 'user',
    ETUDIANT = 'etudiant',
    ENSEIGNANT = 'enseignant'
}

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    phoneNumber!: string;

    @Column({ default: true })
    isActive!: boolean;

    @Column({ default: false })
    isSuspended!: boolean;

    @Column({nullable: true})
    isDelegate?: boolean;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER
    })
    role!: UserRole;

    @Column({ default: false })
    isVerified!: boolean;

    @Column()
    password!: string;

    // Permission de créer une école (accordée par le SUPERADMIN)
    @Column({ default: false })
    canCreateSchool!: boolean;

    @Column({ default: false })
    canViewAllGroups!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    @OneToMany(() => GroupePartage, groupePartage => groupePartage.owner)
    ownedGroupesPartage?: GroupePartage[];

    // Relation ManyToOne pour l'école principale (pour les étudiants)
    @ManyToOne(() => Ecole, { nullable: true })
    @JoinColumn({ name: 'school_id' })
    school?: Ecole;

    @OneToMany(() => Document, document => document.addedBy)
    addedDocuments!: Document[];

    @ManyToMany(() => GroupePartage, groupePartage => groupePartage.users)
    groupesPartage?: GroupePartage[];

    // Relation ManyToOne avec Class pour les étudiants
    @ManyToOne(() => Class, { nullable: true })
    @JoinColumn({ name: 'class_id' })
    classe?: Class;

    @OneToMany(() => EnseignementAssignment, assignment => assignment.enseignant)
    enseignements!: EnseignementAssignment[];

    @OneToMany(() => Ecole, ecole => ecole.schoolAdmin)
    ecoles!: Ecole[];

    @BeforeInsert()
    setRoleAsStudent() {
        if (this.classe && this.role !== UserRole.ENSEIGNANT) {
            this.role = UserRole.ETUDIANT;
            this.isDelegate = false;
        }
    }
}