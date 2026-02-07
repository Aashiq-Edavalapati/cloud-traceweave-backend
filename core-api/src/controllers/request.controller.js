import httpStatus from 'http-status';
import { requestDefinitionService } from '../services/requestDefinition.service.js';
import { sendRequestService } from '../services/sendRequest.service.js';
import catchAsync from '../utils/catchAsync.js';

export const requestController = {
    createRequest: catchAsync(async (req, res) => {
        // collectionId comes from params now due to route change for specific RBAC scoping
        const { collectionId } = req.params;
        const request = await requestDefinitionService.createRequest({
            ...req.body,
            collectionId
        });
        res.status(httpStatus.CREATED).send(request);
    }),

    getRequestsByCollection: catchAsync(async (req, res) => {
        // Updated service might not strictly require userId for read yet if we didn't enforce it there,
        // but let's pass it for consistency or future use.
        // Actually I didn't add userId param to getRequestsByCollection in service, so I'll leave it.
        const requests = await requestDefinitionService.getRequestsByCollection(
            req.params.collectionId
        );
        res.send(requests);
    }),

    updateRequest: catchAsync(async (req, res) => {
        const request = await requestDefinitionService.updateRequest(
            req.params.requestId,
            req.body,
            req.user.id
        );
        res.send(request);
    }),

    deleteRequest: catchAsync(async (req, res) => {
        await requestDefinitionService.softDeleteRequest(
            req.params.requestId,
            req.user.id
        );
        res.status(httpStatus.NO_CONTENT).send();
    }),

    sendRequest: catchAsync(async (req, res) => {
        const { requestId } = req.params;
        const response = await sendRequestService.sendRequest(requestId);
        res.send(response);
    }),
};
