import { EventEmitter } from 'events';

export enum AsyncJobType {
    MATIERE_CREATED = 'matiere.created',
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
