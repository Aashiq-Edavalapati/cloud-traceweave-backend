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
  user: {
    findUnique: jest.fn(),
  },
  workspaceMember: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  environment: {
      findMany: jest.fn().mockResolvedValue([]),
  },
  userEnvironment: {
      createMany: jest.fn(),
  }
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
        test('should create a workspace', async () => {
            const data = { name: 'Test WS', description: 'Desc', ownerId: 'user1' };
            const expected = { id: 'ws1', ...data };
            
            mockPrisma.workspace.create.mockResolvedValue(expected);

            const result = await workspaceService.createWorkspace(data);
            
            expect(mockPrisma.workspace.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    name: data.name,
                    owner: { connect: { id: data.ownerId } }
                })
            }));
            expect(result).toEqual(expected);
        });

        test('should throw if owner not found', async () => {
             const data = { name: 'Test WS', ownerId: 'user1' };
             const error = new Error('P2025');
             error.code = 'P2025';
             mockPrisma.workspace.create.mockRejectedValue(error);

             await expect(workspaceService.createWorkspace(data)).rejects.toThrow('User (Owner) not found');
        });
    });

    describe('getUserWorkspaces', () => {
        test('should return user workspaces', async () => {
            const userId = 'user1';
            const workspaces = [{ id: 'ws1' }];
            mockPrisma.workspace.findMany.mockResolvedValue(workspaces);

            const result = await workspaceService.getUserWorkspaces(userId);

            expect(mockPrisma.workspace.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    members: { some: { userId } }
                })
            }));
            expect(result).toEqual(workspaces);
        });
    });

    describe('getWorkspaceById', () => {
        test('should return workspace if found', async () => {
            const workspaceId = 'ws1';
            const userId = 'user1';
            const workspace = { id: workspaceId };
            mockPrisma.workspace.findFirst.mockResolvedValue(workspace);

            const result = await workspaceService.getWorkspaceById(workspaceId, userId);

            expect(result).toEqual(workspace);
        });

        test('should throw if not found', async () => {
             mockPrisma.workspace.findFirst.mockResolvedValue(null);
             await expect(workspaceService.getWorkspaceById('ws1', 'user1')).rejects.toThrow('Workspace not found');
        });
    });

    describe('addMember', () => {
        test('should add member to workspace', async () => {
            const workspaceId = 'ws1';
            const userId = 'owner1';
            const memberEmail = 'new@example.com';
            
            mockPrisma.workspace.findFirst.mockResolvedValue({ id: workspaceId });
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2', email: memberEmail });
            mockPrisma.workspaceMember.create.mockResolvedValue({ userId: 'user2', role: 'VIEWER' });

            const result = await workspaceService.addMember(workspaceId, userId, memberEmail);

            expect(mockPrisma.workspaceMember.create).toHaveBeenCalled();
            expect(result.userId).toBe('user2');
        });
    });
    
    // Add more tests for other methods as needed, but this covers critical paths
});
