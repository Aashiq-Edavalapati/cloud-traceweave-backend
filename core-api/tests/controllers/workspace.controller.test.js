import { jest } from '@jest/globals';
import httpMocks from 'node-mocks-http';

// Define mocks
const mockWorkspaceService = {
  createWorkspace: jest.fn(),
  getUserWorkspaces: jest.fn(),
  getWorkspaceById: jest.fn(),
  deleteWorkspace: jest.fn(),
  updateWorkspace: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  updateMemberRole: jest.fn(),
};

const mockExecutionLog = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

// Apply mocks
jest.unstable_mockModule('../../src/services/workspace.service.js', () => ({
  workspaceService: mockWorkspaceService,
}));

jest.unstable_mockModule('../../src/models/execution.model.js', () => ({
    default: mockExecutionLog
}));

// Import controller
const controller = await import('../../src/controllers/workspace.controller.js');

describe('Workspace Controller', () => {
    let req, res, next;

    let mockFindChain;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
        req.user = { id: 'user1' };
        
        // Create fresh mock chain
        mockFindChain = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([]),
        };
        mockExecutionLog.find.mockReturnValue(mockFindChain);
    });

    describe('createWorkspace', () => {
        test('should create workspace', async () => {
            req.body = { name: 'New WS', description: 'Desc' };
            const workspace = { id: 'ws1', ...req.body };
            mockWorkspaceService.createWorkspace.mockResolvedValue(workspace);

            await controller.createWorkspace(req, res, next);

            expect(mockWorkspaceService.createWorkspace).toHaveBeenCalledWith({
                name: 'New WS',
                description: 'Desc',
                ownerId: 'user1',
            });
            expect(res.statusCode).toBe(201);
            expect(res._getJSONData()).toEqual({
                message: 'Workspace created successfully',
                data: workspace,
            });
        });

        test('should call next with error if name invalid', async () => {
             req.body = {};
             
             await controller.createWorkspace(req, res, next);
             
             expect(res.statusCode).toBe(400);
             expect(res._getJSONData()).toEqual({ message: 'Workspace name is required' });
        });
    });

    describe('getMyWorkspaces', () => {
        test('should return workspaces', async () => {
            const workspaces = [{ id: 'ws1' }];
            mockWorkspaceService.getUserWorkspaces.mockResolvedValue(workspaces);

            await controller.getMyWorkspaces(req, res, next);

            expect(mockWorkspaceService.getUserWorkspaces).toHaveBeenCalledWith('user1');
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({ data: workspaces });
        });
    });

    describe('getWorkspaceHistory', () => {
        test('should return history logs with pagination', async () => {
            req.params = { workspaceId: 'ws1' };
            req.query = { page: '1', limit: '10' };
            
            const logs = [{ _id: 'log1' }];
            const total = 1;
            
            // Setup specific return value
            mockFindChain.lean.mockResolvedValue(logs);
            mockExecutionLog.countDocuments.mockResolvedValue(total);

            await controller.getWorkspaceHistory(req, res, next);
            
            expect(mockExecutionLog.find).toHaveBeenCalledWith({ workspaceId: 'ws1' });
            expect(mockFindChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockFindChain.skip).toHaveBeenCalledWith(0);
            expect(mockFindChain.limit).toHaveBeenCalledWith(10);
            expect(mockExecutionLog.countDocuments).toHaveBeenCalledWith({ workspaceId: 'ws1' });
        });
    });
});
