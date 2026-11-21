// backend/src/routes/employee.routes.js
/**
 * Employee Routes
 * Domain: Core Workforce & Project Allocation Resources
 * Author: Varun Adwani <varunadwani512@gmail.com>
 */
import express from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
} from '../controllers/employee.controller.js';

const router = express.Router();

router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployeeById);
router.post('/employees', createEmployee);

export default router;
