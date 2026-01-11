import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity()
@Index(["type"])
@Index(["timestamp"])
@Index(["severity"])
export class SecurityEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    type!: string; // 'LOGIN_FAILURE', 'BRUTE_FORCE', 'SUSPICIOUS_IP'

    @Column({
        type: 'enum',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW'
    })
    severity!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

    @Column({ nullable: true })
    userEmail?: string;

    @Column("simple-json", { nullable: true })
    details?: any;

    @Column()
    ip!: string;

    @Column({ nullable: true })
    userAgent?: string;

    @CreateDateColumn()
    timestamp!: Date;

    @Column({ default: false })
    resolved!: boolean;
}
