// backend/src/controllers/employee.controller.js
/**
 * Employee Controller with Workload Computation
 * Domain: Core Workforce & Project Allocation Resources
 * Author: Varun Adwani <varunadwani512@gmail.com>
 */
import prisma from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

// Helper function to calculate workload status and utilization
export function computeEmployeeWorkload(employee) {
  const activeAllocations = employee.allocations || [];
  const workloadHours = activeAllocations.reduce((sum, alloc) => sum + alloc.hoursPerWeek, 0);

  let workloadStatus = 'Active';
  if (workloadHours < 20) {
    workloadStatus = 'Free';
  } else if (workloadHours > 40) {
    workloadStatus = 'Overloaded';
  }

  const capacity = employee.capacity || 40;
  const utilizationPercent = Math.round((workloadHours / capacity) * 100);

  return {
    ...employee,
    workloadHours,
    workloadStatus,
    utilizationPercent,
  };
}

export async function getEmployees(req, res, next) {
  try {
    const { team, workload } = req.query;

    const rawEmployees = await prisma.employee.findMany({
      include: {
        department: true,
        manager: {
          select: { id: true, name: true },
        },
        allocations: {
          where: { status: 'Active' },
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    let computed = rawEmployees.map(computeEmployeeWorkload);

    // Optional query filtering by department/team
    if (team && team !== 'All' && team !== 'All Teams') {
      computed = computed.filter(
        (emp) => emp.department && emp.department.name.toLowerCase() === team.toLowerCase()
      );
    }

    // Optional query filtering by workload status
    if (workload && workload !== 'All' && workload !== 'All Workloads') {
      computed = computed.filter(
        (emp) => emp.workloadStatus.toLowerCase() === workload.toLowerCase()
      );
    }

    res.json(computed);
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid employee ID', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: {
          select: { id: true, name: true },
        },
        allocations: {
          where: { status: 'Active' },
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    res.json(computeEmployeeWorkload(employee));
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req, res, next) {
  try {
    const { name, email, role, departmentId, capacity, managerId } = req.body;

    if (!name || !email || !role || !departmentId) {
      throw new AppError('Name, email, role, and departmentId are required', 400);
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        capacity: capacity !== undefined ? Number(capacity) : 40,
        departmentId: Number(departmentId),
        managerId: managerId ? Number(managerId) : null,
      },
      include: {
        department: true,
        manager: {
          select: { id: true, name: true },
        },
        allocations: true,
      },
    });

    res.status(201).json(computeEmployeeWorkload(employee));
  } catch (err) {
    next(err);
  }
}
