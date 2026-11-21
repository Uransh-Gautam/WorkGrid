// backend/src/routes/index.js
import express from 'express';
import healthRoutes from './health.routes.js';
import departmentRoutes from './department.routes.js';
import projectRoutes from './project.routes.js';
import employeeRoutes from './employee.routes.js';
import allocationRoutes from './allocation.routes.js';
import approvalRoutes from './approval.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = express.Router();

router.use(healthRoutes);
router.use(departmentRoutes);
router.use(projectRoutes);
router.use(employeeRoutes);
router.use(allocationRoutes);
router.use(approvalRoutes);
router.use(dashboardRoutes);

export default router;
