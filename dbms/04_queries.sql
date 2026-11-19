-- =====================================================================
-- PostgreSQL queries for employee workload and project allocation.
-- Written against dbms/03_schema.sql (id, department_id, manager_id ...).
--
-- Conventions
--   * Capacity is assumed to be 40 hours per employee. Change the value
--     in the `capacity` CTEs / filters below if the team uses another.
--   * Only allocation.status = 'active' counts toward current workload.
--   * Parameters use psql variables (e.g. :emp_id). Set them first:
--         \set emp_id 5
-- =====================================================================


-- =====================================================================
-- SECTION 1 : DASHBOARD (Phase 1)
-- =====================================================================

-- 1.1 Active projects, by priority
SELECT p.id,
       p.name,
       p.priority,
       COUNT(a.id)                         AS active_allocations,
       COALESCE(SUM(a.hours_allocated), 0) AS total_hours
FROM   project p
LEFT   JOIN allocation a
       ON a.project_id = p.id AND a.status = 'active'
WHERE  p.status = 'active'
GROUP  BY p.id, p.name, p.priority
ORDER  BY CASE p.priority
              WHEN 'critical' THEN 1
              WHEN 'high'     THEN 2
              WHEN 'medium'   THEN 3
              ELSE 4
          END,
          p.name;

-- 1.2 Current workload for every employee, with a free / normal /
--     overloaded flag
SELECT e.id,
       e.name,
       e.role,
       d.name                                  AS department,
       COALESCE(SUM(a.hours_allocated), 0)     AS active_hours,
       CASE
           WHEN COALESCE(SUM(a.hours_allocated), 0) = 0  THEN 'free'
           WHEN COALESCE(SUM(a.hours_allocated), 0) > 40 THEN 'overloaded'
           ELSE 'normal'
       END                                     AS workload_status
FROM   employee e
JOIN   department d ON d.id = e.department_id
LEFT   JOIN allocation a
       ON a.employee_id = e.id AND a.status = 'active'
GROUP  BY e.id, e.name, e.role, d.name
ORDER  BY active_hours DESC, e.name;

-- 1.3 Free employees (no active allocation)
SELECT e.id, e.name, e.role, d.name AS department
FROM   employee e
JOIN   department d ON d.id = e.department_id
WHERE  NOT EXISTS (
           SELECT 1
           FROM   allocation a
           WHERE  a.employee_id = e.id
             AND  a.status = 'active'
       )
ORDER  BY d.name, e.name;

-- 1.4 Overloaded employees (more than 40 active hours)
SELECT e.id,
       e.name,
       d.name                  AS department,
       SUM(a.hours_allocated)  AS active_hours,
       SUM(a.hours_allocated) - 40 AS hours_over_capacity
FROM   employee e
JOIN   department d ON d.id = e.department_id
JOIN   allocation a ON a.employee_id = e.id AND a.status = 'active'
GROUP  BY e.id, e.name, d.name
HAVING SUM(a.hours_allocated) > 40
ORDER  BY active_hours DESC;

-- 1.5 Employees with spare capacity (some work, but under 40 hours)
SELECT e.id,
       e.name,
       d.name                  AS department,
       SUM(a.hours_allocated)  AS active_hours,
       40 - SUM(a.hours_allocated) AS hours_available
FROM   employee e
JOIN   department d ON d.id = e.department_id
JOIN   allocation a ON a.employee_id = e.id AND a.status = 'active'
GROUP  BY e.id, e.name, d.name
HAVING SUM(a.hours_allocated) < 40
ORDER  BY hours_available DESC;

-- 1.6 One-row dashboard summary
SELECT
    (SELECT COUNT(*) FROM project WHERE status = 'active')           AS active_projects,
    (SELECT COUNT(*) FROM employee e
      WHERE NOT EXISTS (SELECT 1 FROM allocation a
                        WHERE a.employee_id = e.id
                          AND a.status = 'active'))                  AS free_employees,
    (SELECT COUNT(*) FROM (
         SELECT employee_id
         FROM   allocation
         WHERE  status = 'active'
         GROUP  BY employee_id
         HAVING SUM(hours_allocated) > 40) o)                        AS overloaded_employees,
    (SELECT COUNT(*) FROM approval_request WHERE status = 'pending') AS pending_approvals;


-- =====================================================================
-- SECTION 2 : ALLOCATION (create, assign, validate)
-- =====================================================================

