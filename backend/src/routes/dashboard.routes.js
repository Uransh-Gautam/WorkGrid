// backend/src/routes/dashboard.routes.js
/**
 * Dashboard Routes
 * Domain: ACID Transactions, Approval Workflows & Dashboard KPIs
 * Author: Shlok Srivastava <shloksrivastava2610@gmail.com>
 */
import express from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.get('/dashboard', getDashboard);

export default router;
