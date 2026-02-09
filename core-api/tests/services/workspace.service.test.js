import { jest } from '@jest/globals';
import httpStatus from 'http-status';
import ApiError from '../../src/utils/ApiError.js';

// Mocks
const mockPrisma = {
    workspace: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    workspaceMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
    environment: {
        findMany: jest.fn(),
    },
    userEnvironment: {
        createMany: jest.fn(),
    },
};

jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: mockPrisma,
}));

// Import service after mocking
const { workspaceService } = await import('../../src/services/workspace.service.js');

describe('Workspace Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createWorkspace', () => {
        test('should create a workspace successfully', async () => {
            const workspaceData = { name: 'My Workspace', description: 'Desc', ownerId: 'user1' };
            const createdWorkspace = { id: 'ws1', ...workspaceData, members: [] };
            mockPrisma.workspace.create.mockResolvedValue(createdWorkspace);

            const result = await workspaceService.createWorkspace(workspaceData);

            expect(mockPrisma.workspace.create).toHaveBeenCalled();
            expect(result).toEqual(createdWorkspace);
        });

        test('should throw 404 if owner not found', async () => {
            const error = new Error('Not found');
            error.code = 'P2025';
            mockPrisma.workspace.create.mockRejectedValue(error);

            await expect(workspaceService.createWorkspace({ ownerId: 'nonexistent' }))
                .rejects.toThrow(ApiError);
        });
    });

    describe('getUserWorkspaces', () => {
        test('should return list of workspaces for user', async () => {
            const workspaces = [{ id: 'ws1' }];
            mockPrisma.workspace.findMany.mockResolvedValue(workspaces);

            const result = await workspaceService.getUserWorkspaces('user1');

            expect(mockPrisma.workspace.findMany).toHaveBeenCalled();
            expect(result).toEqual(workspaces);
        });
    });

    describe('addMember', () => {
        test('should add a member successfully', async () => {
            mockPrisma.workspace.findFirst.mockResolvedValue({ id: 'ws1', ownerId: 'owner1' });
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2', email: 'user2@ex.com' });
            mockPrisma.workspaceMember.create.mockResolvedValue({ userId: 'user2', role: 'VIEWER' });
            mockPrisma.environment.findMany.mockResolvedValue([]);

            const result = await workspaceService.addMember('ws1', 'owner1', 'user2@ex.com', 'VIEWER');

            expect(mockPrisma.workspaceMember.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        test('should throw 404 if user to add not found', async () => {
            mockPrisma.workspace.findFirst.mockResolvedValue({ id: 'ws1', ownerId: 'owner1' });
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(workspaceService.addMember('ws1', 'owner1', 'ghost@ex.com'))
                .rejects.toThrow(ApiError);
        });
    });

    describe('removeMember', () => {
        test('should remove a member successfully', async () => {
            mockPrisma.workspace.findUnique.mockResolvedValue({ ownerId: 'owner1' });
            mockPrisma.workspaceMember.findUnique.mockResolvedValue({ id: 'm1' });
            mockPrisma.workspaceMember.delete.mockResolvedValue(true);

            await workspaceService.removeMember('ws1', 'owner1', 'user2');

            expect(mockPrisma.workspaceMember.delete).toHaveBeenCalled();
        });

        test('should throw error if trying to remove owner', async () => {
            mockPrisma.workspace.findUnique.mockResolvedValue({ ownerId: 'owner1' });

            await expect(workspaceService.removeMember('ws1', 'owner1', 'owner1'))
                .rejects.toThrow('Cannot remove the owner from the workspace');
        });
    });

    describe('updateMemberRole', () => {
        test('should update member role', async () => {
            mockPrisma.workspace.findUnique.mockResolvedValue({ ownerId: 'owner1' });
            mockPrisma.workspaceMember.findUnique.mockResolvedValue({ userId: 'user2' });
            mockPrisma.workspaceMember.update.mockResolvedValue({ role: 'EDITOR' });

            const result = await workspaceService.updateMemberRole('ws1', 'user2', 'EDITOR');
            expect(result.role).toBe('EDITOR');
        });
    });
});
