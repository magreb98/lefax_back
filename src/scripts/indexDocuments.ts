import { AppDataSource } from "../config/database";
import { Document } from "../entity/document";
import { openSearchService } from "../services/OpenSearchService";

async function indexAllDocuments() {
    try {
        console.log('[Migration] Initialisation de la connexion à la base de données...');
        await AppDataSource.initialize();

        console.log('[Migration] Initialisation de l\'index OpenSearch...');
        await openSearchService.initializeIndex();

        const documentRepository = AppDataSource.getRepository(Document);
        console.log('[Migration] Récupération des documents...');
        const documents = await documentRepository.find({
            relations: [
                'categorie',
                'addedBy',
                'matiere',
                'matiere.classe',
                'matiere.classe.filiere',
                'matiere.classe.filiere.school',
                'groupesPartage'
            ]
        });

        console.log(`[Migration] ${documents.length} documents trouvés. Début de l'indexation...`);

        for (const doc of documents) {
            process.stdout.write(`Indexation du document: ${doc.documentName}... `);
            await openSearchService.indexDocument(doc);
            console.log('OK');
        }

        console.log('[Migration] Indexation terminée avec succès !');
    } catch (error) {
        console.error('[Migration] Erreur lors de l\'indexation globale:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

indexAllDocuments();
