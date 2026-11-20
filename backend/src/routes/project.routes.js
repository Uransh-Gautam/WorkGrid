// backend/src/routes/project.routes.js
import express from 'express';
import { getProjects, createProject } from '../controllers/project.controller.js';

const router = express.Router();

router.get('/projects', getProjects);
router.post('/projects', createProject);

export default router;
