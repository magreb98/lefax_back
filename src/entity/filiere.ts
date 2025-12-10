// filiere.ts
import { Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { PrimaryGeneratedColumn, Column } from "typeorm";
import { Ecole } from "./ecole";
import { Class } from "./classe";
import { GroupePartage } from "./groupe.partage";

@Entity()
export class Filiere {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    // Relation OneToOne avec GroupePartage (une filière = un groupe de partage)
    @OneToOne(() => GroupePartage, groupePartage => groupePartage.filiere, { cascade: true })
    @JoinColumn({ name: 'groupe_partage_id' })
    groupePartage!: GroupePartage;

    @ManyToOne(() => Ecole, ecole => ecole.filieres, { nullable: false })
    @JoinColumn({ name: 'ecole_id' })
    school!: Ecole;

    @OneToMany(() => Class, classe => classe.filiere)
    classes!: Class[];
}