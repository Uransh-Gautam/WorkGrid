// backend/src/routes/department.routes.js
/**
 * Department Routes
 * Domain: Core Workforce & Project Allocation Resources
 * Author: Varun Adwani <varunadwani512@gmail.com>
 */
import express from 'express';
import { getDepartments } from '../controllers/department.controller.js';

const router = express.Router();

router.get('/departments', getDepartments);

export default router;
