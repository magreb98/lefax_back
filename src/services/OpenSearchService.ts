import { Client } from '@opensearch-project/opensearch';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

export class OpenSearchService {
    private client: Client;
    private indexName: string = process.env.OPENSEARCH_INDEX_DOCUMENTS || 'lefax-documents';
    private pipelineName: string = 'attachment-pipeline';

    constructor() {
        this.client = new Client({
            node: process.env.OPENSEARCH_NODE || 'https://localhost:9200',
            auth: {
                username: process.env.OPENSEARCH_USERNAME || 'admin',
                password: process.env.OPENSEARCH_PASSWORD || 'admin',
            },
            ssl: {
                rejectUnauthorized: process.env.OPENSEARCH_SSL_REJECT_UNAUTHORIZED === 'true',
            },
        });
    }

    /**
     * Configurer le pipeline d'ingestion pour les pièces jointes (nécessite le plugin ingest-attachment)
     */
    private async setupIngestPipeline() {
        try {
            await this.client.ingest.putPipeline({
                id: this.pipelineName,
                body: {
                    description: "Extract text from base64 documents",
                    processors: [
                        {
                            attachment: {
                                field: "data",
                                target_field: "attachment",
                                ignore_missing: true
                            }
                        },
                        {
                            set: {
                                field: "content",
                                value: "{{attachment.content}}",
                                ignore_empty_value: true
                            }
                        },
                        {
                            remove: {
                                field: "data",
                                ignore_missing: true
                            }
                        }
                    ]
                } as any
            });
            console.log(`[OpenSearch] Pipeline ${this.pipelineName} configuré`);
        } catch (error) {
            console.error('[OpenSearch] Erreur lors de la configuration du pipeline:', error);
        }
    }

    /**
     * Créer l'index s'il n'existe pas
     */
    async initializeIndex() {
        const exists = await this.client.indices.exists({ index: this.indexName });

        // Configuration du pipeline avant l'indexation
        await this.setupIngestPipeline();

        if (!exists.body) {
            await this.client.indices.create({
                index: this.indexName,
                body: {
                    mappings: {
                        properties: {
                            id: { type: 'keyword' },
                            documentName: { type: 'text', analyzer: 'french' },
                            description: { type: 'text', analyzer: 'french' },
                            content: { type: 'text', analyzer: 'french' },
                            fileType: { type: 'keyword' },
                            groupePartageIds: { type: 'keyword' },
                            createdAt: { type: 'date' },
                            addedBy: {
                                properties: {
                                    firstName: { type: 'text' },
                                    lastName: { type: 'text' }
                                }
                            },
                            authorName: { type: 'keyword' },
                            schoolName: { type: 'keyword' },
                            filiereName: { type: 'keyword' },
                            className: { type: 'keyword' },
                            groupName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                            categoryName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                            publicationYear: { type: 'keyword' },
                            suggest_name: { type: 'completion' }
                        },
                    },
                },
            });
            console.log(`[OpenSearch] Index ${this.indexName} créé`);
        }
    }

    /**
     * Supprimer l'index complet (Action destructive)
     */
    async deleteIndex() {
        try {
            const exists = await this.client.indices.exists({ index: this.indexName });
            if (exists.body) {
                await this.client.indices.delete({ index: this.indexName });
                console.log(`[OpenSearch] Index ${this.indexName} supprimé`);
            }
        } catch (error) {
            console.error('[OpenSearch] Erreur lors de la suppression de l\'index:', error);
        }
    }

