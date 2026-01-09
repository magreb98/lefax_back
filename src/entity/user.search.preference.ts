import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user";
import { GroupePartage } from "./groupe.partage";

/**
 * Préférences de recherche d'un utilisateur
 * Définit quels groupes apparaissent dans ses résultats de recherche
 */
@Entity()
export class UserSearchPreference {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // Utilisateur concerné
    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    // Groupe de partage activé pour la recherche
    @ManyToOne(() => GroupePartage, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'groupe_partage_id' })
    groupePartage!: GroupePartage;

    // Indique si ce groupe est activé dans les résultats de recherche
    @Column({ default: true })
    isEnabled!: boolean;

    // Ordre d'affichage (pour prioriser certains groupes)
    @Column({ default: 0 })
    displayOrder!: number;

    // Indique si c'est une préférence par défaut (créée automatiquement)
    @Column({ default: false })
    isDefault!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
