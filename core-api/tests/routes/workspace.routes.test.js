import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// --------------------
// Mocks
// --------------------
const mockAuthMiddleware = jest.fn((req, res, next) => {
    req.user = { id: 'user1' };
    next();
});

const mockRequireWorkspaceRole = (role) => jest.fn((req, res, next) => {
    req.workspaceId = req.params.workspaceId || 'ws1';
    next();
});

const mockControllers = {
    createWorkspace: jest.fn((req, res) => res.status(201).json({ id: 'ws1' })),
    getMyWorkspaces: jest.fn((req, res) => res.status(200).json([])),
    getWorkspaceById: jest.fn((req, res) => res.status(200).json({ id: 'ws1' })),
    deleteWorkspace: jest.fn((req, res) => res.status(200).json({})),
    updateWorkspace: jest.fn((req, res) => res.status(200).json({})),
    addMemberToWorkspace: jest.fn((req, res) => res.status(201).json({})),
    removeMemberFromWorkspace: jest.fn((req, res) => res.status(200).json({})),
    updateMemberRole: jest.fn((req, res) => res.status(200).json({})),
    getWorkspaceHistory: jest.fn((req, res) => res.status(200).json([])),
    createEnvironment: jest.fn((req, res) => res.status(201).json({})),
    getWorkspaceEnvironments: jest.fn((req, res) => res.status(200).json([])),
};

// Mock modules
jest.unstable_mockModule('../../src/middlewares/auth.middleware.js', () => ({
    default: mockAuthMiddleware,
}));

jest.unstable_mockModule('../../src/middlewares/rbac.middleware.js', () => ({
    requireWorkspaceRole: mockRequireWorkspaceRole,
}));

// We need to mock the controller before importing the routes
jest.unstable_mockModule('../../src/controllers/workspace.controller.js', () => ({
    createWorkspace: mockControllers.createWorkspace,
    getMyWorkspaces: mockControllers.getMyWorkspaces,
    getWorkspaceById: mockControllers.getWorkspaceById,
    deleteWorkspace: mockControllers.deleteWorkspace,
    updateWorkspace: mockControllers.updateWorkspace,
    addMemberToWorkspace: mockControllers.addMemberToWorkspace,
    removeMemberFromWorkspace: mockControllers.removeMemberFromWorkspace,
    updateMemberRole: mockControllers.updateMemberRole,
    getWorkspaceHistory: mockControllers.getWorkspaceHistory,
}));

jest.unstable_mockModule('../../src/controllers/environment.controller.js', () => ({
    createEnvironment: mockControllers.createEnvironment,
    getWorkspaceEnvironments: mockControllers.getWorkspaceEnvironments,
}));

// Import router
const { default: workspaceRouter } = await import('../../src/routes/workspace.routes.js');

describe('Workspace Routes', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/workspaces', workspaceRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('POST /workspaces/create should call createWorkspace controller', async () => {
        const response = await request(app)
            .post('/workspaces/create')
            .send({ name: 'New Workspace' });

        expect(response.status).toBe(201);
        expect(mockControllers.createWorkspace).toHaveBeenCalled();
    });

    test('GET /workspaces should call getMyWorkspaces controller', async () => {
        const response = await request(app).get('/workspaces');
        expect(response.status).toBe(200);
        expect(mockControllers.getMyWorkspaces).toHaveBeenCalled();
    });

    test('GET /workspaces/:workspaceId should call getWorkspaceById controller', async () => {
        const response = await request(app).get('/workspaces/ws1');
        expect(response.status).toBe(200);
        expect(mockControllers.getWorkspaceById).toHaveBeenCalled();
    });

    test('DELETE /workspaces/:workspaceId should call deleteWorkspace controller', async () => {
        const response = await request(app).delete('/workspaces/ws1');
        expect(response.status).toBe(200);
        expect(mockControllers.deleteWorkspace).toHaveBeenCalled();
    });
});
