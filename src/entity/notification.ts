import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GroupePartage } from "./groupe.partage";

enum NotificationType {

    NEW_DOCUMENT = "NEW_DOCUMENT",
    DOCUMENT_UPDATED = "DOCUMENT_UPDATED",
    DOCUMENT_DELETED = "DOCUMENT_DELETED",
    NEW_USER = "NEW_USER",
    USER_SUSPENDED = "USER_SUSPENDED"
}

@Entity()
export class Notification {
    
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        type: "enum",
        default: NotificationType.NEW_DOCUMENT,
        enum: NotificationType
    })
    type!: NotificationType;

    @Column()
    message!: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    sharedAt!: Date;

    @ManyToOne(() => GroupePartage, groupe => groupe.notifications)
    groupePartage!: GroupePartage;
}