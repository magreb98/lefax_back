import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity()
@Index(["userId"])
@Index(["timestamp"])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @Column()
    userName!: string;

    @Column({ nullable: true })
    userEmail?: string;

    @Column()
    action!: string; // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'

    @Column()
    resource!: string; // 'User', 'Document', 'School', etc.

    @Column({ nullable: true })
    resourceId?: string;

    @Column("simple-json", { nullable: true })
    details?: any;

    @Column()
    ip!: string;

    @Column({ nullable: true })
    userAgent?: string;

    @CreateDateColumn()
    timestamp!: Date;
}
