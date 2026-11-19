
-- WorkGrid | PostgreSQL query set (CP3)
-- Capacity assumption: 40 hours per employee/week (adjust consistently if needed).
-- Only active allocations contribute to current workload.
-- Parameterized examples use psql variables; set values before running.

-- ===================== 1. DASHBOARD =====================
-- 1.1 Active projects ranked by priority
SELECT p.id, p.name, p.priority, COUNT(a.id) AS active_allocations,
       COALESCE(SUM(a.hours_allocated),0) AS allocated_hours
FROM project p LEFT JOIN allocation a ON a.project_id=p.id AND a.status='active'
WHERE p.status='active'
GROUP BY p.id,p.name,p.priority
ORDER BY CASE p.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,p.name;

-- 1.2 Current employee workload and classification
SELECT e.id,e.name,e.role,d.name AS department,
       COALESCE(w.hours,0) AS active_hours,
       CASE WHEN COALESCE(w.hours,0)=0 THEN 'free' WHEN w.hours>40 THEN 'overloaded' ELSE 'normal' END AS workload
FROM employee e JOIN department d ON d.id=e.department_id
LEFT JOIN (SELECT employee_id,SUM(hours_allocated) hours FROM allocation WHERE status='active' GROUP BY employee_id) w ON w.employee_id=e.id
ORDER BY active_hours DESC,e.name;

-- 1.3 Free employees
SELECT e.id,e.name,e.role,d.name department FROM employee e JOIN department d ON d.id=e.department_id
WHERE NOT EXISTS (SELECT 1 FROM allocation a WHERE a.employee_id=e.id AND a.status='active') ORDER BY d.name,e.name;

-- 1.4 Overloaded employees
SELECT e.id,e.name,d.name department,SUM(a.hours_allocated) active_hours,SUM(a.hours_allocated)-40 excess_hours
FROM employee e JOIN department d ON d.id=e.department_id JOIN allocation a ON a.employee_id=e.id AND a.status='active'
GROUP BY e.id,e.name,d.name HAVING SUM(a.hours_allocated)>40 ORDER BY active_hours DESC;

-- 1.5 Employees with spare capacity (nonzero workload, below 40)
SELECT e.id,e.name,d.name department,SUM(a.hours_allocated) active_hours,40-SUM(a.hours_allocated) spare_hours
FROM employee e JOIN department d ON d.id=e.department_id JOIN allocation a ON a.employee_id=e.id AND a.status='active'
GROUP BY e.id,e.name,d.name HAVING SUM(a.hours_allocated) BETWEEN 1 AND 39 ORDER BY spare_hours DESC;

-- 1.6 Dashboard summary
SELECT (SELECT COUNT(*) FROM project WHERE status='active') active_projects,
       (SELECT COUNT(*) FROM employee e WHERE NOT EXISTS(SELECT 1 FROM allocation a WHERE a.employee_id=e.id AND a.status='active')) free_employees,
       (SELECT COUNT(*) FROM (SELECT employee_id FROM allocation WHERE status='active' GROUP BY employee_id HAVING SUM(hours_allocated)>40) x) overloaded_employees,
       (SELECT COUNT(*) FROM approval_request WHERE status='pending') pending_requests;

-- ===================== 2. ALLOCATION =====================
-- 2.1 Employee's current assignments (set :emp_id)
SELECT a.id allocation_id,p.name project,p.priority,a.hours_allocated,a.start_date,a.end_date
FROM allocation a JOIN project p ON p.id=a.project_id WHERE a.employee_id=:emp_id AND a.status='active' ORDER BY a.start_date;
-- 2.2 Project team (set :project_id)
SELECT e.id,e.name,e.role,a.hours_allocated,a.start_date,a.end_date FROM allocation a JOIN employee e ON e.id=a.employee_id
WHERE a.project_id=:project_id AND a.status='active' ORDER BY e.name;
-- 2.3 Check duplicate active employee-project allocations
SELECT employee_id,project_id,COUNT(*) duplicate_count FROM allocation WHERE status='active' GROUP BY employee_id,project_id HAVING COUNT(*)>1;
-- 2.4 Employee hours available (set :emp_id)
SELECT e.id,e.name,40-COALESCE(SUM(a.hours_allocated),0) hours_available
FROM employee e LEFT JOIN allocation a ON a.employee_id=e.id AND a.status='active'
WHERE e.id=:emp_id GROUP BY e.id,e.name;
-- 2.5 Insert allocation and record its creation atomically (set :emp_id, :project_id, :hours, :end_date)
BEGIN;
WITH inserted AS (INSERT INTO allocation(employee_id,project_id,start_date,end_date,hours_allocated)
 VALUES(:emp_id,:project_id,CURRENT_DATE,:end_date,:hours) RETURNING id)
