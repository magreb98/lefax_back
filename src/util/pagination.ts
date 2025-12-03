/**
 * Interface pour les options de pagination
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
    maxLimit?: number;
}

/**
 * Interface pour les résultats paginés
 */
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * Classe utilitaire pour la pagination
 */
export class PaginationHelper {
    private static readonly DEFAULT_PAGE = 1;
    private static readonly DEFAULT_LIMIT = 10;
    private static readonly MAX_LIMIT = 100;

    /**
     * Extraire les paramètres de pagination depuis la requête
     */
    static getParams(query: any, maxLimit?: number): { skip: number; take: number; page: number } {
        const page = Math.max(1, parseInt(query.page) || this.DEFAULT_PAGE);
        const limit = Math.min(
            maxLimit || this.MAX_LIMIT,
            Math.max(1, parseInt(query.limit) || this.DEFAULT_LIMIT)
        );
        const skip = (page - 1) * limit;

        return { skip, take: limit, page };
    }

    /**
     * Créer une réponse paginée
     */
    static createResponse<T>(
        data: T[],
        total: number,
        page: number,
        limit: number
    ): PaginatedResult<T> {
        const totalPages = Math.ceil(total / limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    /**
     * Créer des métadonnées de pagination pour les headers
     */
    static createHeaders(total: number, page: number, limit: number): Record<string, string> {
        const totalPages = Math.ceil(total / limit);

        return {
            'X-Total-Count': total.toString(),
            'X-Page': page.toString(),
            'X-Per-Page': limit.toString(),
            'X-Total-Pages': totalPages.toString(),
        };
    }
}