-- 2.1 Assign an employee to a project (new assignment, no approval
--     needed) and log it in the history table, in one statement.
WITH new_alloc AS (
    INSERT INTO allocation (employee_id, project_id, start_date, end_date, hours_allocated)
    VALUES (:emp_id, :project_id, CURRENT_DATE, :end_date, :hours)
    RETURNING id
)
INSERT INTO allocation_history (allocation_id, change_type)
SELECT id, 'created' FROM new_alloc;

-- 2.2 Before assigning: how many hours does this employee have left?
SELECT e.id,
       e.name,
       40 - COALESCE(SUM(a.hours_allocated), 0) AS hours_available
FROM   employee e
LEFT   JOIN allocation a
       ON a.employee_id = e.id AND a.status = 'active'
WHERE  e.id = :emp_id
GROUP  BY e.id, e.name;

-- 2.3 Duplicate check: employees with more than one active allocation
--     on the same project
SELECT employee_id, project_id, COUNT(*) AS active_rows
FROM   allocation
WHERE  status = 'active'
GROUP  BY employee_id, project_id
HAVING COUNT(*) > 1;

-- 2.4 Everything an employee is currently working on
SELECT p.name       AS project,
       p.priority,
       a.hours_allocated,
       a.start_date,
       a.end_date
FROM   allocation a
JOIN   project p ON p.id = a.project_id
WHERE  a.employee_id = :emp_id
  AND  a.status = 'active'
ORDER  BY p.priority, a.start_date;

-- 2.5 Everyone currently working on a project
SELECT e.id,
       e.name,
       e.role,
       a.hours_allocated,
       a.start_date,
       a.end_date
FROM   allocation a
JOIN   employee e ON e.id = a.employee_id
WHERE  a.project_id = :project_id
  AND  a.status = 'active'
ORDER  BY e.name;


-- =====================================================================
-- SECTION 3 : FILTERS (team, role, project stage, workload)
-- =====================================================================

-- 3.1 By team (department)
SELECT e.id, e.name, e.role
FROM   employee e
JOIN   department d ON d.id = e.department_id
WHERE  d.name = :'dept_name'
ORDER  BY e.name;

-- 3.2 By role
SELECT e.id, e.name, d.name AS department
FROM   employee e
JOIN   department d ON d.id = e.department_id
WHERE  e.role ILIKE :'role_name'
ORDER  BY d.name, e.name;

-- 3.3 By project stage (status)
SELECT id, name, status, priority
FROM   project
WHERE  status = :'project_status'
ORDER  BY name;

-- 3.4 Combined filter: team + role + workload band
--     (workload_band = 'free' | 'normal' | 'overloaded')
SELECT *
FROM (
    SELECT e.id,
           e.name,
           e.role,
           d.name                              AS department,
           COALESCE(SUM(a.hours_allocated), 0) AS active_hours,
           CASE
               WHEN COALESCE(SUM(a.hours_allocated), 0) = 0  THEN 'free'
               WHEN COALESCE(SUM(a.hours_allocated), 0) > 40 THEN 'overloaded'
               ELSE 'normal'
           END                                 AS workload_band
    FROM   employee e
    JOIN   department d ON d.id = e.department_id
    LEFT   JOIN allocation a
           ON a.employee_id = e.id AND a.status = 'active'
    GROUP  BY e.id, e.name, e.role, d.name
) w
WHERE  (:'dept_name'     = '' OR w.department = :'dept_name')
  AND  (:'role_name'     = '' OR w.role ILIKE :'role_name')
  AND  (:'workload_band' = '' OR w.workload_band = :'workload_band')
ORDER  BY w.active_hours DESC, w.name;


-- =====================================================================
-- SECTION 4 : REPORTING CHAIN
-- =====================================================================

-- 4.1 Direct reports of a manager, with their current load
SELECT e.id,
       e.name,
       e.role,
       COALESCE(SUM(a.hours_allocated), 0) AS active_hours
FROM   employee e
LEFT   JOIN allocation a
       ON a.employee_id = e.id AND a.status = 'active'
WHERE  e.manager_id = :manager_id
GROUP  BY e.id, e.name, e.role
ORDER  BY e.name;

