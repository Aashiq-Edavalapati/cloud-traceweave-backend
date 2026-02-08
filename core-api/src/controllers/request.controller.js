import httpStatus from 'http-status';
import { requestDefinitionService } from '../services/requestDefinition.service.js';
import catchAsync from '../utils/catchAsync.js';
import { executeHttpRequest } from '../services/http-runner.service.js';
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
    const { requestId } = req.params;
    const userId = req.user.id;

    const { overrides = {}, environmentId } = req.body || {};

    // 1. Fetch request definition
    const requestDef = await prisma.requestDefinition.findUnique({
      where: { id: requestId },
      include: { collection: true },
    });

    if (!requestDef) {
      return res.status(404).json({ error: 'Request definition not found' });
    }

    const workspaceId = requestDef.collection.workspaceId;

    // 2. Merge DB + Draft overrides
    let config = {
      method: overrides.method ?? requestDef.method,
      url: overrides.url ?? requestDef.url,
      headers: overrides.headers ?? requestDef.headers ?? {},
      body: overrides.body ?? requestDef.body,
      params: overrides.params ?? requestDef.params ?? {},
    };

    // 3. Variable substitution
    if (environmentId) {
      const variables = await environmentService.getVariablesForExecution(
        environmentId,
        userId,
        workspaceId
      );
      config = substituteVariables(config, variables);
    }

    // 4. LOAD COOKIE JAR
    const domain = new URL(config.url).hostname;
    const jar = await loadCookieJar(userId, workspaceId, domain);

    // 5. EXECUTE
    const result = await executeHttpRequest(config, jar);

    // 6. SAVE COOKIES (if any)
    if (result.headers?.['set-cookie']) {
      await persistCookieJar(jar, userId, workspaceId, config.url);
    }

    // 7. LOG HISTORY
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

    res.status(200).json({
      ...result,
      historyId: executionLog._id
    });
  }),

  /* ===========================
     EXECUTE AD-HOC REQUEST
  ============================ */

  executeAdHocRequest: catchAsync(async (req, res) => {
    console.log('Executing Ad-Hoc Request with body:', req.body);
    const userId = req?.user.id;
    const { workspaceId, method, url, headers, body, params, environmentId } = req.body;

    if (!workspaceId || !url || !method) {
      return res.status(400).json({ error: 'Missing workspaceId, url, or method' });
    }

    // 1. Build config
    let config = { method, url, headers: headers ?? {}, body, params };

    // 2. Variable substitution
    if (environmentId) {
      const variables = await environmentService.getVariablesForExecution(
        environmentId,
        userId,
        workspaceId
      );
      config = substituteVariables(config, variables);
    }

    // 3. LOAD COOKIE JAR
    const domain = new URL(config.url).hostname;
    const jar = await loadCookieJar(userId, workspaceId, domain);

    // 4. EXECUTE
    const result = await executeHttpRequest(config, jar);

    // 5. SAVE COOKIES
    if (result.headers?.['set-cookie']) {
      await persistCookieJar(jar, userId, workspaceId, config.url);
    }

    // 6. LOG HISTORY (Ad-hoc)
    const executionLog = await ExecutionLog.create({
      requestId: null,
      collectionId: null,
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

    res.status(200).json({
      ...result,
      historyId: executionLog._id
    });
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
