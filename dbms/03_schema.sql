-- =====================================================================
-- WorkGrid : 03_schema.sql
-- PostgreSQL schema for employee workload and project allocation.
-- Mirrors the ER diagram (7 tables).
-- Run order: department -> employee -> project -> allocation ->
--            allocation_history -> performance_review -> approval_request
-- =====================================================================

DROP TABLE IF EXISTS approval_request    CASCADE;
DROP TABLE IF EXISTS performance_review  CASCADE;
DROP TABLE IF EXISTS allocation_history  CASCADE;
DROP TABLE IF EXISTS allocation          CASCADE;
DROP TABLE IF EXISTS project             CASCADE;
DROP TABLE IF EXISTS employee            CASCADE;
DROP TABLE IF EXISTS department          CASCADE;


-- ---------------------------------------------------------------------
-- DEPARTMENT
-- ---------------------------------------------------------------------
CREATE TABLE department (
    id    SERIAL       PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE
);


-- ---------------------------------------------------------------------
-- EMPLOYEE
-- manager_id references employee itself (reporting chain).
-- ---------------------------------------------------------------------
CREATE TABLE employee (
    id             SERIAL       PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    role           VARCHAR(100) NOT NULL,
    department_id   INT          NOT NULL
                   REFERENCES department(id) ON DELETE RESTRICT,
    manager_id     INT
                   REFERENCES employee(id) ON DELETE SET NULL,
    CONSTRAINT chk_employee_not_own_manager
        CHECK (manager_id IS NULL OR manager_id <> id)
);


-- ---------------------------------------------------------------------
-- PROJECT
-- ---------------------------------------------------------------------
CREATE TABLE project (
    id        SERIAL       PRIMARY KEY,
    name      VARCHAR(150) NOT NULL UNIQUE,
    status    VARCHAR(20)  NOT NULL DEFAULT 'planned',
    priority  VARCHAR(10)  NOT NULL DEFAULT 'medium',
    CONSTRAINT chk_project_status
        CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
    CONSTRAINT chk_project_priority
        CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);


-- ---------------------------------------------------------------------
-- ALLOCATION
-- An employee linked to a project. Closed allocations are kept, never
-- deleted, so past workload is always recoverable.
-- ---------------------------------------------------------------------
CREATE TABLE allocation (
    id               SERIAL      PRIMARY KEY,
    employee_id       INT         NOT NULL
                     REFERENCES employee(id) ON DELETE RESTRICT,
    project_id        INT         NOT NULL
                     REFERENCES project(id)  ON DELETE RESTRICT,
    start_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
    end_date         DATE,
    hours_allocated  INT         NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT chk_allocation_hours
        CHECK (hours_allocated > 0),
    CONSTRAINT chk_allocation_dates
        CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_allocation_status
        CHECK (status IN ('active', 'closed'))
);


-- ---------------------------------------------------------------------
-- ALLOCATION_HISTORY
-- Basic event log of allocation changes.
-- ---------------------------------------------------------------------
CREATE TABLE allocation_history (
    id             SERIAL      PRIMARY KEY,
    allocation_id   INT         NOT NULL
                   REFERENCES allocation(id) ON DELETE RESTRICT,
    change_type    VARCHAR(20) NOT NULL,
    changed_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_history_change_type
        CHECK (change_type IN ('created', 'updated', 'closed', 'reassigned'))
);


-- ---------------------------------------------------------------------
-- PERFORMANCE_REVIEW
-- ---------------------------------------------------------------------
CREATE TABLE performance_review (
    id           SERIAL PRIMARY KEY,
    employee_id   INT    NOT NULL
                 REFERENCES employee(id) ON DELETE CASCADE,
    review_date   DATE   NOT NULL DEFAULT CURRENT_DATE,
    notes        TEXT,
    score        INT    NOT NULL,
    CONSTRAINT chk_review_score
        CHECK (score BETWEEN 1 AND 10)
);


-- ---------------------------------------------------------------------
-- APPROVAL_REQUEST
-- Stores allocation change/reassignment proposals awaiting approval.
-- ---------------------------------------------------------------------
CREATE TABLE approval_request (
    id                         SERIAL      PRIMARY KEY,
    allocation_id               INT         NOT NULL
                                REFERENCES allocation(id) ON DELETE RESTRICT,
    requested_by                INT         NOT NULL
                                REFERENCES employee(id) ON DELETE RESTRICT,
    approved_by                 INT
                                REFERENCES employee(id) ON DELETE RESTRICT,
    requested_employee_id        INT         NOT NULL
                                REFERENCES employee(id) ON DELETE RESTRICT,
    requested_project_id         INT         NOT NULL
                                REFERENCES project(id) ON DELETE RESTRICT,
    CREATE INDEX idx_approval_allocation
    ON approval_request(allocation_id);

CREATE INDEX idx_approval_requested_employee
    ON approval_request(requested_employee_id);

CREATE INDEX idx_approval_requested_project
    ON approval_request(requested_project_id);