-- 4.2 Full reporting tree below a manager (all levels)
WITH RECURSIVE org AS (
    SELECT id, name, role, manager_id, 1 AS level
    FROM   employee
    WHERE  id = :manager_id
    UNION ALL
    SELECT e.id, e.name, e.role, e.manager_id, o.level + 1
    FROM   employee e
    JOIN   org o ON e.manager_id = o.id
)
SELECT level, id, name, role
FROM   org
ORDER  BY level, name;

-- 4.3 Chain of command above an employee, up to the top
WITH RECURSIVE chain AS (
    SELECT id, name, manager_id, 0 AS steps_up
    FROM   employee
    WHERE  id = :emp_id
    UNION ALL
    SELECT m.id, m.name, m.manager_id, c.steps_up + 1
    FROM   employee m
    JOIN   chain c ON c.manager_id = m.id
)
SELECT steps_up, id, name
FROM   chain
ORDER  BY steps_up;

-- 4.4 Top-level employees (no manager)
SELECT id, name, role
FROM   employee
WHERE  manager_id IS NULL
ORDER  BY name;

-- 4.5 Managers and the size of their team
SELECT m.id,
       m.name        AS manager,
       COUNT(e.id)   AS direct_reports
FROM   employee m
JOIN   employee e ON e.manager_id = m.id
GROUP  BY m.id, m.name
ORDER  BY direct_reports DESC, m.name;


-- =====================================================================
-- SECTION 5 : REASSIGNMENT AND APPROVAL FLOW (Phase 2)
-- =====================================================================

-- 5.1 Raise a reassignment request (stays pending until a manager acts)
INSERT INTO approval_request (requested_by)
VALUES (:requester_id)
RETURNING id, status, created_at;

-- 5.2 Pending requests, oldest first, with the requester's manager
SELECT r.id          AS request_id,
       req.name      AS requested_by,
       mgr.name      AS requester_manager,
       r.created_at,
       NOW() - r.created_at AS waiting_for
FROM   approval_request r
JOIN   employee req ON req.id = r.requested_by
LEFT   JOIN employee mgr ON mgr.id = req.manager_id
WHERE  r.status = 'pending'
ORDER  BY r.created_at;

-- 5.3 Reject a request (no allocation changes)
UPDATE approval_request
SET    status      = 'rejected',
       approved_by = :manager_id
WHERE  id = :request_id
  AND  status = 'pending';

-- 5.4 Approve a request and reassign, as ONE transaction:
--     approve -> close old allocation -> open new allocation -> log both.
--     If any step fails, nothing is saved.
BEGIN;

UPDATE approval_request
SET    status      = 'approved',
       approved_by = :manager_id
WHERE  id = :request_id
  AND  status = 'pending';

UPDATE allocation
SET    status   = 'closed',
       end_date = CURRENT_DATE
WHERE  id = :old_alloc_id
  AND  status = 'active';

INSERT INTO allocation_history (allocation_id, change_type)
VALUES (:old_alloc_id, 'closed');

WITH new_alloc AS (
    INSERT INTO allocation (employee_id, project_id, start_date, hours_allocated)
    VALUES (:emp_id, :new_project_id, CURRENT_DATE, :hours)
    RETURNING id
)
INSERT INTO allocation_history (allocation_id, change_type)
SELECT id, 'reassigned' FROM new_alloc;

COMMIT;

-- 5.5 Close an allocation without replacing it (history is kept)
BEGIN;

UPDATE allocation
SET    status   = 'closed',
       end_date = CURRENT_DATE
WHERE  id = :alloc_id
  AND  status = 'active';

INSERT INTO allocation_history (allocation_id, change_type)
VALUES (:alloc_id, 'closed');

COMMIT;

-- 5.6 Change hours on an active allocation and log it
BEGIN;

UPDATE allocation
SET    hours_allocated = :new_hours
WHERE  id = :alloc_id
  AND  status = 'active';

INSERT INTO allocation_history (allocation_id, change_type)
VALUES (:alloc_id, 'updated');

COMMIT;

-- 5.7 Approval workload per manager (how many decisions they have made)
SELECT m.id,
       m.name AS manager,
       COUNT(*) FILTER (WHERE r.status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE r.status = 'rejected') AS rejected
FROM   approval_request r
JOIN   employee m ON m.id = r.approved_by
GROUP  BY m.id, m.name
ORDER  BY approved DESC, rejected DESC;


-- =====================================================================
-- SECTION 6 : ALLOCATION AND TRANSFER HISTORY
-- =====================================================================

