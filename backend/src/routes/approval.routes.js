// backend/src/routes/approval.routes.js
/**
 * Approval Routes
 * Domain: ACID Transactions, Approval Workflows & Dashboard KPIs
 * Author: Shlok Srivastava <shloksrivastava2610@gmail.com>
 */
import express from 'express';
import {
  getApprovals,
  getApprovalById,
  createReassignmentRequest,
  decideApproval,
} from '../controllers/approval.controller.js';

const router = express.Router();

router.get('/approvals', getApprovals);
router.get('/approvals/:id', getApprovalById);
router.post('/approvals', createReassignmentRequest);
router.patch('/approvals/:id', decideApproval);

export default router;
