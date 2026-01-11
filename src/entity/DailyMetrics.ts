import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity()
@Index(["date"], { unique: true })
export class DailyMetrics {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'date' })
    date!: string; // YYYY-MM-DD

    // --- BUSINESS METRICS ---

    @Column({ default: 0 })
    totalUsers!: number;

    @Column({ default: 0 })
    totalSchools!: number;

    @Column({ default: 0 })
    activeUsers!: number; // Active in last 24h or 7d depending on logic

    @Column({ default: 0 })
    newUsers!: number; // Created today

    // --- TRAFFIC METRICS ---

    @Column({ default: 0 })
    totalRequests!: number;

    @Column({ type: 'float', default: 0 })
    avgLatency!: number;

    @Column({ default: 0 })
    maxRequestsPerMinute!: number;

    // --- RELIABILITY METRICS ---

    @Column({ type: 'float', default: 0 })
    errorRate!: number; // Percentage

    @Column("simple-json", { nullable: true })
    statusCodes?: { '2xx': number; '4xx': number; '5xx': number };

    // --- USAGE METRICS ---

    @Column("simple-json", { nullable: true })
    topEndpoints?: Array<{ endpoint: string; count: number }>;

    @CreateDateColumn()
    createdAt!: Date;
}
