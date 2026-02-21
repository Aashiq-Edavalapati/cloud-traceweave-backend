import express from 'express';
import { requestController } from '../controllers/request.controller.js';
import authenticateUser from '../middlewares/auth.middleware.js';
import { requireWorkspaceRole } from '../middlewares/rbac.middleware.js';
import { cookieController } from '../controllers/cookie.controller.js';
import multer from 'multer';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateUser);

router.post('/execute', requireWorkspaceRole('EDITOR'), upload.any(), requestController.executeAdHocRequest);

router.get('/jar/cookies', cookieController.getCookies);

router.delete('/jar/cookies/:cookieId', cookieController.deleteCookie);

router.delete('/jar/cookies', cookieController.clearCookies);

router.post('/:collectionId', requireWorkspaceRole('EDITOR'), requestController.createRequest);

router.get('/collection/:collectionId', requireWorkspaceRole('VIEWER'), requestController.getRequestsByCollection);

router.patch('/:requestId', requireWorkspaceRole('EDITOR'), requestController.updateRequest);

router.delete('/:requestId', requireWorkspaceRole('OWNER'), requestController.deleteRequest);

router.post('/:requestId/send', requireWorkspaceRole('EDITOR'), upload.any(), requestController.sendRequest);

router.get('/:requestId/history', requireWorkspaceRole('VIEWER'), requestController.getRequestHistory);

export default router;