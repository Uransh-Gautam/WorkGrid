// backend/src/routes/allocation.routes.js
/**
 * Allocation Routes
 * Domain: ACID Transactions, Approval Workflows & Dashboard KPIs
 * Author: Shlok Srivastava <shloksrivastava2610@gmail.com>
 */
import express from 'express';
import {
  getAllocations,
  getAllocationHistory,
  createAllocation,
} from '../controllers/allocation.controller.js';

const router = express.Router();

router.get('/allocations', getAllocations);
router.get('/allocations/history', getAllocationHistory);
router.post('/allocations', createAllocation);

export default router;
