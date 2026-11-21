// backend/src/controllers/department.controller.js
/**
 * Department Controller
 * Domain: Core Workforce & Project Allocation Resources
 * Author: Varun Adwani <varunadwani512@gmail.com>
 */
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
