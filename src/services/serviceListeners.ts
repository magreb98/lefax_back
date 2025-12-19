import { asyncJobService, AsyncJobType } from './AsyncJobService';
import { GroupePartageService } from './GroupePartageService';

/**
 * Registers all background job listeners.
 * Using a separate file breaks circular dependencies between services and the job bus.
 */
export const registerServiceListeners = () => {
    const groupePartageService = new GroupePartageService();

    // Job: Enroll User in Class Hierarchy
    asyncJobService.on(AsyncJobType.USER_JOINED_CLASS, async (data: { userId: string, classeId: string }) => {
        try {
            console.log(`[AsyncJob] Starting enrollment for user ${data.userId} in class ${data.classeId}`);
            await groupePartageService.enrollUserInClassHierarchy(data.userId, data.classeId);
            console.log(`[AsyncJob] Finished enrollment for user ${data.userId}`);
        } catch (error) {
            console.error(`[AsyncJob] Error in USER_JOINED_CLASS:`, error);
        }
    });

    // Job: Sync Class Matieres (enroll all students in a new Matiere group)
    asyncJobService.on(AsyncJobType.SYNC_CLASS_MATIERES, async (data: { matiereId: string, classeId: string }) => {
        try {
            console.log(`[AsyncJob] Starting sync for matiere ${data.matiereId} in class ${data.classeId}`);
            await groupePartageService.enrollStudentsInMatiereGroupe(data.matiereId, data.classeId);
            console.log(`[AsyncJob] Finished sync for matiere ${data.matiereId}`);
        } catch (error) {
            console.error(`[AsyncJob] Error in SYNC_CLASS_MATIERES:`, error);
        }
    });

    // --- OpenSearch Indexing ---
    const { openSearchService } = require('./OpenSearchService');
    const { DocumentService } = require('./DocumentService');
    const documentService = new DocumentService();

    // Job: Index Document on Creation
    asyncJobService.on(AsyncJobType.DOCUMENT_CREATED, async (data: { documentId: string }) => {
        try {
            console.log(`[AsyncJob] Indexing document ${data.documentId} in OpenSearch`);
            const document = await documentService.getDocumentById(data.documentId);
            if (document) {
                await openSearchService.indexDocument(document);
            }
        } catch (error) {
            console.error(`[AsyncJob] Error in DOCUMENT_CREATED indexing:`, error);
        }
    });

    // Job: Update Document in Index
    asyncJobService.on(AsyncJobType.DOCUMENT_UPDATED, async (data: { documentId: string }) => {
        try {
            console.log(`[AsyncJob] Updating document ${data.documentId} in OpenSearch`);
            const document = await documentService.getDocumentById(data.documentId);
            if (document) {
                await openSearchService.indexDocument(document);
            }
        } catch (error) {
            console.error(`[AsyncJob] Error in DOCUMENT_UPDATED indexing:`, error);
        }
    });

    // Job: Delete Document from Index
    asyncJobService.on(AsyncJobType.DOCUMENT_DELETED, async (data: { documentId: string }) => {
        try {
            console.log(`[AsyncJob] Deleting document ${data.documentId} from OpenSearch`);
            await openSearchService.deleteDocument(data.documentId);
        } catch (error) {
            console.error(`[AsyncJob] Error in DOCUMENT_DELETED indexing:`, error);
        }
    });

    console.log('✅ Async job listeners registered.');
};
