// groupe.partage.ts
import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, JoinTable, ManyToOne, JoinColumn } from "typeorm";
import { Document } from "./document";
import { Notification } from "./notification";
import { User } from "./user";

export enum TypeGroupePartage {
    ECOLE = 'ecole',
    FILIERE = 'filiere',
    CLASSE = 'classe',
    CUSTOM = 'custom' // Pour les groupes personnalisés
}

@Entity()
export class GroupePartage {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({
        type: 'enum',
        enum: TypeGroupePartage,
        default: TypeGroupePartage.CUSTOM
    })
    type!: TypeGroupePartage;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'owner_id' })
    owner?: User;

    // Relation ManyToMany avec Document (côté inverse)
    @ManyToMany(() => Document, document => document.groupesPartage)
    documents?: Document[];

    @OneToMany(() => Notification, notification => notification.groupePartage)
    notifications?: Notification[];

    // Relation ManyToMany avec User (côté propriétaire avec JoinTable)
    @ManyToMany(() => User, user => user.groupesPartage)
    @JoinTable({
        name: 'groupe_partage_users',
        joinColumn: { name: 'groupe_partage_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    })
    users?: User[];

}