INSERT INTO allocation_history(allocation_id,change_type) SELECT id,'created' FROM inserted;
COMMIT;
-- 2.6 Allocations ending soon (next 14 days)
SELECT a.id,e.name employee,p.name project,a.end_date FROM allocation a JOIN employee e ON e.id=a.employee_id JOIN project p ON p.id=a.project_id
WHERE a.status='active' AND a.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE+14 ORDER BY a.end_date;
-- ===================== 3. FILTERS =====================
-- 3.1 Filter employees by department (set :dept_name)
SELECT e.id,e.name,e.role,d.name department FROM employee e JOIN department d ON d.id=e.department_id WHERE d.name=:dept_name ORDER BY e.name;
-- 3.2 Filter employees by role (set :role_pattern, e.g. '%engineer%')
SELECT e.id,e.name,e.role,d.name department FROM employee e JOIN department d ON d.id=e.department_id WHERE e.role ILIKE :role_pattern ORDER BY d.name,e.name;
-- 3.3 Projects by status (set :project_status)
SELECT id,name,status,priority FROM project WHERE status=:project_status ORDER BY name;
-- 3.4 Combined department/role/workload filters. Empty strings disable a filter (set :dept_filter, :role_filter, :workload_filter)
WITH employee_load AS (SELECT e.id,e.name,e.role,d.name department,COALESCE(SUM(a.hours_allocated),0) hours
 FROM employee e JOIN department d ON d.id=e.department_id LEFT JOIN allocation a ON a.employee_id=e.id AND a.status='active'
 GROUP BY e.id,e.name,e.role,d.name)
SELECT *,CASE WHEN hours=0 THEN 'free' WHEN hours>40 THEN 'overloaded' ELSE 'normal' END workload
FROM employee_load WHERE (:dept_filter='' OR department=:dept_filter) AND (:role_filter='' OR role ILIKE :role_filter)
AND (:workload_filter='' OR CASE WHEN hours=0 THEN 'free' WHEN hours>40 THEN 'overloaded' ELSE 'normal' END=:workload_filter)
ORDER BY hours DESC,name;
-- ===================== 4. REPORTING STRUCTURE =====================
-- 4.1 Direct reports and their active hours (set :manager_id)
SELECT e.id,e.name,e.role,COALESCE(SUM(a.hours_allocated),0) active_hours FROM employee e
LEFT JOIN allocation a ON a.employee_id=e.id AND a.status='active' WHERE e.manager_id=:manager_id
GROUP BY e.id,e.name,e.role ORDER BY e.name;
-- 4.2 Recursive team tree including manager (set :manager_id)
WITH RECURSIVE org AS (SELECT id,name,role,manager_id,1 depth FROM employee WHERE id=:manager_id
 UNION ALL SELECT e.id,e.name,e.role,e.manager_id,o.depth+1 FROM employee e JOIN org o ON e.manager_id=o.id)
SELECT depth,id,name,role,manager_id FROM org ORDER BY depth,name;
-- 4.3 Chain upward from employee to top (set :emp_id)
WITH RECURSIVE chain AS (SELECT id,name,manager_id,0 steps FROM employee WHERE id=:emp_id
 UNION ALL SELECT m.id,m.name,m.manager_id,c.steps+1 FROM employee m JOIN chain c ON c.manager_id=m.id)
SELECT steps,id,name,manager_id FROM chain ORDER BY steps;
-- 4.4 Top-level employees
SELECT id,name,role FROM employee WHERE manager_id IS NULL ORDER BY name;
-- 4.5 Managers and number of direct reports
SELECT m.id,m.name manager,COUNT(e.id) direct_reports FROM employee m JOIN employee e ON e.manager_id=m.id
GROUP BY m.id,m.name ORDER BY direct_reports DESC,m.name;
-- ===================== 5. APPROVAL WORKFLOW =====================

-- 5.1 Submit a proposed allocation change
-- Set: :allocation_id, :requester_id, :proposed_employee_id,
--      :proposed_project_id, :proposed_hours,
--      :proposed_start_date, :proposed_end_date

