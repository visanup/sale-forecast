import { PrismaClient } from '@prisma/client';
import { AuditLogData } from '../types/auth.types';

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an audit event
   */
  async log(data: AuditLogData & { userId?: string }): Promise<void> {
    try {
      // Filter out undefined values to satisfy exactOptionalPropertyTypes
      const auditData: any = {
        action: data.action
      };

      if (data.userId !== undefined) {
        auditData.userId = data.userId;
      }
      if (data.resource !== undefined) {
        auditData.resource = data.resource;
      }
      if (data.resourceId !== undefined) {
        auditData.resourceId = data.resourceId;
      }
      if (data.details !== undefined) {
        auditData.details = data.details;
      }
      if (data.ipAddress !== undefined) {
        auditData.ipAddress = data.ipAddress;
      }
      if (data.userAgent !== undefined) {
        auditData.userAgent = data.userAgent;
      }

      await this.prisma.auditLog.create({
        data: auditData
      });
    } catch (error) {
      // Don't throw error for audit logging failures
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true
        }
      }),
      this.prisma.auditLog.count({
        where: { userId }
      })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs by action
   */
  async getAuditLogsByAction(
    action: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({
        where: { action }
      })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs by resource
   */
  async getAuditLogsByResource(
    resource: string,
    resourceId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const where = {
      resource,
      ...(resourceId && { resourceId })
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs by date range
   */
  async getAuditLogsByDateRange(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalLogs: number;
    logsByAction: { action: string; count: number }[];
    logsByUser: { userId: string; email: string; count: number }[];
    logsByResource: { resource: string; count: number }[];
  }> {
    const where = startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    } : {};

    const [
      totalLogs,
      logsByAction,
      logsByUser,
      logsByResource
    ] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } }
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null }
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where: {
          ...where,
          resource: { not: null }
        },
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } }
      })
    ]);

    // Get user details for logsByUser
    const userIds = logsByUser.map((log: any) => log.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true }
    });

    const userMap = new Map(users.map((user: any) => [user.id, user.email]));

    return {
      totalLogs,
      logsByAction: logsByAction.map((log: any) => ({
        action: log.action,
        count: log._count.action
      })),
      logsByUser: logsByUser.map((log: any) => ({
        userId: log.userId,
        email: userMap.get(log.userId) || 'Unknown',
        count: log._count.userId
      })),
      logsByResource: logsByResource.map((log: any) => ({
        resource: log.resource || 'Unknown',
        count: log._count.resource
      }))
    };
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }
}
