import prisma from '../config/prisma.js';
import { executeWorkflow } from '../services/workflow-runner.service.js';
import catchAsync from '../utils/catchAsync.js';
import WorkflowLog from '../models/workflow-log.model.js';

export const workflowController = {
  // Create Workflow
  createWorkflow: catchAsync(async (req, res) => {
    const { workspaceId, name, steps, description } = req.body;
    // Basic validation could go here
    const workflow = await prisma.workflow.create({
      data: { workspaceId, name, steps, description }
    });
    res.status(201).json(workflow);
  }),

  // Get All in Workspace
  getWorkflows: catchAsync(async (req, res) => {
    const { workspaceId } = req.params;
    const workflows = await prisma.workflow.findMany({
      where: { workspaceId, deletedAt: null }
    });
    res.json(workflows);
  }),

  // Get Single
  getWorkflowById: catchAsync(async (req, res) => {
    const { workflowId } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId }
    });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  }),

  // Update
  updateWorkflow: catchAsync(async (req, res) => {
    const { workflowId } = req.params;
    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: req.body
    });
    res.json(workflow);
  }),

  // RUN WORKFLOW
  runWorkflow: catchAsync(async (req, res) => {
    console.log("Entered runWorkflow controller", req);
    const { workflowId } = req.params;
    const userId = req.user.id;
    
    const result = await executeWorkflow(workflowId, userId);
    
    res.status(200).json({
      message: 'Workflow execution completed',
      report: result
    });
  }),

  // Get Workflow History
  getWorkflowHistory: catchAsync(async (req, res) => {
    const { workflowId } = req.params;
    const logs = await WorkflowLog.find({ workflowId }).sort({ createdAt: -1 }).limit(20);
    res.json(logs);
  })
};