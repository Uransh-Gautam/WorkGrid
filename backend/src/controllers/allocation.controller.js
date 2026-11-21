// backend/src/controllers/allocation.controller.js
import prisma from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

export async function getAllocations(req, res, next) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const allocations = await prisma.allocation.findMany({
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
        project: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    res.json(allocations);
  } catch (err) {
    next(err);
  }
}

export async function getAllocationHistory(req, res, next) {
  try {
    const history = await prisma.allocationHistory.findMany({
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
        allocation: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function createAllocation(req, res, next) {
  try {
    const { employeeId, projectId, hoursPerWeek } = req.body;

    if (!employeeId || !projectId || !hoursPerWeek) {
      throw new AppError('employeeId, projectId, and hoursPerWeek are required', 400);
    }

    const hours = Number(hoursPerWeek);
    if (Number.isNaN(hours) || hours <= 0) {
      throw new AppError('hoursPerWeek must be a positive number', 400);
    }

    // Verify employee exists and calculate current capacity load
    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
      include: {
        allocations: {
          where: { status: 'Active' },
        },
      },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Calculate workload to check capacity
    const currentHours = (employee.allocations || []).reduce(
      (sum, a) => sum + a.hoursPerWeek,
      0
    );
    const newTotal = currentHours + hours;
    const capacity = employee.capacity || 40;

    let warning = null;
    if (newTotal > capacity) {
      warning = `Warning: This allocation brings ${employee.name}'s workload to ${newTotal}h/wk, exceeding their capacity of ${capacity}h/wk.`;
    }

    const historyDetails = `Assigned ${hours}h/wk to ${project.name} (Total load: ${newTotal}h/${capacity}h)`;

    // Atomic transaction: create Allocation AND AllocationHistory log together
    const allocation = await prisma.$transaction(async (tx) => {
      const created = await tx.allocation.create({
        data: {
          employeeId: Number(employeeId),
          projectId: Number(projectId),
          hoursPerWeek: hours,
          status: 'Active',
        },
        include: {
          employee: true,
          project: true,
        },
      });

      await tx.allocationHistory.create({
        data: {
          allocationId: created.id,
          employeeId: created.employeeId,
          changeType: 'Created',
          details: historyDetails,
        },
      });

      return created;
    });

    res.status(201).json({
      allocation,
      warning,
    });
  } catch (err) {
    next(err);
  }
}
