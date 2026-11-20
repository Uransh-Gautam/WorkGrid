// backend/src/routes/health.routes.js
import express from 'express';
import prisma from '../config/db.js';

const router = express.Router();

router.get('/health', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    next(err);
  }
});

export default router;