-- 6.1 Full history of one employee's allocations (active and closed)
SELECT a.id        AS allocation_id,
       p.name      AS project,
       a.hours_allocated,
       a.start_date,
       a.end_date,
       a.status
FROM   allocation a
JOIN   project p ON p.id = a.project_id
WHERE  a.employee_id = :emp_id
ORDER  BY a.start_date DESC, a.id DESC;

-- 6.2 Change log for one allocation
SELECT h.id, h.change_type, h.changed_at
FROM   allocation_history h
WHERE  h.allocation_id = :alloc_id
ORDER  BY h.changed_at, h.id;

-- 6.3 Transfer history: every reassignment, with who and which project
SELECT h.changed_at,
       e.name  AS employee,
       p.name  AS project,
       a.hours_allocated
FROM   allocation_history h
JOIN   allocation a ON a.id = h.allocation_id
JOIN   employee   e ON e.id = a.employee_id
JOIN   project    p ON p.id = a.project_id
WHERE  h.change_type = 'reassigned'
ORDER  BY h.changed_at DESC;

-- 6.4 Recent activity feed (last 30 days)
SELECT h.changed_at,
       h.change_type,
       e.name AS employee,
       p.name AS project
FROM   allocation_history h
JOIN   allocation a ON a.id = h.allocation_id
JOIN   employee   e ON e.id = a.employee_id
JOIN   project    p ON p.id = a.project_id
WHERE  h.changed_at >= NOW() - INTERVAL '30 days'
ORDER  BY h.changed_at DESC;

-- 6.5 Number of changes by type, per month
SELECT DATE_TRUNC('month', changed_at)::date AS month,
       change_type,
       COUNT(*)                              AS changes
FROM   allocation_history
GROUP  BY month, change_type
ORDER  BY month DESC, change_type;

-- 6.6 Employees moved between projects most often
SELECT e.id,
       e.name,
       COUNT(*) AS times_reassigned
FROM   allocation_history h
JOIN   allocation a ON a.id = h.allocation_id
JOIN   employee   e ON e.id = a.employee_id
WHERE  h.change_type = 'reassigned'
GROUP  BY e.id, e.name
ORDER  BY times_reassigned DESC, e.name;

-- 6.7 Workload on a past date (what did the team look like then?)
--     An allocation counts if it started on or before the date and was
--     either still open or ended on or after it.
SELECT e.id,
       e.name,
       COALESCE(SUM(a.hours_allocated), 0) AS hours_on_that_date
FROM   employee e
LEFT   JOIN allocation a
       ON  a.employee_id = e.id
       AND a.start_date <= :'as_of_date'::date
       AND (a.end_date IS NULL OR a.end_date >= :'as_of_date'::date)
GROUP  BY e.id, e.name
ORDER  BY hours_on_that_date DESC, e.name;


-- =====================================================================
-- SECTION 7 : PERFORMANCE REVIEWS
-- =====================================================================

-- 7.1 Add a review
INSERT INTO performance_review (employee_id, review_date, notes, score)
VALUES (:emp_id, CURRENT_DATE, :'notes', :score);

-- 7.2 Review history for one employee
SELECT review_date, score, notes
FROM   performance_review
WHERE  employee_id = :emp_id
ORDER  BY review_date DESC;

-- 7.3 Latest review for every employee
SELECT DISTINCT ON (e.id)
       e.id,
       e.name,
       r.review_date,
       r.score
FROM   employee e
LEFT   JOIN performance_review r ON r.employee_id = e.id
ORDER  BY e.id, r.review_date DESC NULLS LAST;

-- 7.4 Monthly review report: reviews done and average score
SELECT DATE_TRUNC('month', review_date)::date AS month,
       COUNT(*)                               AS reviews,
       ROUND(AVG(score), 2)                   AS avg_score,
       MIN(score)                             AS lowest,
       MAX(score)                             AS highest
FROM   performance_review
GROUP  BY month
ORDER  BY month DESC;

-- 7.5 Employees with no review in the last 6 months
SELECT e.id, e.name, MAX(r.review_date) AS last_review
FROM   employee e
LEFT   JOIN performance_review r ON r.employee_id = e.id
GROUP  BY e.id, e.name
HAVING MAX(r.review_date) IS NULL
    OR MAX(r.review_date) < CURRENT_DATE - INTERVAL '6 months'
ORDER  BY last_review NULLS FIRST, e.name;

