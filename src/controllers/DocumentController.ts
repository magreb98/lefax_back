
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DocumentService } from '../services/DocumentService';
import { canUserPublishToGroups } from '../middleware/groupAuth';

export class DocumentController {
    private documentService = new DocumentService();
    private uploadDir = 'src/uploads/';

    constructor() {
        // Créer le dossier uploads s'il n'existe pas
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Uploader un document
     * L'utilisateur authentifié est automatiquement défini comme addedBy
     * Vérifie les permissions de publication pour chaque groupe ciblé
     */
    async uploadDocument(req: any, res: any): Promise<void> {
        try {
            // Vérifier que l'utilisateur est authentifié
            if (!req.user || !req.userId) {
                // Supprimer le fichier si déjà uploadé
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(401).json({
                    message: 'Utilisateur non authentifié',
                    error: 'NOT_AUTHENTICATED'
                });
            }

            // Extraire les informations du corps de la requête
            const { documentName, description, categorieId, matiereId, groupePartageIds, isdownloadable } = req.body;
            const filePath = req.file ? req.file.path : null;

            if (!filePath) {
                return res.status(400).json({ message: 'Aucun fichier téléchargé' });
            }

            // Validation des champs requis
            if (!documentName) {
                fs.unlinkSync(filePath);
                return res.status(400).json({
                    message: 'Le champ documentName est requis'
                });
            }

            // Parser les IDs des groupes de partage si fournis
            let parsedGroupePartageIds: string[] | undefined;
            if (groupePartageIds) {
                parsedGroupePartageIds = typeof groupePartageIds === 'string'
                    ? JSON.parse(groupePartageIds)
                    : groupePartageIds;
            }

            // ✅ Vérifier les permissions de publication pour chaque groupe ciblé
            if (parsedGroupePartageIds && parsedGroupePartageIds.length > 0) {
                const publishCheck = await canUserPublishToGroups(req.user, parsedGroupePartageIds);

                if (!publishCheck.canPublish) {
                    // Supprimer le fichier uploadé
                    fs.unlinkSync(filePath);
                    return res.status(403).json({
                        message: publishCheck.reason || 'Vous n\'êtes pas autorisé à publier dans ces groupes',
                        error: 'NOT_AUTHORIZED_TO_PUBLISH',
                        deniedGroups: publishCheck.deniedGroups
                    });
                }
            }

            // Créer le document via le service
            // addedById est automatiquement l'utilisateur connecté
            const newDocument = await this.documentService.createDocument({
                documentName,
                description,
                documentUrl: filePath,
                fileSize: req.file.size,
                fileType: req.file.mimetype,
                categorieId,
                addedById: req.userId,
                matiereId,
                groupePartageIds: parsedGroupePartageIds,
                isdownloadable: isdownloadable === 'true' || isdownloadable === true
            });

            res.status(201).json({
                message: 'Document créé avec succès',
                document: newDocument,
                addedBy: {
                    id: req.user.id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName
                }
            });
        } catch (error: any) {
            // En cas d'erreur, supprimer le fichier uploadé
            if (req.file && req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Erreur lors de l\'upload du document :', error);
            res.status(400).json({
                message: 'Erreur lors de la création du document',
                error: error.message
            });
        }
    }

    /**
     * Uploader plusieurs documents
     * L'utilisateur authentifié est automatiquement défini comme addedBy
     */
    async uploadMultipleDocuments(req: any, res: any): Promise<void> {
        try {
            // Vérifier que l'utilisateur est authentifié
            if (!req.user || !req.userId) {
                // Supprimer les fichiers si déjà uploadés
                if (req.files && Array.isArray(req.files)) {
                    req.files.forEach((file: Express.Multer.File) => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
                return res.status(401).json({
                    message: 'Utilisateur non authentifié',
                    error: 'NOT_AUTHENTICATED'
                });
            }

            const { categorieId, matiereId, groupePartageIds, isdownloadable } = req.body;
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                return res.status(400).json({ message: 'Aucun fichier téléchargé' });
            }

            if (!categorieId) {
                // Supprimer tous les fichiers uploadés
                files.forEach(file => fs.unlinkSync(file.path));
                return res.status(400).json({
                    message: 'Le champ categorieId est requis'
                });
            }

            // Parser les IDs des groupes de partage
            let parsedGroupePartageIds: string[] | undefined;
            if (groupePartageIds) {
                parsedGroupePartageIds = typeof groupePartageIds === 'string'
                    ? JSON.parse(groupePartageIds)
                    : groupePartageIds;
            }

            // ✅ Vérifier les permissions de publication pour chaque groupe ciblé
            if (parsedGroupePartageIds && parsedGroupePartageIds.length > 0) {
                const publishCheck = await canUserPublishToGroups(req.user, parsedGroupePartageIds);

                if (!publishCheck.canPublish) {
                    // Supprimer tous les fichiers uploadés
                    files.forEach(file => fs.unlinkSync(file.path));
                    return res.status(403).json({
                        message: publishCheck.reason || 'Vous n\'êtes pas autorisé à publier dans ces groupes',
                        error: 'NOT_AUTHORIZED_TO_PUBLISH',
                        deniedGroups: publishCheck.deniedGroups
                    });
                }
            }

            const createdDocuments = [];
            const errors = [];
            for (const file of files) {
                try {
                    const document = await this.documentService.createDocument({
                        documentName: file.originalname,
                        documentUrl: file.path,
                        fileSize: file.size,
                        fileType: file.mimetype,
                        categorieId,
                        addedById: req.userId, // ✨ Utilisateur authentifié
                        matiereId,
                        groupePartageIds: parsedGroupePartageIds,
                        isdownloadable: isdownloadable === 'true' || isdownloadable === true
                    });

                    createdDocuments.push(document);
                } catch (error: any) {
                    // En cas d'erreur, supprimer le fichier
                    fs.unlinkSync(file.path);
                    errors.push({
                        fileName: file.originalname,
                        error: error.message
                    });
                }
            }

            res.status(201).json({
                message: `${createdDocuments.length} document(s) créé(s) avec succès`,
                documents: createdDocuments,
                errors: errors.length > 0 ? errors : undefined,
                addedBy: {
                    id: req.user.id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName
                }
            });
        } catch (error: any) {
            // En cas d'erreur globale, supprimer tous les fichiers uploadés
            if (req.files) {
                (req.files as Express.Multer.File[]).forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }
            console.error('Erreur lors de l\'upload des documents :', error);
            res.status(400).json({
                message: 'Erreur lors de la création des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupérer tous les documents avec filtres optionnels
     */
    async getDocuments(req: any, res: any): Promise<void> {
        try {
            const { categorieId, matiereId, addedById, groupePartageId } = req.query;

            const documents = await this.documentService.getAllDocuments({
                categorieId,
                matiereId,
                addedById,
                groupePartageId
            });

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents :', error);
            res.status(500).json({
                message: 'Erreur serveur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupérer un document par son ID
     */
    async getDocumentById(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const document = await this.documentService.getDocumentById(id);

            if (!document) {
                return res.status(404).json({ message: 'Document non trouvé' });
            }

            // Incrémenter le compteur de vues
            await this.documentService.incrementViewCount(id);

            res.status(200).json({ document });
        } catch (error: any) {
            console.error('Erreur lors de la récupération du document :', error);
            res.status(500).json({
                message: 'Erreur serveur lors de la récupération du document',
                error: error.message
            });
        }
    }

    /**
     * Mettre à jour un document
     */
    async updateDocument(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const { documentName, description, categorieId, matiereId, groupePartageIds, isdownloadable } = req.body;

            // Parser les IDs des groupes de partage si fournis
            let parsedGroupePartageIds: string[] | undefined;
            if (groupePartageIds !== undefined) {
                parsedGroupePartageIds = typeof groupePartageIds === 'string'
                    ? JSON.parse(groupePartageIds)
                    : groupePartageIds;
            }

            const document = await this.documentService.updateDocument(id, {
                documentName,
                description,
                categorieId,
                matiereId: matiereId === 'null' ? null : matiereId,
                groupePartageIds: parsedGroupePartageIds,
                isdownloadable
            });

            res.status(200).json({
                message: 'Document mis à jour avec succès',
                document
            });
        } catch (error: any) {
            console.error('Erreur lors de la mise à jour du document :', error);
            res.status(400).json({
                message: 'Erreur lors de la mise à jour du document',
                error: error.message
            });
        }
    }

    /**
     * Supprimer un document
     */
    async deleteDocument(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            await this.documentService.deleteDocument(id);

            res.status(200).json({ message: 'Document supprimé avec succès' });
        } catch (error: any) {
            console.error('Erreur lors de la suppression du document :', error);
            res.status(400).json({
                message: 'Erreur lors de la suppression du document',
                error: error.message
            });
        }
    }

    /**
     * Supprimer plusieurs documents
     */
    async deleteMultipleDocuments(req: any, res: any): Promise<void> {
        try {
            const { documentIds } = req.body;

            if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
                return res.status(400).json({
                    message: 'Le champ documentIds (array) est requis et ne peut pas être vide'
                });
            }

            const deletedCount = [];
            const errors = [];

            for (const id of documentIds) {
                try {
                    await this.documentService.deleteDocument(id);
                    deletedCount.push(id);
                } catch (error: any) {
                    errors.push({
                        documentId: id,
                        error: error.message
                    });
                }
            }

            res.status(200).json({
                message: `${deletedCount.length} document(s) supprimé(s) avec succès`,
                deletedCount: deletedCount.length,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error: any) {
            console.error('Erreur lors de la suppression des documents :', error);
            res.status(500).json({
                message: 'Erreur serveur lors de la suppression des documents',
                error: error.message
            });
        }
    }

    /**
     * Vérifier si un utilisateur a accès à un document
     * (appartient à au moins un groupe du document ou est admin)
     */
    private async userHasDocumentAccess(user: any, document: any): Promise<boolean> {
        // Les admins et superadmins ont toujours accès
        if (user.role === 'admin' || user.role === 'superadmin') {
            return true;
        }

        // Si le document n'a pas de groupes, accès refusé
        if (!document.groupesPartage || document.groupesPartage.length === 0) {
            return false;
        }

        const documentGroupIds = document.groupesPartage.map((g: any) => g.id);

        // Récupérer tous les groupes de l'utilisateur
        const userGroupIds: string[] = [];

        // Groupes directs
        if (user.groupesPartage) {
            user.groupesPartage.forEach((g: any) => userGroupIds.push(g.id));
        }

        // Groupe de la classe
        if (user.classe?.groupePartage) {
            userGroupIds.push(user.classe.groupePartage.id);
        }

        // Groupe de l'école
        if (user.school?.groupePartage) {
            userGroupIds.push(user.school.groupePartage.id);
        }

        // Vérifier l'intersection
        return documentGroupIds.some((gId: string) => userGroupIds.includes(gId));
    }

    /**
     * Télécharger un document
     * Vérifie que l'utilisateur appartient à au moins un groupe du document
     */
    async downloadDocument(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const document = await this.documentService.getDocumentById(id);

            if (!document) {
                return res.status(404).json({ message: 'Document non trouvé' });
            }

            if (!document.isdownloadable) {
                return res.status(403).json({ message: 'Ce document n\'est pas téléchargeable' });
            }

            // Vérifier que l'utilisateur a accès au document
            if (!req.user) {
                return res.status(401).json({ message: 'Utilisateur non authentifié' });
            }

            const hasAccess = await this.userHasDocumentAccess(req.user, document);
            if (!hasAccess) {
                return res.status(403).json({
                    message: 'Vous n\'avez pas accès à ce document',
                    error: 'ACCESS_DENIED'
                });
            }

            if (!fs.existsSync(document.documentUrl)) {
                return res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
            }

            // Incrémenter le compteur de téléchargements
            await this.documentService.incrementDownloadCount(id);

            // Envoyer le fichier
            res.download(document.documentUrl, document.documentName);
        } catch (error: any) {
            console.error('Erreur lors du téléchargement du document :', error);
            res.status(500).json({
                message: 'Erreur serveur lors du téléchargement du document',
                error: error.message
            });
        }
    }

    /**
     * Visualiser un document dans le navigateur
     * Vérifie que l'utilisateur appartient à au moins un groupe du document
     */
    async viewDocument(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const document = await this.documentService.getDocumentById(id);

            if (!document) {
                return res.status(404).json({ message: 'Document non trouvé' });
            }

            // Vérifier que l'utilisateur a accès au document
            if (!req.user) {
                return res.status(401).json({ message: 'Utilisateur non authentifié' });
            }

            const hasAccess = await this.userHasDocumentAccess(req.user, document);
            if (!hasAccess) {
                return res.status(403).json({
                    message: 'Vous n\'avez pas accès à ce document',
                    error: 'ACCESS_DENIED'
                });
            }

            if (!fs.existsSync(document.documentUrl)) {
                return res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
            }

            // Incrémenter le compteur de vues
            await this.documentService.incrementViewCount(id);

            // Déterminer le type MIME
            const mimeType = document.fileType || 'application/octet-stream';

            // Envoyer le fichier avec Content-Disposition: inline pour l'affichage dans le navigateur
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.documentName)}"`);

            const fileStream = fs.createReadStream(document.documentUrl);
            fileStream.pipe(res);
        } catch (error: any) {
            console.error('Erreur lors de la visualisation du document :', error);
            res.status(500).json({
                message: 'Erreur serveur lors de la visualisation du document',
                error: error.message
            });
        }
    }

    /**
     * Ajouter un document à un groupe de partage
     */
    async addDocumentToGroupe(req: any, res: any): Promise<void> {
        try {
            const { documentId, groupeId } = req.body;

            if (!documentId || !groupeId) {
                return res.status(400).json({
                    message: 'Les champs documentId et groupeId sont requis'
                });
            }

            const document = await this.documentService.addDocumentToGroupe(documentId, groupeId);

            res.status(200).json({
                message: 'Document ajouté au groupe avec succès',
                document
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout du document au groupe :', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout du document au groupe',
                error: error.message
            });
        }
    }

    /**
     * Ajouter un document à plusieurs groupes de partage
     */
    async addDocumentToGroupes(req: any, res: any): Promise<void> {
        try {
            const { documentId, groupeIds } = req.body;

            if (!documentId || !groupeIds || !Array.isArray(groupeIds)) {
                return res.status(400).json({
                    message: 'Les champs documentId et groupeIds (array) sont requis'
                });
            }

            const document = await this.documentService.addDocumentToGroupes(documentId, groupeIds);

            res.status(200).json({
                message: 'Document ajouté aux groupes avec succès',
                document
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout du document aux groupes :', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout du document aux groupes',
                error: error.message
            });
        }
    }

    /**
     * Ajouter plusieurs documents à un groupe de partage
     */
    async addMultipleDocumentsToGroupe(req: any, res: any): Promise<void> {
        try {
            const { documentIds, groupeId } = req.body;

            if (!documentIds || !Array.isArray(documentIds) || !groupeId) {
                return res.status(400).json({
                    message: 'Les champs documentIds (array) et groupeId sont requis'
                });
            }

            const results = [];
            const errors = [];

            for (const documentId of documentIds) {
                try {
                    const document = await this.documentService.addDocumentToGroupe(documentId, groupeId);
                    results.push(document);
                } catch (error: any) {
                    errors.push({
                        documentId,
                        error: error.message
                    });
                }
            }

            res.status(200).json({
                message: `${results.length} document(s) ajouté(s) au groupe avec succès`,
                documents: results,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout des documents au groupe :', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout des documents au groupe',
                error: error.message
            });
        }
    }

    /**
     * Ajouter plusieurs documents à plusieurs groupes de partage
     */
    async addMultipleDocumentsToGroupes(req: any, res: any): Promise<void> {
        try {
            const { documentIds, groupeIds } = req.body;

            if (!documentIds || !Array.isArray(documentIds) || !groupeIds || !Array.isArray(groupeIds)) {
                return res.status(400).json({
                    message: 'Les champs documentIds (array) et groupeIds (array) sont requis'
                });
            }

            const results = [];
            const errors = [];

            for (const documentId of documentIds) {
                try {
                    const document = await this.documentService.addDocumentToGroupes(documentId, groupeIds);
                    results.push(document);
                } catch (error: any) {
                    errors.push({
                        documentId,
                        error: error.message
                    });
                }
            }

            res.status(200).json({
                message: `${results.length} document(s) ajouté(s) aux groupes avec succès`,
                documents: results,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'ajout des documents aux groupes :', error);
            res.status(400).json({
                message: 'Erreur lors de l\'ajout des documents aux groupes',
                error: error.message
            });
        }
    }

    /**
     * Retirer un document d'un groupe de partage
     */
    async removeDocumentFromGroupe(req: any, res: any): Promise<void> {
        try {
            const { documentId, groupeId } = req.body;

            if (!documentId || !groupeId) {
                return res.status(400).json({
                    message: 'Les champs documentId et groupeId sont requis'
                });
            }

            const document = await this.documentService.removeDocumentFromGroupe(documentId, groupeId);

            res.status(200).json({
                message: 'Document retiré du groupe avec succès',
                document
            });
        } catch (error: any) {
            console.error('Erreur lors du retrait du document du groupe :', error);
            res.status(400).json({
                message: 'Erreur lors du retrait du document du groupe',
                error: error.message
            });
        }
    }

    /**
     * Retirer plusieurs documents d'un groupe de partage
     */
    async removeMultipleDocumentsFromGroupe(req: any, res: any): Promise<void> {
        try {
            const { documentIds, groupeId } = req.body;

            if (!documentIds || !Array.isArray(documentIds) || !groupeId) {
                return res.status(400).json({
                    message: 'Les champs documentIds (array) et groupeId sont requis'
                });
            }

            const results = [];
            const errors = [];

            for (const documentId of documentIds) {
                try {
                    const document = await this.documentService.removeDocumentFromGroupe(documentId, groupeId);
                    results.push(document);
                } catch (error: any) {
                    errors.push({
                        documentId,
                        error: error.message
                    });
                }
            }

            res.status(200).json({
                message: `${results.length} document(s) retiré(s) du groupe avec succès`,
                documents: results,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error: any) {
            console.error('Erreur lors du retrait des documents du groupe :', error);
            res.status(400).json({
                message: 'Erreur lors du retrait des documents du groupe',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les documents accessibles par un utilisateur
     */
    async getDocumentsByUser(req: any, res: any): Promise<void> {
        try {
            const { userId } = req.params;

            const documents = await this.documentService.getDocumentsByUser(userId);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents de l\'utilisateur :', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les documents d'un groupe de partage
     */
    async getDocumentsByGroupe(req: any, res: any): Promise<void> {
        try {
            const { groupeId } = req.params;

            const documents = await this.documentService.getDocumentsByGroupe(groupeId);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents du groupe :', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les documents d'une matière
     */
    async getDocumentsByMatiere(req: any, res: any): Promise<void> {
        try {
            const { matiereId } = req.params;

            const documents = await this.documentService.getDocumentsByMatiere(matiereId);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents de la matière :', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les documents d'une catégorie
     */
    async getDocumentsByCategorie(req: any, res: any): Promise<void> {
        try {
            const { categorieId } = req.params;

            const documents = await this.documentService.getDocumentsByCategorie(categorieId);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents de la catégorie :', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Rechercher des documents
     */
    async searchDocuments(req: any, res: any): Promise<void> {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    message: 'Le paramètre de recherche "q" est requis'
                });
            }

            const documents = await this.documentService.searchDocuments(q as string);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la recherche de documents :', error);
            res.status(400).json({
                message: 'Erreur lors de la recherche',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les documents les plus téléchargés
     */
    async getMostDownloadedDocuments(req: any, res: any): Promise<void> {
        try {
            const { limit } = req.query;
            const parsedLimit = limit ? parseInt(limit as string) : 10;

            const documents = await this.documentService.getMostDownloadedDocuments(parsedLimit);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents les plus téléchargés :', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les documents les plus vus
     */
    async getMostViewedDocuments(req: any, res: any): Promise<void> {
        try {
            const { limit } = req.query;
            const parsedLimit = limit ? parseInt(limit as string) : 10;

            const documents = await this.documentService.getMostViewedDocuments(parsedLimit);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents les plus vus :', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les documents récents
     */
    async getRecentDocuments(req: any, res: any): Promise<void> {
        try {
            const { limit } = req.query;
            const parsedLimit = limit ? parseInt(limit as string) : 10;

            const documents = await this.documentService.getRecentDocuments(parsedLimit);

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error: any) {
            console.error('Erreur lors de la récupération des documents récents :', error);
            res.status(400).json({
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }
}