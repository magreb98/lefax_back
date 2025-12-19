import { openSearchService } from "../services/OpenSearchService";

async function reset() {
    console.log("[Reset] Début du reset de l'index OpenSearch...");

    // 1. Supprimer l'index existant
    await openSearchService.deleteIndex();

    // 2. Recréer l'index avec le nouveau mapping
    await openSearchService.initializeIndex();

    console.log("[Reset] Index OpenSearch réinitialisé avec succès !");
    console.log("[Reset] Veuillez relancer 'npm run index-documents' pour re-peupler l'index.");
    process.exit(0);
}

reset().catch(err => {
    console.error("[Reset] Erreur fatale:", err);
    process.exit(1);
});