-- 7.6 Workload against performance: heavily loaded employees and
--     their average review score
SELECT e.id,
       e.name,
       COALESCE(w.active_hours, 0) AS active_hours,
       ROUND(AVG(r.score), 2)      AS avg_score
FROM   employee e
LEFT   JOIN (
           SELECT employee_id, SUM(hours_allocated) AS active_hours
           FROM   allocation
           WHERE  status = 'active'
           GROUP  BY employee_id
       ) w ON w.employee_id = e.id
LEFT   JOIN performance_review r ON r.employee_id = e.id
GROUP  BY e.id, e.name, w.active_hours
ORDER  BY active_hours DESC, avg_score;


-- =====================================================================
-- SECTION 8 : DEPARTMENT-WISE REPORTS
-- =====================================================================

-- 8.1 Headcount, allocated hours and utilization per department
--     utilization % = active hours / (headcount * 40) * 100
SELECT d.id,
       d.name                                         AS department,
       COUNT(DISTINCT e.id)                           AS headcount,
       COALESCE(SUM(a.hours_allocated), 0)            AS active_hours,
       COUNT(DISTINCT e.id) * 40                      AS capacity_hours,
       ROUND(COALESCE(SUM(a.hours_allocated), 0) * 100.0
             / NULLIF(COUNT(DISTINCT e.id) * 40, 0), 1) AS utilization_pct
FROM   department d
LEFT   JOIN employee e ON e.department_id = d.id
LEFT   JOIN allocation a
       ON a.employee_id = e.id AND a.status = 'active'
GROUP  BY d.id, d.name
ORDER  BY utilization_pct DESC NULLS LAST;

-- 8.2 Free and overloaded counts per department
SELECT d.name AS department,
       COUNT(*) FILTER (WHERE w.active_hours = 0)  AS free,
       COUNT(*) FILTER (WHERE w.active_hours BETWEEN 1 AND 40) AS normal,
       COUNT(*) FILTER (WHERE w.active_hours > 40) AS overloaded
FROM   department d
JOIN   employee e ON e.department_id = d.id
JOIN   (
           SELECT e2.id AS employee_id,
                  COALESCE(SUM(a.hours_allocated), 0) AS active_hours
           FROM   employee e2
           LEFT   JOIN allocation a
                  ON a.employee_id = e2.id AND a.status = 'active'
           GROUP  BY e2.id
       ) w ON w.employee_id = e.id
GROUP  BY d.name
ORDER  BY d.name;

-- 8.3 Projects each department is contributing to
SELECT d.name              AS department,
       p.name              AS project,
       COUNT(DISTINCT e.id) AS employees,
       SUM(a.hours_allocated) AS hours
FROM   allocation a
JOIN   employee   e ON e.id = a.employee_id
JOIN   department d ON d.id = e.department_id
JOIN   project    p ON p.id = a.project_id
WHERE  a.status = 'active'
GROUP  BY d.name, p.name
ORDER  BY d.name, hours DESC;

-- 8.4 Average review score per department
SELECT d.name                  AS department,
       COUNT(r.id)             AS reviews,
       ROUND(AVG(r.score), 2)  AS avg_score
FROM   department d
JOIN   employee e ON e.department_id = d.id
LEFT   JOIN performance_review r ON r.employee_id = e.id
GROUP  BY d.name
ORDER  BY avg_score DESC NULLS LAST;

-- 8.5 Departments with no employees
SELECT d.id, d.name
FROM   department d
LEFT   JOIN employee e ON e.department_id = d.id
WHERE  e.id IS NULL;


-- =====================================================================
-- SECTION 9 : ANALYTICS (utilization, overdue work, task closure)
-- =====================================================================

-- 9.1 Utilization rate per employee
SELECT e.id,
       e.name,
       COALESCE(SUM(a.hours_allocated), 0) AS active_hours,
       ROUND(COALESCE(SUM(a.hours_allocated), 0) * 100.0 / 40, 1) AS utilization_pct
FROM   employee e
LEFT   JOIN allocation a
       ON a.employee_id = e.id AND a.status = 'active'
GROUP  BY e.id, e.name
ORDER  BY utilization_pct DESC, e.name;

-- 9.2 Organisation-wide utilization
SELECT COUNT(*)                                     AS employees,
       COALESCE(SUM(w.hours), 0)                    AS active_hours,
       COUNT(*) * 40                                AS capacity_hours,
       ROUND(COALESCE(SUM(w.hours), 0) * 100.0 / (COUNT(*) * 40), 1) AS utilization_pct
