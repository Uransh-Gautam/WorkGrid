# WorkGrid — Employee Workload & Project Allocation System

WorkGrid is an operational workload and project allocation platform built for engineering managers. It answers three fundamental questions every day: **who is free**, **who is overloaded**, and **who should be assigned to what**. Every assignment, reassignment, and approval is persisted in PostgreSQL with a permanent historical audit trail.

It is an **APDE project** (Advanced Programming + Data Engineering):
- **AP Part**: Modern web application built with Node.js, Express.js, and clean Vanilla JavaScript / HTML5 / Tailwind CSS.
- **DE Part**: Relational database architecture using PostgreSQL and Prisma ORM with strict referential integrity, indexes, and atomic ACID transactions.

---

## Tech Stack

- **Runtime**: Node.js 20+
- **Backend Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma ORM (pinned to `prisma@6` and `@prisma/client@6`)
- **Frontend Architecture**: Clean vanilla JavaScript (no framework, zero build step) + HTML5 + Tailwind CSS (CDN) + Material Symbols + Inter font.
- **Layered Design**: `routes -> controllers -> services -> repositories -> Prisma ORM -> PostgreSQL`

---

## Clean, Student-Friendly Architecture

```
WorkGrid/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma schema (6 relational models)
│   │   ├── migrations/             # Database migration files
│   │   └── seed.js                 # Realistic demonstration seed script
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # Centralized PrismaClient instance
│   │   ├── routes/                 # Express route definitions
│   │   ├── controllers/            # Request parsing & HTTP response formatting
│   │   ├── services/               # Business rules, validation & workload logic
│   │   ├── repositories/           # Direct database query layer (Prisma calls)
│   │   ├── middlewares/            # Central errorHandler and validator
│   │   └── app.js                  # Express app, static serving & route handlers
│   ├── server.js                   # Application server entry point
│   ├── .env.example                # Example environment template
│   └── package.json
├── frontend/
│   ├── index.html                  # Entry point (redirects to dashboard)
│   ├── dashboard.html              # Executive KPI & Capacity Overview
│   ├── employees.html              # Workforce Directory & Filtering
│   ├── projects.html               # Project Portfolio & Staffing
│   ├── allocations.html            # Resource Allocations & History Log
│   ├── approvals.html              # Manager Authorization Workflow
│   └── js/
│       ├── api.js                  # Single centralized API client & formatters
│       ├── layout.js               # Shared dynamic sidebar & header injector
│       └── pages/                  # Page-specific DOM controllers
│           ├── dashboard.js        # Dashboard data loading & quick approvals
│           ├── employees.js        # Filter events & new employee modal
│           ├── projects.js         # Project table & new project modal
│           ├── allocations.js      # Tabs, assignment modal & projected load
│           └── approvals.js        # Master-detail queue & decision handlers
├── .gitignore
└── README.md
```

---

## Core Business Rules

1. **Workload Computation**: Workload is never stored statically. It is dynamically computed as the sum of `hoursPerWeek` across all `Active` allocations for an employee:
   - **Free**: Under 20 hrs/week (Green status badge)
   - **Active**: 20 to 40 hrs/week (Blue status badge)
   - **Overloaded**: Greater than 40 hrs/week (Red status badge)

2. **Direct Allocation & Capacity Warning**: New allocations are created directly without approval. If an allocation causes an employee to exceed their weekly capacity (typically 40 hrs/week), the allocation is created, but the API returns an over-capacity warning and the UI displays a warning notification. It is not blocked.

3. **Atomic Reassignment & Approval Transaction**: Initiating a reassignment creates an `ApprovalRequest` with status `Pending`. When a manager approves the request, all of the following operations execute inside a single atomic database transaction (`prisma.$transaction`):
   - Re-verifies that the request status is still `Pending`
   - Closes the existing allocation (`status = 'Closed'`, `endedAt = now`)
   - Activates the new allocation (`status = 'Active'`, `startedAt = now`)
   - Writes two `AllocationHistory` log rows (one for the closure and one for the new assignment)
   - Updates the approval request status to `Approved` with `decidedAt = now` and `decidedById`
   *(If rejected, only the request status transitions to `Rejected`).*

4. **Permanent Audit Trail**: Every allocation modification writes an immutable record to `AllocationHistory`. Past allocations are never deleted, only closed.

---

## Database Models

The schema consists of 6 models:

1. **Department**: Organization unit (`id`, `name`).
2. **Employee**: Team members (`id`, `name`, `email`, `role`, `capacity`, `departmentId`, `managerId`, `createdAt`).
3. **Project**: Deliverable initiatives (`id`, `name`, `status`, `createdAt`).
4. **Allocation**: Active or closed assignment linking Employee to Project (`id`, `employeeId`, `projectId`, `hoursPerWeek`, `status`, `startedAt`, `endedAt`).
5. **AllocationHistory**: Immutable append-only log (`id`, `allocationId`, `employeeId`, `changeType`, `details`, `changedAt`).
6. **ApprovalRequest**: Manager workflow authorization (`id`, `employeeId`, `fromAllocationId`, `toProjectId`, `hoursPerWeek`, `justification`, `requestedById`, `decidedById`, `status`, `createdAt`, `decidedAt`).

---

## Setup & Running

### 1. Prerequisites
- Node.js (v20 or higher)
- PostgreSQL database instance running locally or hosted

### 2. Environment Configuration
Navigate to the `backend/` directory and configure your `.env` file:
```bash
cd backend
cp .env.example .env
```
Update `DATABASE_URL` in `backend/.env` with your PostgreSQL credentials:
```env
PORT=3000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/workgrid?schema=public"
```

### 3. Database Migration
Run the initial Prisma migration:
```bash
npm run db:migrate
```

### 4. (Optional) Seed Demo Data
To populate realistic engineering data (4 departments, 10 employees, 5 projects, allocations, approvals):
```bash
npm run db:seed
```

### 5. Start the Application
Start the backend server in development mode:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```
All feature routes and API endpoints are fully active and interconnected.
