import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinColumn, JoinTable, OneToMany, OneToOne } from 'typeorm';
import { User } from './user';
import { Document } from './document';
import { Class } from './classe';
import { Ecole } from './ecole';
import { Filiere } from './filiere';
import { Matiere } from './matiere';
import { ApiProperty } from '@nestjs/swagger';
import { Notification } from './notification';

export enum GroupePartageType {
    SCHOOL = 'school',
    CLASS = 'class',
    CUSTOM = 'custom',
    MATIERE = 'matiere',
    FILIERE = 'filiere'
}

@Entity()
export class GroupePartage {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({ description: 'Unique identifier for the groupe partage' })
    id!: string;

    @Column()
    @ApiProperty({ description: 'Name of the groupe partage' })
    groupeName!: string;

    @Column({ type: 'text', nullable: true })
    @ApiProperty({ description: 'Description of the groupe partage' })
    description?: string;

    @Column({
        type: 'enum',
        enum: GroupePartageType,
        default: GroupePartageType.CUSTOM
    })
    @ApiProperty({ description: 'Type of the groupe partage' })
    type!: GroupePartageType;

    // Owner/créateur du groupe (pour les groupes personnalisés)
    @ManyToOne(() => User, user => user.ownedGroupesPartage, { nullable: true })
    @JoinColumn({ name: 'owner_id' })
    @ApiProperty({ description: 'Owner of the groupe partage' })
    owner?: User;

    // Membres du groupe
    @ManyToMany(() => User, user => user.groupesPartage)
    @JoinTable({
        name: 'groupe_partage_users',
        joinColumn: { name: 'groupe_partage_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    })
    @ApiProperty({ description: 'Members of the groupe partage' })
    users?: User[];

    // Membres autorisés à publier dans le groupe (pour les groupes personnalisés)
    @ManyToMany(() => User)
    @JoinTable({
        name: 'groupe_partage_allowed_publishers',
        joinColumn: { name: 'groupe_partage_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    })
    @ApiProperty({ description: 'Users allowed to publish in this groupe' })
    allowedPublishers?: User[];

    // Documents partagés dans ce groupe
    @ManyToMany(() => Document, document => document.groupesPartage)
    @ApiProperty({ description: 'Documents shared in this groupe' })
    documents?: Document[];

    // Classe associée (si c'est un groupe de classe)
    @OneToOne(() => Class, classe => classe.groupePartage, { nullable: true })
    @ApiProperty({ description: 'Class associated with this groupe partage' })
    classe?: Class;

    // École associée (si c'est un groupe d'école)
    @OneToOne(() => Ecole, ecole => ecole.groupePartage, { nullable: true })
    @ApiProperty({ description: 'School associated with this groupe partage' })
    ecole?: Ecole;

    // Filière associée (si c'est un groupe de filière)
    @OneToOne(() => Filiere, filiere => filiere.groupePartage, { nullable: true })
    @ApiProperty({ description: 'Filiere associated with this groupe partage' })
    filiere?: Filiere;

    // Matière associée (si c'est un groupe de matière)
    @OneToOne(() => Matiere, matiere => matiere.groupePartage, { nullable: true })
    @ApiProperty({ description: 'Matiere associated with this groupe partage' })
    matiere?: Matiere;

    // Token d'invitation pour rejoindre le groupe
    @Column({ nullable: true })
    @ApiProperty({ description: 'Invitation token to join the groupe' })
    invitationToken?: string;

    // Date d'expiration du token d'invitation
    @Column({ type: 'timestamp', nullable: true })
    @ApiProperty({ description: 'Expiration date of the invitation token' })
    invitationExpiresAt?: Date;

    @Column({ default: true })
    @ApiProperty({ description: 'Indicates if the groupe partage is active' })
    isActive!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt!: Date;

    @OneToMany(() => Notification, notification => notification.groupePartage)
    notifications!: Notification[];

}
