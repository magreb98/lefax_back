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
        // Ensure query is an object
        const q = query || {};

        // Safely parse page
        let page = 1;
        if (q.page) {
            const parsed = parseInt(String(q.page), 10);
            if (!isNaN(parsed) && parsed > 0) {
                page = parsed;
            }
        }

        // Safely parse limit
        let limit = this.DEFAULT_LIMIT;
        if (q.limit) {
            const parsed = parseInt(String(q.limit), 10);
            if (!isNaN(parsed) && parsed > 0) {
                limit = parsed;
            }
        }

        // Apply max limit
        const actualMaxLimit = maxLimit || this.MAX_LIMIT;
        limit = Math.min(actualMaxLimit, limit);

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
