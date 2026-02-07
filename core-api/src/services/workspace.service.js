import httpStatus from 'http-status';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';


export const workspaceService = {
  async createWorkspace({ name, description, ownerId }) {
    try {
      return await prisma.workspace.create({
        data: {
          name,
          description,
          owner: {
            connect: { id: ownerId },
          },
          members: {
            create: {
              user: { connect: { id: ownerId } },
              role: 'OWNER',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      // 1. Log the full error for your internal debugging
      console.error("--- PRISMA ERROR DEBUG ---");
      console.error("Code:", error.code); // e.g., P2002, P2025
      console.error("Message:", error.message);

      // 2. Identify specific Prisma errors (Optional but helpful)
      if (error.code === 'P2025') {
        throw new ApiError(httpStatus.NOT_FOUND, 'User (Owner) not found');
      }

      // 3. Re-throw as an ApiError so your global error handler catches it
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Failed to create workspace: ${error.message.split('\n').at(-1)}`
      );
    }
  },

  async getUserWorkspaces(userId) {
    return prisma.workspace.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  },

  async getWorkspaceById(workspaceId, userId) {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Workspace not found or access denied'
      );
    }

    return workspace;
  },

  async addMember(workspaceId, userId, memberEmail, role = 'VIEWER') {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!workspace) {
      // With route-level checks, this might be redundant if we blindly trust route middleware,
      // but logic-wise: "Only the owner can add members".
      // If middleware already checked OWNER, this fetch acts as a double-check or just fetches data.
      // However, to strictly follow "remove service level checks", 
      // I will rely on the caller/middleware having done the check, 
      // OR keeps basic existence checks.
      // Let's keep the business logic correct: "addMember" implies permission.
    }

    // Since we are moving to route-level, I will remove the explicit checkWorkspacePermission call
    // and rely on the controller/route to have enforced it.

    const userToAdd = await prisma.user.findUnique({
      where: { email: memberEmail },
    });

    if (!userToAdd) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    try {
      return await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: userToAdd.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'User is already a member of this workspace'
        );
      }
      throw error;
    }
  },

  async removeMember(workspaceId, userId, memberUserId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    // Logic: Owner cannot remove themselves.
    if (memberUserId === workspace.ownerId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Cannot remove the owner from the workspace'
      );
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Member not found');
    }

    return prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });
  },

  async deleteWorkspace(workspaceId, userId) {
    // Permission checked at route level.
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });
  },

  async updateWorkspace(workspaceId, userId, updateBody) {
    // Permission checked at route level.
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: updateBody,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  },
  async updateMemberRole(workspaceId, memberUserId, newRole) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (memberUserId === workspace.ownerId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Cannot change the role of the workspace owner'
      );
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Member not found');
    }

    return prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  },
};
