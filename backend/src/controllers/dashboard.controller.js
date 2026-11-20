// backend/src/controllers/dashboard.controller.js
import prisma from '../config/db.js';
import { computeEmployeeWorkload } from './employee.controller.js';

export async function getDashboard(req, res, next) {
  try {
    // Run all 3 database queries concurrently using Promise.all
    const [projects, rawEmployees, pendingApprovals] = await Promise.all([
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.findMany({
        include: {
          department: true,
          manager: { select: { id: true, name: true } },
          allocations: {
            where: { status: 'Active' },
            include: { project: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.approvalRequest.findMany({
        where: { status: 'Pending' },
        include: {
          employee: { select: { id: true, name: true, role: true } },
          fromAllocation: { include: { project: { select: { id: true, name: true } } } },
          toProject: { select: { id: true, name: true } },
          requestedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const activeProjects = projects.filter(
      (p) => p.status === 'In Progress' || p.status === 'Active'
    ).length;

    const workload = rawEmployees.map(computeEmployeeWorkload);
    const freeEmployees = workload.filter((e) => e.workloadStatus === 'Free').length;
    const overloadedEmployees = workload.filter((e) => e.workloadStatus === 'Overloaded').length;

    res.json({
      activeProjects,
      freeEmployees,
      overloadedEmployees,
      workload,
      pendingApprovals,
    });
  } catch (err) {
    next(err);
  }
}
