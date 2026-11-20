// backend/src/controllers/department.controller.js
import prisma from '../config/db.js';

export async function getDepartments(req, res, next) {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (err) {
    next(err);
  }
}