FROM   employee e
LEFT   JOIN (
           SELECT employee_id, SUM(hours_allocated) AS hours
           FROM   allocation
           WHERE  status = 'active'
           GROUP  BY employee_id
       ) w ON w.employee_id = e.id;

-- 9.3 Overdue work: allocations still active after their end date
SELECT a.id          AS allocation_id,
       e.name        AS employee,
       p.name        AS project,
       a.end_date,
       CURRENT_DATE - a.end_date AS days_overdue
FROM   allocation a
JOIN   employee e ON e.id = a.employee_id
JOIN   project  p ON p.id = a.project_id
WHERE  a.status = 'active'
  AND  a.end_date IS NOT NULL
  AND  a.end_date < CURRENT_DATE
ORDER  BY days_overdue DESC;

-- 9.4 Allocations ending in the next 14 days
SELECT a.id,
       e.name AS employee,
       p.name AS project,
       a.end_date
FROM   allocation a
JOIN   employee e ON e.id = a.employee_id
JOIN   project  p ON p.id = a.project_id
WHERE  a.status = 'active'
  AND  a.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
ORDER  BY a.end_date;

-- 9.5 Closure rate per project (closed allocations / all allocations)
SELECT p.id,
       p.name,
       p.status,
       COUNT(a.id)                                          AS total_allocations,
       COUNT(*) FILTER (WHERE a.status = 'closed')          AS closed,
       ROUND(COUNT(*) FILTER (WHERE a.status = 'closed') * 100.0
             / NULLIF(COUNT(a.id), 0), 1)                   AS closure_pct
FROM   project p
LEFT   JOIN allocation a ON a.project_id = p.id
GROUP  BY p.id, p.name, p.status
ORDER  BY closure_pct DESC NULLS LAST;

-- 9.6 Allocations closed per month
SELECT DATE_TRUNC('month', end_date)::date AS month,
       COUNT(*)                            AS closed_allocations,
       SUM(hours_allocated)                AS hours_released
FROM   allocation
WHERE  status = 'closed'
  AND  end_date IS NOT NULL
GROUP  BY month
ORDER  BY month DESC;

-- 9.7 Average length of an allocation, in days, per project
SELECT p.name,
       ROUND(AVG(a.end_date - a.start_date), 1) AS avg_days
FROM   allocation a
JOIN   project p ON p.id = a.project_id
WHERE  a.end_date IS NOT NULL
GROUP  BY p.name
ORDER  BY avg_days DESC;

-- 9.8 Projects at risk: active, high or critical priority, with no
--     one allocated
SELECT p.id, p.name, p.priority
FROM   project p
WHERE  p.status = 'active'
  AND  p.priority IN ('high', 'critical')
  AND  NOT EXISTS (
           SELECT 1
           FROM   allocation a
           WHERE  a.project_id = p.id
             AND  a.status = 'active'
       )
ORDER  BY p.priority, p.name;

-- 9.9 Who to assign next: free or under-loaded employees ranked by
--     spare hours, best review score as the tiebreaker
SELECT e.id,
       e.name,
       e.role,
       40 - COALESCE(SUM(a.hours_allocated), 0) AS hours_available,
       (SELECT ROUND(AVG(r.score), 2)
        FROM   performance_review r
        WHERE  r.employee_id = e.id)            AS avg_score
FROM   employee e
LEFT   JOIN allocation a
       ON a.employee_id = e.id AND a.status = 'active'
GROUP  BY e.id, e.name, e.role
HAVING COALESCE(SUM(a.hours_allocated), 0) < 40
ORDER  BY hours_available DESC, avg_score DESC NULLS LAST
LIMIT  10;

-- 9.10 Data-integrity check: closed allocations with no end date, or
--      active allocations that have no 'created' history row
SELECT a.id, a.status, a.end_date, 'closed without end_date' AS problem
FROM   allocation a
WHERE  a.status = 'closed' AND a.end_date IS NULL
UNION ALL
SELECT a.id, a.status, a.end_date, 'no created history row'
FROM   allocation a
WHERE  NOT EXISTS (
           SELECT 1
           FROM   allocation_history h
           WHERE  h.allocation_id = a.id
             AND  h.change_type = 'created'
       )
ORDER  BY 1;
