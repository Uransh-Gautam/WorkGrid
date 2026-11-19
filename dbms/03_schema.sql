-- =====================================================================
-- WorkGrid : 03_schema.sql
-- PostgreSQL schema for employee workload and project allocation.
-- Database: PostgreSQL
-- Tables: 7
-- =====================================================================

-- ---------------------------------------------------------------------
-- DROP TABLES (reverse dependency order)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS approval_request CASCADE;
DROP TABLE IF EXISTS performance_review CASCADE;
DROP TABLE IF EXISTS allocation_history CASCADE;
DROP TABLE IF EXISTS allocation CASCADE;
DROP TABLE IF EXISTS project CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS department CASCADE;


-- ---------------------------------------------------------------------
-- 1. DEPARTMENT
-- ---------------------------------------------------------------------
CREATE TABLE department (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);


-- ---------------------------------------------------------------------
-- 2. EMPLOYEE
-- manager_id references employee itself (reporting hierarchy).
-- ---------------------------------------------------------------------
CREATE TABLE employee (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    role         VARCHAR(100) NOT NULL,
    department_id INT NOT NULL
                 REFERENCES department(id) ON DELETE RESTRICT,
    manager_id   INT
                 REFERENCES employee(id) ON DELETE SET NULL,

    CONSTRAINT chk_employee_not_own_manager
        CHECK (manager_id IS NULL OR manager_id <> id)
);


-- ---------------------------------------------------------------------
-- 3. PROJECT
-- ---------------------------------------------------------------------
CREATE TABLE project (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(150) NOT NULL UNIQUE,
    status   VARCHAR(20) NOT NULL DEFAULT 'planned',
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',

    CONSTRAINT chk_project_status
        CHECK (status IN (
            'planned', 'active', 'on_hold', 'completed', 'cancelled'
        )),

    CONSTRAINT chk_project_priority
        CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);


-- ---------------------------------------------------------------------
-- 4. ALLOCATION
-- An employee is allocated to a project for a specified workload.
-- Closed allocations are retained for historical records.
-- ---------------------------------------------------------------------
CREATE TABLE allocation (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL
                    REFERENCES employee(id) ON DELETE RESTRICT,
    project_id      INT NOT NULL
                    REFERENCES project(id) ON DELETE RESTRICT,
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    hours_allocated INT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',

    CONSTRAINT chk_allocation_hours
        CHECK (hours_allocated > 0),

    CONSTRAINT chk_allocation_dates
        CHECK (end_date IS NULL OR end_date >= start_date),

    CONSTRAINT chk_allocation_status
        CHECK (status IN ('active', 'closed'))
);


-- ---------------------------------------------------------------------
-- 5. ALLOCATION_HISTORY
-- Basic event log of allocation changes.
-- ---------------------------------------------------------------------
CREATE TABLE allocation_history (
    id           SERIAL PRIMARY KEY,
    allocation_id INT NOT NULL
                  REFERENCES allocation(id) ON DELETE RESTRICT,
    change_type  VARCHAR(20) NOT NULL,
    changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_history_change_type
        CHECK (change_type IN (
            'created', 'updated', 'closed', 'reassigned'
        ))
);


-- ---------------------------------------------------------------------
-- 6. PERFORMANCE_REVIEW
-- ---------------------------------------------------------------------
CREATE TABLE performance_review (
    id          SERIAL PRIMARY KEY,
    employee_id INT NOT NULL
                REFERENCES employee(id) ON DELETE CASCADE,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes       TEXT,
    score      INT NOT NULL,

    CONSTRAINT chk_review_score
        CHECK (score BETWEEN 1 AND 10)
);


-- ---------------------------------------------------------------------
-- 7. APPROVAL_REQUEST
-- Stores proposed allocation changes/reassignments awaiting approval.
-- The current allocation remains unchanged until approval is granted.
-- ---------------------------------------------------------------------
CREATE TABLE approval_request (
    id SERIAL PRIMARY KEY,

    -- Existing allocation being modified
    allocation_id INT NOT NULL
                  REFERENCES allocation(id) ON DELETE RESTRICT,

    -- Employee who submits the request
    requested_by INT NOT NULL
                  REFERENCES employee(id) ON DELETE RESTRICT,

    -- Manager/employee who reviews the request
    approved_by INT
                REFERENCES employee(id) ON DELETE RESTRICT,

    -- Proposed allocation details
    requested_employee_id INT NOT NULL
                         REFERENCES employee(id) ON DELETE RESTRICT,

    requested_project_id INT NOT NULL
                        REFERENCES project(id) ON DELETE RESTRICT,

    requested_hours_allocated INT NOT NULL,

    requested_start_date DATE NOT NULL DEFAULT CURRENT_DATE,

    requested_end_date DATE,

    -- Approval status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_approval_status
        CHECK (status IN ('pending', 'approved', 'rejected')),

    CONSTRAINT chk_approval_not_self
        CHECK (approved_by IS NULL OR approved_by <> requested_by),

    CONSTRAINT chk_requested_hours
        CHECK (requested_hours_allocated > 0),

    CONSTRAINT chk_requested_dates
        CHECK (
            requested_end_date IS NULL
            OR requested_end_date >= requested_start_date
        )
);


-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------

-- Employee
CREATE INDEX idx_employee_department
    ON employee(department_id);

CREATE INDEX idx_employee_manager
    ON employee(manager_id);

-- Project
CREATE INDEX idx_project_status
    ON project(status);

-- Allocation
CREATE INDEX idx_allocation_employee
    ON allocation(employee_id);

CREATE INDEX idx_allocation_project
    ON allocation(project_id);

CREATE INDEX idx_allocation_status
    ON allocation(status);

-- Allocation history
CREATE INDEX idx_history_allocation
    ON allocation_history(allocation_id);

-- Performance reviews
CREATE INDEX idx_review_employee
    ON performance_review(employee_id);

-- Approval requests
CREATE INDEX idx_approval_requested_by
    ON approval_request(requested_by);

CREATE INDEX idx_approval_approved_by
    ON approval_request(approved_by);

CREATE INDEX idx_approval_status
    ON approval_request(status);

CREATE INDEX idx_approval_allocation
    ON approval_request(allocation_id);

CREATE INDEX idx_approval_requested_employee
    ON approval_request(requested_employee_id);

CREATE INDEX idx_approval_requested_project
    ON approval_request(requested_project_id);


-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
