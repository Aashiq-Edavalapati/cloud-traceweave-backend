import { jest } from '@jest/globals';
import httpStatus from 'http-status';
import ApiError from '../../src/utils/ApiError.js';

// Mocks
const mockPrisma = {
    collection: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
};

jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: mockPrisma,
}));

// Import service after mocking
const { CollectionService } = await import('../../src/services/collection.service.js');

describe('Collection Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCollection', () => {
        test('should create a collection successfully', async () => {
            const collectionData = { workspaceId: 'ws1', name: 'My Coll' };
            mockPrisma.collection.create.mockResolvedValue({ id: 'coll1', ...collectionData });

            const result = await CollectionService.createCollection(collectionData);

            expect(mockPrisma.collection.create).toHaveBeenCalled();
            expect(result.name).toBe('My Coll');
        });

        test('should throw 404 if parent collection not found', async () => {
            mockPrisma.collection.findFirst.mockResolvedValue(null);
            const collectionData = { workspaceId: 'ws1', name: 'Child', parentId: 'nonexistent' };

            await expect(CollectionService.createCollection(collectionData))
                .rejects.toThrow(ApiError);
        });
    });

    describe('getCollectionsByWorkspace', () => {
        test('should return collections for workspace', async () => {
            mockPrisma.collection.findMany.mockResolvedValue([{ id: 'coll1' }]);

            const result = await CollectionService.getCollectionsByWorkspace('ws1');

            expect(mockPrisma.collection.findMany).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });
    });

    describe('softDeleteCollection', () => {
        test('should soft delete collection', async () => {
            mockPrisma.collection.findFirst.mockResolvedValue({ id: 'coll1' });
            mockPrisma.collection.update.mockResolvedValue({ id: 'coll1', deletedAt: new Date() });

            const result = await CollectionService.softDeleteCollection('coll1');

            expect(mockPrisma.collection.update).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });
    });
});
