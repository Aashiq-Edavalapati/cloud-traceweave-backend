import httpStatus from 'http-status';
import { requestDefinitionService } from '../services/requestDefinition.service.js';
import catchAsync from '../utils/catchAsync.js';
import { executeHttpRequest } from '../services/http-runner.service.js';
import { executeGraphQLRequest } from '../services/graphql-runner.service.js';
import ExecutionLog from '../models/execution.model.js';
import prisma from '../config/prisma.js';
import { environmentService } from '../services/environment.service.js';
import { substituteVariables } from '../services/variableSubstitution.service.js';
import { loadCookieJar, persistCookieJar } from '../services/cookie.service.js';

export const requestController = {

  /* ===========================
     CRUD
  ============================ */

  createRequest: catchAsync(async (req, res) => {
    const { collectionId } = req.params;
    const request = await requestDefinitionService.createRequest({
      ...req.body,
      collectionId
    });
    res.status(httpStatus.CREATED).send(request);
  }),

  getRequestsByCollection: catchAsync(async (req, res) => {
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

  /* ===========================
     EXECUTE SAVED REQUEST
  ============================ */

    sendRequest: catchAsync(async (req, res) => {
      try {
        const { requestId } = req.params;
        const userId = req.user.id;

        if (!requestId || requestId.length < 5) {
          return res.status(400).json({ error: 'Invalid Request ID format' });
        }

        const { overrides = {}, environmentId } = req.body || {};

        const requestDef = await prisma.requestDefinition.findUnique({
          where: { id: requestId },
          include: { collection: true },
        });

        if (!requestDef) return res.status(404).json({ error: 'Request not found' });

        const workspaceId = requestDef.collection.workspaceId;
        const dbConfig = requestDef.config || {};
        const overrideConfig = overrides.config || {};

        // Merge Configs safely
        let config = {
          method: overrideConfig.method ?? dbConfig.method ?? 'GET',
          url: overrideConfig.url ?? dbConfig.url ?? '',
          headers: { ...(dbConfig.headers || {}), ...(overrideConfig.headers || {}) },
          params: { ...(dbConfig.params || {}), ...(overrideConfig.params || {}) },
          body: overrideConfig.body ?? dbConfig.body,
        };

        if (environmentId) {
          const variables = await environmentService.getVariablesForExecution(
            environmentId, userId, workspaceId
          );
          config = substituteVariables(config, variables);
        }

        const domain = new URL(config.url).hostname;
        const jar = await loadCookieJar(userId, workspaceId, domain);

        let result;
        // FIX: Use the explicit protocol from the database to route the request!
        if (requestDef.protocol === 'graphql') {
          result = await executeGraphQLRequest({ ...config, url: config.url }, jar);
        } else {
          result = await executeHttpRequest(config, jar);
        }

        if (result.headers?.['set-cookie']) {
          await persistCookieJar(jar, userId, workspaceId, config.url);
        }

        const executionLog = await ExecutionLog.create({
          requestId: requestDef.id,
          collectionId: requestDef.collectionId,
          workspaceId,
          environmentId: environmentId || null,
          method: config.method,
          url: config.url,
          status: result.status,
          statusText: result.statusText,
          responseHeaders: result.headers,
          responseBody: result.data,
          responseSize: result.size,
          timings: result.timings,
          executedBy: userId,
        });

        res.status(200).json({ ...result, time: result.timings.total, historyId: executionLog._id });
      } catch (error) {
        console.error('Execution Error:', error);
        res.status(500).json({ error: error.message || 'Failed to execute request' });
      }
    }),

    /**
   * Path B: Execute Ad-Hoc Request (Scratchpad)
   * Route: POST /execute (No ID in URL)
   */
    executeAdHocRequest: catchAsync(async (req, res) => {
    try {
      const userId = req.user.id;
      
      // FIX THE DESTRUCTURING: Extract 'config' and 'protocol' sent by executionSlice
      const { workspaceId, protocol = 'http', config = {}, environmentId } = req.body;
      const { method = 'GET', url, headers = {}, body, params = {} } = config;

      if (!workspaceId || workspaceId.length < 5 || !url) {
        return res.status(400).json({ error: 'Missing workspaceId or url' });
      }

      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } }
      });

      if (!member || (member.role !== 'EDITOR' && member.role !== 'OWNER')) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      let execConfig = { method, url, headers, body, params };

      if (environmentId) {
        const variables = await environmentService.getVariablesForExecution(
          environmentId, userId, workspaceId
        );
        execConfig = substituteVariables(execConfig, variables);
      }

      let jar = null;
      try {
        const urlObj = new URL(execConfig.url.includes('://') ? execConfig.url : `http://${execConfig.url}`);
        jar = await loadCookieJar(userId, workspaceId, urlObj.hostname);
      } catch (e) { console.warn("Invalid URL for Cookie Jar"); }

      let result;
      // FIX: Use protocol to switch runners
      if (protocol === 'graphql') {
        result = await executeGraphQLRequest(execConfig, jar);
      } else {
        result = await executeHttpRequest(execConfig, jar);
      }

      if (result.headers?.['set-cookie']) {
        await persistCookieJar(jar, userId, workspaceId, execConfig.url);
      }

      const executionLog = await ExecutionLog.create({
        requestId: null, collectionId: null, workspaceId,
        environmentId: environmentId || null,
        method: execConfig.method, url: execConfig.url,
        status: result.status, statusText: result.statusText,
        responseHeaders: result.headers, responseBody: result.data,
        responseSize: result.size, timings: result.timings, executedBy: userId,
      });

      res.status(200).json({ ...result, time: result.timings.total, historyId: executionLog._id });
    } catch (error) {
      console.error('Ad-Hoc Error:', error);
      res.status(500).json({ error: error.message || 'Failed to execute request' });
    }
  }),

    /* ===========================
     HISTORY
    ============================ */
    getRequestHistory: catchAsync(async (req, res) => {
      const { requestId } = req.params;
      const { environmentId } = req.body;

      const history = await ExecutionLog.find({
        requestId,
        environmentId,
        executedBy: req.user.id
      })
        .sort({ createdAt: -1 })
        .limit(20);

      res.json(history);
    }),
};