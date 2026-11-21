// backend/src/controllers/project.controller.js
/**
 * Project Controller
 * Domain: Core Workforce & Project Allocation Resources
 * Author: Varun Adwani <varunadwani512@gmail.com>
 */
import prisma from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

export async function getProjects(req, res, next) {
  try {
    const rawProjects = await prisma.project.findMany({
      include: {
        allocations: {
          where: { status: 'Active' },
          include: {
            employee: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data: compute active headcount and allocated hours
    const projects = rawProjects.map((p) => {
      const activeAllocations = p.allocations || [];
      const peopleCount = activeAllocations.length;
      const hoursUsed = activeAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);

      return {
        id: p.id,
        name: p.name,
        status: p.status,
        createdAt: p.createdAt,
        peopleCount,
        hoursUsed,
        allocations: activeAllocations,
      };
    });

    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const { name, status } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Project name is required', 400);
    }

    const validStatuses = ['Planning', 'In Progress', 'Completed'];
    if (status && !validStatuses.includes(status)) {
      throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        status: status || 'Planning',
      },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}
