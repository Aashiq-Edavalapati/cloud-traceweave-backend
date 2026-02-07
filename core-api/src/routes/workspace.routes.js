import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  deleteWorkspace,
  updateWorkspace,
  addMemberToWorkspace,
  removeMemberFromWorkspace,
  updateMemberRole
} from '../controllers/workspace.controller.js';

import { requireWorkspaceRole } from '../middlewares/rbac.middleware.js';

const router = express.Router();

// Protect all workspace routes
router.use(authMiddleware);

router.post('/create', createWorkspace);

router.get('/', getMyWorkspaces);

// Viewer Role
router.get('/:workspaceId', requireWorkspaceRole('VIEWER'), getWorkspaceById);

// Owner Role for delete
router.delete('/:workspaceId', requireWorkspaceRole('OWNER'), deleteWorkspace);

// Editor Role for update
router.patch('/:workspaceId', requireWorkspaceRole('EDITOR'), updateWorkspace);

// Owner Role for Member Management
router.post('/:workspaceId/members', requireWorkspaceRole('OWNER'), addMemberToWorkspace);

router.delete(
  '/:workspaceId/members/:userId',
  requireWorkspaceRole('OWNER'),
  removeMemberFromWorkspace
);

router.patch(
  '/:workspaceId/members/:userId',
  requireWorkspaceRole('OWNER'),
  updateMemberRole
);


export default router;
