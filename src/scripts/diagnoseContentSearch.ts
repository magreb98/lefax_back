import { openSearchService } from '../services/OpenSearchService';
import { AppDataSource } from '../config/database';
import { Document } from '../entity/document';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de diagnostic pour vérifier l'indexation du contenu des fichiers
 */
async function diagnoseContentSearch() {
    console.log('=== Diagnostic de la recherche par contenu ===\n');

    const results: any = {
        timestamp: new Date().toISOString(),
        checks: []
    };

    try {
        // 1. Vérifier la connexion à OpenSearch
        console.log('1. Vérification de la connexion à OpenSearch...');
        const client = (openSearchService as any).client;
        const health = await client.cluster.health();
        console.log('✅ Connexion OK - Status:', health.body.status);

        // 2. Vérifier si le pipeline existe
        console.log('\n2. Vérification du pipeline attachment-pipeline...');
        try {
            const pipeline = await client.ingest.getPipeline({ id: 'attachment-pipeline' });
            console.log('✅ Pipeline trouvé');
            console.log('Configuration:', JSON.stringify(pipeline.body, null, 2));
        } catch (error: any) {
            console.log('❌ Pipeline non trouvé:', error.message);
        }

        // 3. Vérifier les plugins installés
        console.log('\n3. Vérification des plugins installés...');
        try {
            const plugins = await client.cat.plugins({ format: 'json' });
            console.log('Plugins installés:', JSON.stringify(plugins.body, null, 2));
            const hasAttachmentPlugin = plugins.body.some((p: any) =>
                p.component && p.component.includes('ingest-attachment')
            );
            if (hasAttachmentPlugin) {
                console.log('✅ Plugin ingest-attachment trouvé');
            } else {
                console.log('❌ Plugin ingest-attachment NON trouvé');
                console.log('⚠️  Le plugin ingest-attachment est requis pour extraire le contenu des fichiers');
            }
        } catch (error: any) {
            console.log('❌ Erreur lors de la vérification des plugins:', error.message);
        }

        // 4. Vérifier l'index
        console.log('\n4. Vérification de l\'index lefax-documents...');
        const indexName = process.env.OPENSEARCH_INDEX_DOCUMENTS || 'lefax-documents';
        const indexExists = await client.indices.exists({ index: indexName });
        if (indexExists.body) {
            console.log('✅ Index trouvé');

            // Récupérer le mapping
            const mapping = await client.indices.getMapping({ index: indexName });
            console.log('Mapping du champ content:',
                JSON.stringify(mapping.body[indexName].mappings.properties.content, null, 2));
        } else {
            console.log('❌ Index non trouvé');
        }

        // 5. Chercher des documents avec du contenu
        console.log('\n5. Recherche de documents avec du contenu indexé...');
        const searchResult = await client.search({
            index: indexName,
            body: {
                size: 5,
                _source: ['documentName', 'fileType', 'content'],
                query: {
                    exists: { field: 'content' }
                }
            }
        });

        const docsWithContent = searchResult.body.hits.hits;
        console.log(`Trouvé ${docsWithContent.length} documents avec du contenu`);

        if (docsWithContent.length > 0) {
            console.log('\nExemples de documents avec contenu:');
            docsWithContent.forEach((hit: any, index: number) => {
                const contentPreview = hit._source.content
                    ? hit._source.content.substring(0, 100) + '...'
                    : 'VIDE';
                console.log(`  ${index + 1}. ${hit._source.documentName} (${hit._source.fileType})`);
                console.log(`     Contenu: ${contentPreview}`);
            });
        } else {
            console.log('❌ Aucun document avec du contenu trouvé');
            console.log('⚠️  Cela signifie que le contenu des fichiers n\'est pas extrait lors de l\'indexation');
        }

        // 6. Compter tous les documents
        console.log('\n6. Statistiques de l\'index...');
        const countResult = await client.count({ index: indexName });
        console.log(`Total de documents indexés: ${countResult.body.count}`);

        // 7. Tester une recherche par contenu
        console.log('\n7. Test de recherche par contenu (mot: "test")...');
        const contentSearchResult = await client.search({
            index: indexName,
            body: {
                size: 3,
                query: {
                    match: { content: 'test' }
                },
                highlight: {
                    fields: {
                        content: {
                            fragment_size: 150,
                            number_of_fragments: 1
                        }
                    }
                }
            }
        });

        console.log(`Résultats trouvés: ${contentSearchResult.body.hits.total.value}`);
        if (contentSearchResult.body.hits.hits.length > 0) {
            console.log('✅ La recherche par contenu fonctionne!');
            contentSearchResult.body.hits.hits.forEach((hit: any, index: number) => {
                console.log(`  ${index + 1}. ${hit._source.documentName}`);
                if (hit.highlight?.content) {
                    console.log(`     Extrait: ${hit.highlight.content[0]}`);
                }
            });
        } else {
            console.log('❌ Aucun résultat pour la recherche par contenu');
        }

        console.log('\n=== Fin du diagnostic ===');

    } catch (error) {
        console.error('Erreur lors du diagnostic:', error);
    }
}

// Initialiser la connexion à la base de données puis exécuter le diagnostic
AppDataSource.initialize()
    .then(async () => {
        await diagnoseContentSearch();
        await AppDataSource.destroy();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Erreur d\'initialisation:', error);
        process.exit(1);
    });
