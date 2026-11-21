// backend/src/app.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import departmentRoutes from './routes/department.routes.js';
import projectRoutes from './routes/project.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import allocationRoutes from './routes/allocation.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Body parser middleware for JSON payloads
app.use(express.json());

// Mount API routes under /api
app.use('/api', departmentRoutes);
app.use('/api', projectRoutes);
app.use('/api', employeeRoutes);
app.use('/api', allocationRoutes);
app.use('/api', approvalRoutes);
app.use('/api', dashboardRoutes);

// Serve frontend static assets (HTML, js/api.js, js/layout.js, js/pages/*)
const frontendDir = path.join(__dirname, '../../frontend');
app.use(express.static(frontendDir));

// Clean URL route handlers -> serve respective HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(frontendDir, 'dashboard.html'));
});

app.get('/employees', (req, res) => {
  res.sendFile(path.join(frontendDir, 'employees.html'));
});

app.get('/projects', (req, res) => {
  res.sendFile(path.join(frontendDir, 'projects.html'));
});

app.get('/allocations', (req, res) => {
  res.sendFile(path.join(frontendDir, 'allocations.html'));
});

app.get('/approvals', (req, res) => {
  res.sendFile(path.join(frontendDir, 'approvals.html'));
});

// 404 handler for unmatched routes
app.use(notFound);

// Central error handler middleware
app.use(errorHandler);

export default app;