    /**
     * Indexer ou mettre à jour un document
     */
    async indexDocument(document: any) {
        try {
            const authorName = `${document.addedBy?.firstName} ${document.addedBy?.lastName}`;
            const categoryName = document.categorie?.categorieName || 'N/A';
            const schoolName = document.matiere?.classe?.filiere?.school?.name || 'N/A';
            const filiereName = document.matiere?.classe?.filiere?.name || 'N/A';
            const className = document.matiere?.classe?.className || 'N/A';
            const publicationYear = document.createdAt ? new Date(document.createdAt).getFullYear().toString() : 'N/A';
            const groupName = document.groupesPartage?.[0]?.groupeName || 'N/A';

            let documentToIndex: any = {
                id: document.id,
                documentName: document.documentName,
                description: document.description,
                fileType: document.fileType,
                groupePartageIds: document.groupesPartage?.map((g: any) => g.id) || [],
                createdAt: document.createdAt,
                addedBy: {
                    firstName: document.addedBy?.firstName,
                    lastName: document.addedBy?.lastName
                },
                authorName,
                schoolName,
                filiereName,
                className,
                groupName,
                categoryName,
                publicationYear,
                suggest_name: [
                    { input: document.documentName, weight: 10 },
                    { input: authorName, weight: 5 },
                    { input: categoryName, weight: 3 }
                ]
            };

            // Essayer d'indexer le contenu du fichier si disponible (Phase 3)
            if (document.documentUrl) {
                try {
                    // documentUrl est déjà relatif à "src/" normalement, ou contient le chemin complet
                    // On vérifie le chemin
                    const filePath = path.join(process.cwd(), 'src', document.documentUrl.replace(/^\/?src\//, ''));
                    if (fs.existsSync(filePath)) {
                        const fileBuffer = fs.readFileSync(filePath);
                        documentToIndex.data = fileBuffer.toString('base64');
                    }
                } catch (err) {
                    console.warn(`[OpenSearch] Impossible de lire le fichier pour indexation du contenu: ${document.documentUrl}`);
                }
            }

            await this.client.index({
                index: this.indexName,
                id: document.id,
                body: documentToIndex,
                pipeline: documentToIndex.data ? this.pipelineName : undefined,
                refresh: true,
            });
        } catch (error) {
            console.error('[OpenSearch] Erreur lors de l\'indexation:', error);
        }
    }

    /**
     * Supprimer un document
     */
    async deleteDocument(documentId: string) {
        try {
            await this.client.delete({
                index: this.indexName,
                id: documentId,
                refresh: true,
            });
        } catch (error) {
            console.error('[OpenSearch] Erreur lors de la suppression:', error);
        }
    }

    /**
     * Rechercher des documents avec RBACp
     */
    async search(params: {
        query: string;
        accessibleGroupeIds: string[];
        fileType?: string;
        userSchool?: string;
        from?: number;
        size?: number;
    }) {
        const { query, accessibleGroupeIds, fileType, userSchool, from = 0, size = 10 } = params;

        const body: any = {
            from,
            size,
            query: {
                function_score: {
                    query: {
                        bool: {
                            must: [
                                {
                                    multi_match: {
                                        query,
                                        fields: ['documentName^5', 'description^2', 'content', 'groupName^2', 'categoryName^2', 'publicationYear'],
                                        fuzziness: 'AUTO',
                                    },
                                },
                            ],
                        },
                    },
                    functions: [
                        // Boost si l'école de l'utilisateur correspond (pertinence locale)
                        ...(userSchool ? [{
                            filter: { term: { "schoolName": userSchool } },
                            weight: 2
                        }] : []),
                        // Boost pour la fraîcheur (documents plus récents)
                        {
                            gauss: {
                                createdAt: {
                                    origin: "now",
                                    scale: "30d",
                                    offset: "7d",
                                    decay: 0.5
                                }
                            }
                        }
                    ],
                    score_mode: "multiply",
                    boost_mode: "multiply"
                }
            },
            aggs: {
                schools: { terms: { field: "schoolName" } },
                filieres: { terms: { field: "filiereName" } },
                categories: { terms: { field: "categoryName.keyword" } },
                fileTypes: { terms: { field: "fileType" } }
            },
            highlight: {
                fields: {
                    documentName: {},
                    description: {},
                    content: {}
                },
            },
        };

        // Appliquer le filtre de groupes si fourni (sauf pour SUPERADMIN)
        if (accessibleGroupeIds && accessibleGroupeIds.length > 0) {
            body.query.function_score.query.bool.must.push({
                terms: {
                    groupePartageIds: accessibleGroupeIds,
                },
            });
        }

        if (fileType) {
            if (!body.query.function_score.query.bool.filter) {
                body.query.function_score.query.bool.filter = [];
            }
            body.query.function_score.query.bool.filter.push({ term: { fileType } });
        }

        try {
            const response = await this.client.search({
                index: this.indexName,
                body,
            });

            return {
                total: (response.body.hits.total as any).value,
                hits: response.body.hits.hits.map((hit: any) => ({
                    ...hit._source,
                    highlight: hit.highlight,
                    score: hit._score,
                })),
                aggregations: response.body.aggregations
            };
        } catch (error) {
            console.error('[OpenSearch] Erreur lors de la recherche:', error);
            throw error;
        }
    }

    /**
     * Obtenir des suggestions d'auto-complétion
     */
    async getSuggestions(query: string) {
        try {
            const response = await this.client.search({
                index: this.indexName,
                body: {
                    suggest: {
                        "name-suggestion": {
                            prefix: query,
                            completion: {
                                field: "suggest_name",
                                size: 10,
                                fuzzy: {
                                    fuzziness: "AUTO"
                                }
                            }
                        }
                    }
                }
            });

            const options = (response.body.suggest?.["name-suggestion"]?.[0]?.options || []) as any[];
            return options.map((opt: any) => ({
                text: opt.text,
                score: opt._score
            }));
        } catch (error) {
            console.error('[OpenSearch] Erreur lors des suggestions:', error);
            return [];
        }
    }
}

export const openSearchService = new OpenSearchService();
