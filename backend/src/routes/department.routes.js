// backend/src/routes/department.routes.js
import express from 'express';
import { getDepartments } from '../controllers/department.controller.js';

const router = express.Router();

router.get('/departments', getDepartments);

export default router;
