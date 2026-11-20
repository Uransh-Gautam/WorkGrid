// backend/src/routes/allocation.routes.js
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
