// backend/src/controllers/approval.controller.js
/**
 * Approval Controller (Manager Approval Workflows & State Machine)
 * Domain: ACID Transactions, Approval Workflows & Dashboard KPIs
 * Author: Shlok Srivastava <shloksrivastava2610@gmail.com>
 */
import prisma from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

export async function getApprovals(req, res, next) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const approvals = await prisma.approvalRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            capacity: true,
            department: { select: { id: true, name: true } },
          },
        },
        fromAllocation: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
        toProject: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        decidedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(approvals);
  } catch (err) {
    next(err);
  }
}

export async function getApprovalById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid approval ID', 400);
    }

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            capacity: true,
            department: { select: { id: true, name: true } },
          },
        },
        fromAllocation: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
        toProject: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        decidedBy: { select: { id: true, name: true } },
      },
    });

    if (!approval) {
      throw new AppError('Approval request not found', 404);
    }

    res.json(approval);
  } catch (err) {
    next(err);
  }
}

export async function createReassignmentRequest(req, res, next) {
  try {
    const { fromAllocationId, toProjectId, hoursPerWeek, justification, requestedById } = req.body;

    if (!fromAllocationId || !toProjectId || !hoursPerWeek) {
      throw new AppError('fromAllocationId, toProjectId, and hoursPerWeek are required', 400);
    }

    const hours = Number(hoursPerWeek);
    if (Number.isNaN(hours) || hours <= 0) {
      throw new AppError('hoursPerWeek must be a positive number', 400);
    }

    const allocation = await prisma.allocation.findUnique({
      where: { id: Number(fromAllocationId) },
      include: { employee: true },
    });

    if (!allocation) {
      throw new AppError('Source allocation not found', 404);
    }

    if (allocation.status !== 'Active') {
      throw new AppError('Can only reassign from an Active allocation', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: Number(toProjectId) },
    });

    if (!project) {
      throw new AppError('Target project not found', 404);
    }

    const reqById = requestedById
      ? Number(requestedById)
      : (allocation.employee.managerId || allocation.employeeId);

    const request = await prisma.approvalRequest.create({
      data: {
        employeeId: allocation.employeeId,
        fromAllocationId: Number(fromAllocationId),
        toProjectId: Number(toProjectId),
        hoursPerWeek: hours,
        justification: justification || null,
        requestedById: Number(reqById),
        status: 'Pending',
      },
      include: {
        employee: true,
        fromAllocation: { include: { project: true } },
        toProject: true,
      },
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
}

export async function decideApproval(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid approval ID', 400);
    }

    const { action, deciderId } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Action must be either "approve" or "reject"', 400);
    }

    // Atomic 5-step transaction to ensure ACID consistency
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Re-verify request still exists and is Pending
      const request = await tx.approvalRequest.findUnique({
        where: { id },
        include: {
          fromAllocation: { include: { project: true } },
          toProject: true,
          employee: true,
        },
      });

      if (!request) {
        throw new AppError('Approval request not found', 404);
      }

      if (request.status !== 'Pending') {
        throw new AppError(`Request has already been ${request.status.toLowerCase()}`, 400);
      }

      const now = new Date();

      if (action === 'reject') {
        return tx.approvalRequest.update({
          where: { id: request.id },
          data: {
            status: 'Rejected',
            decidedAt: now,
            decidedById: deciderId ? Number(deciderId) : null,
          },
          include: {
            employee: true,
            fromAllocation: { include: { project: true } },
            toProject: true,
          },
        });
      }

      // Step 2: Close old allocation
      const closedOldAllocation = await tx.allocation.update({
        where: { id: request.fromAllocationId },
        data: {
          status: 'Closed',
          endedAt: now,
        },
      });

      // Step 3: Activate new allocation
      const newAllocation = await tx.allocation.create({
        data: {
          employeeId: request.employeeId,
          projectId: request.toProjectId,
          hoursPerWeek: request.hoursPerWeek,
          status: 'Active',
          startedAt: now,
        },
      });

      // Step 4: Write audit history for both closure and new assignment
      await tx.allocationHistory.create({
        data: {
          allocationId: closedOldAllocation.id,
          employeeId: request.employeeId,
          changeType: 'Closed',
          details: `Reassigned: Closed allocation from ${request.fromAllocation.project.name} (${request.fromAllocation.hoursPerWeek}h/wk)`,
          changedAt: now,
        },
      });

      await tx.allocationHistory.create({
        data: {
          allocationId: newAllocation.id,
          employeeId: request.employeeId,
          changeType: 'Reassigned',
          details: `Reassigned: Activated new allocation to ${request.toProject.name} (${request.hoursPerWeek}h/wk)`,
          changedAt: now,
        },
      });

      // Step 5: Mark approval request as Approved
      return tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: 'Approved',
          decidedAt: now,
          decidedById: deciderId ? Number(deciderId) : null,
        },
        include: {
          employee: true,
          fromAllocation: { include: { project: true } },
          toProject: true,
        },
      });
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
