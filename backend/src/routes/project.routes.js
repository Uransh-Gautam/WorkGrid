// backend/src/routes/project.routes.js
/**
 * Project Routes
 * Domain: Core Workforce & Project Allocation Resources
 * Author: Varun Adwani <varunadwani512@gmail.com>
 */
import express from 'express';
import { getProjects, createProject } from '../controllers/project.controller.js';

const router = express.Router();

router.get('/projects', getProjects);
router.post('/projects', createProject);

export default router;
