import { PaginationHelper } from '../../src/util/pagination';

describe('PaginationHelper', () => {
    describe('getParams', () => {
        it('should return default values when no query params', () => {
            const result = PaginationHelper.getParams({});

            expect(result.page).toBe(1);
            expect(result.take).toBe(10);
            expect(result.skip).toBe(0);
        });

        it('should calculate skip correctly', () => {
            const result = PaginationHelper.getParams({ page: '3', limit: '20' });

            expect(result.page).toBe(3);
            expect(result.take).toBe(20);
            expect(result.skip).toBe(40); // (3-1) * 20
        });

        it('should enforce max limit', () => {
            const result = PaginationHelper.getParams({ limit: '200' }, 50);

            expect(result.take).toBe(50);
        });

        it('should handle invalid values', () => {
            const result = PaginationHelper.getParams({ page: 'invalid', limit: '-5' });

            expect(result.page).toBe(1);
            expect(result.take).toBe(10);
        });
    });

    describe('createResponse', () => {
        it('should create proper paginated response', () => {
            const data = [1, 2, 3, 4, 5];
            const result = PaginationHelper.createResponse(data, 25, 2, 5);

            expect(result.data).toEqual(data);
            expect(result.pagination.page).toBe(2);
            expect(result.pagination.limit).toBe(5);
            expect(result.pagination.total).toBe(25);
            expect(result.pagination.totalPages).toBe(5);
            expect(result.pagination.hasNext).toBe(true);
            expect(result.pagination.hasPrev).toBe(true);
        });

        it('should indicate no next page on last page', () => {
            const data = [1, 2, 3];
            const result = PaginationHelper.createResponse(data, 13, 3, 5);

            expect(result.pagination.hasNext).toBe(false);
            expect(result.pagination.hasPrev).toBe(true);
        });
    });
});
