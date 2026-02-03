import prisma from "../config/prisma.js";

export const workspaceService = {
  async createWorkspace({ name, description, ownerId }) {
    return prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          description,
          ownerId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: ownerId,
          role: 'OWNER',
        },
      });

      return workspace;
    });
  },

   async getUserWorkspaces(userId) {
    return prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
        deletedAt: null,
      },
    });
  },

  async getWorkspaceById(workspaceId, userId) {
    return prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
    });
  },
};

