// backend/src/routes/employee.routes.js
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
