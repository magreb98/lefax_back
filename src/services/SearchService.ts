import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entity/user";
import { openSearchService } from "./OpenSearchService";
import { DocumentService } from "./DocumentService";

export class SearchService {
    private userRepository = AppDataSource.getRepository(User);
    private documentService = new DocumentService();

    /**
     * Rechercher des documents avec filtrage par rôle/groupes
     */
    async searchDocuments(userId: string, query: string, filters?: { fileType?: string, from?: number, size?: number }) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: [
                'groupesPartage',
                'classe',
                'classe.groupePartage',
                'classe.filiere',
                'classe.filiere.groupePartage',
                'classe.filiere.school',
                'classe.filiere.school.groupePartage',
                'school',
                'school.groupePartage',
                'ecoles',
                'ecoles.groupePartage',
                'ecoles.filieres',
                'ecoles.filieres.groupePartage',
                'ecoles.filieres.classes',
                'ecoles.filieres.classes.groupePartage',
                'ecoles.filieres.classes.matieres',
                'ecoles.filieres.classes.matieres.groupePartage'
            ]
        });

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        let accessibleGroupeIds: string[] = [];

        if (user.role === UserRole.SUPERADMIN) {
            // Pour le SUPERADMIN, on pourrait soit ne pas filtrer, 
            // soit récupérer tous les IDs de groupes existants.
            // OpenSearch permet de faire des recherches sans filtre si on le souhaite.
            // Mais pour simplifier l'implémentation de OpenSearchService.search, 
            // on peut passer un flag ou une liste vide et modifier OpenSearchService.
            // Ici on va passer une liste vide pour signifier "pas de filtre" si on modifie OpenSearchService.
        } else {
            // Logique identique à DocumentService.getDocumentsByUser pour la cohérence
            const groupeIds: string[] = [];

            if (user.role === UserRole.ADMIN && user.ecoles) {
                user.ecoles.forEach(ecole => {
                    if (ecole.groupePartage) groupeIds.push(ecole.groupePartage.id);
                    if (ecole.filieres) {
                        ecole.filieres.forEach(filiere => {
                            if (filiere.groupePartage) groupeIds.push(filiere.groupePartage.id);
                            if (filiere.classes) {
                                filiere.classes.forEach(classe => {
                                    if (classe.groupePartage) groupeIds.push(classe.groupePartage.id);
                                    if (classe.matieres) {
                                        classe.matieres.forEach(matiere => {
                                            if (matiere.groupePartage) groupeIds.push(matiere.groupePartage.id);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }

            if (user.groupesPartage) user.groupesPartage.forEach(g => groupeIds.push(g.id));
            if (user.classe?.groupePartage) groupeIds.push(user.classe.groupePartage.id);
            if (user.school?.groupePartage) groupeIds.push(user.school.groupePartage.id);
            if (user.classe?.filiere?.groupePartage) groupeIds.push(user.classe.filiere.groupePartage.id);
            if (user.classe?.filiere?.school?.groupePartage) groupeIds.push(user.classe.filiere.school.groupePartage.id);

            const publicGroupe = await this.documentService.getOrCreatePublicGroupe();
            groupeIds.push(publicGroupe.id);

            accessibleGroupeIds = [...new Set(groupeIds)];
        }

        const userSchoolName = user.school?.schoolName || user.classe?.filiere?.school?.schoolName;

        return await openSearchService.search({
            query,
            accessibleGroupeIds: user.role === UserRole.SUPERADMIN ? [] : accessibleGroupeIds,
            fileType: filters?.fileType,
            userSchool: userSchoolName,
            from: filters?.from,
            size: filters?.size
        });
    }

    /**
     * Obtenir des suggestions via OpenSearch
     */
    async getSuggestions(query: string) {
        return await openSearchService.getSuggestions(query);
    }
}

export const searchService = new SearchService();