INSERT INTO approval_request (
    allocation_id,
    requested_by,
    requested_employee_id,
    requested_project_id,
    requested_hours_allocated,
    requested_start_date,
    requested_end_date
)
VALUES (
    :allocation_id,
    :requester_id,
    :proposed_employee_id,
    :proposed_project_id,
    :proposed_hours,
    :proposed_start_date,
    :proposed_end_date
)
RETURNING id, status, created_at;


-- 5.2 Pending approval requests with requester and reporting manager

SELECT
    r.id AS request_id,
    req.name AS requester,
    mgr.name AS requester_manager,
    r.allocation_id,
    r.requested_employee_id,
    proposed_emp.name AS proposed_employee,
    r.requested_project_id,
    proposed_proj.name AS proposed_project,
    r.requested_hours_allocated,
    r.requested_start_date,
    r.requested_end_date,
    r.created_at,
    NOW() - r.created_at AS waiting_for
FROM approval_request r
JOIN employee req
    ON req.id = r.requested_by
LEFT JOIN employee mgr
    ON mgr.id = req.manager_id
LEFT JOIN employee proposed_emp
    ON proposed_emp.id = r.requested_employee_id
LEFT JOIN project proposed_proj
    ON proposed_proj.id = r.requested_project_id
WHERE r.status = 'pending'
ORDER BY r.created_at;


-- 5.3 Reject a pending request
-- Set: :request_id, :manager_id
-- Manager authorization must be validated by the application layer.

UPDATE approval_request
SET
    status = 'rejected',
    approved_by = :manager_id
WHERE id = :request_id
  AND status = 'pending'
  AND requested_by <> :manager_id
RETURNING id, status, approved_by;


-- 5.4 Approve a pending request and apply the proposed allocation change
-- Set: :request_id, :manager_id
-- This statement is atomic. A history row is inserted only if the
-- allocation update actually succeeds.

WITH target_allocation AS (
    SELECT id
    FROM allocation
    WHERE id = (
        SELECT allocation_id
        FROM approval_request
        WHERE id = :request_id
          AND status = 'pending'
    )
      AND status = 'active'
    FOR UPDATE
),
approved_request AS (
    UPDATE approval_request r
    SET
        status = 'approved',
        approved_by = :manager_id
    WHERE r.id = :request_id
      AND r.status = 'pending'
      AND r.requested_by <> :manager_id
      AND EXISTS (
          SELECT 1
          FROM target_allocation t
          WHERE t.id = r.allocation_id
      )
    RETURNING
        r.allocation_id,
        r.requested_employee_id,
        r.requested_project_id,
        r.requested_hours_allocated,
        r.requested_start_date,
        r.requested_end_date
),
updated_allocation AS (
    UPDATE allocation a
    SET
        employee_id = r.requested_employee_id,
        project_id = r.requested_project_id,
        hours_allocated = r.requested_hours_allocated,
        start_date = r.requested_start_date,
        end_date = r.requested_end_date
    FROM approved_request r
    WHERE a.id = r.allocation_id
      AND a.status = 'active'
    RETURNING a.id
),
logged_change AS (
    INSERT INTO allocation_history (allocation_id, change_type)
    SELECT id, 'updated'
    FROM updated_allocation
    RETURNING allocation_id
)
SELECT
    allocation_id,
    'approved and allocation updated' AS result
FROM logged_change;


-- 5.5 Close an active allocation and record its closure
-- Set: :allocation_id

WITH closed_allocation AS (
    UPDATE allocation
    SET
        status = 'closed',
        end_date = COALESCE(end_date, CURRENT_DATE)
    WHERE id = :allocation_id
      AND status = 'active'
    RETURNING id
),
logged_closure AS (
    INSERT INTO allocation_history (allocation_id, change_type)
    SELECT id, 'closed'
    FROM closed_allocation
    RETURNING allocation_id
)
SELECT
    allocation_id,
    'allocation closed successfully' AS result
FROM logged_closure;


-- 5.6 Update active allocation hours and record the change
-- Set: :allocation_id, :new_hours

WITH updated_allocation AS (
    UPDATE allocation
    SET hours_allocated = :new_hours
    WHERE id = :allocation_id
      AND status = 'active'
    RETURNING id
),
logged_change AS (
    INSERT INTO allocation_history (allocation_id, change_type)
    SELECT id, 'updated'
    FROM updated_allocation
    RETURNING allocation_id
)
SELECT
    allocation_id,
    'allocation hours updated successfully' AS result
FROM logged_change;
