import { EventEmitter } from 'events';

export enum AsyncJobType {
    USER_JOINED_CLASS = 'user.joined_class',
    MATIERE_CREATED = 'matiere.created',
    SYNC_CLASS_MATIERES = 'class.sync_matieres',
    DOCUMENT_CREATED = 'document.created',
    DOCUMENT_UPDATED = 'document.updated',
    DOCUMENT_DELETED = 'document.deleted'
}

export class AsyncJobService {
    private static instance: AsyncJobService;
    private eventEmitter: EventEmitter;

    private constructor() {
        this.eventEmitter = new EventEmitter();
    }

    public static getInstance(): AsyncJobService {
        if (!AsyncJobService.instance) {
            AsyncJobService.instance = new AsyncJobService();
        }
        return AsyncJobService.instance;
    }

    public on(jobType: AsyncJobType, handler: (data: any) => Promise<void>) {
        this.eventEmitter.on(jobType, handler);
    }

    public emit(jobType: AsyncJobType, data: any) {
        console.log(`[AsyncJob] Emitting job: ${jobType}`);
        this.eventEmitter.emit(jobType, data);
    }
}

export const asyncJobService = AsyncJobService.getInstance();
