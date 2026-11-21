# WorkGrid - Query Execution Plans and Timing Analysis

**Project:** WorkGrid  
**Team:** T0085  
**Section:** B  
**Checkpoint:** CP4  
**Course:** AP — Database Management Systems  
**Database:** PostgreSQL  

---

## 1. Introduction

WorkGrid is an employee workload and project allocation management system designed to track team assignments, identify available or overloaded employees, and handle project allocation change requests.

In **Checkpoint 1 (CP1)**, we normalized our database schema to BCNF. In **Checkpoint 2 (CP2)**, we designed the Entity-Relationship (ER) model and wrote the PostgreSQL schema with primary keys, foreign keys, check constraints, and indexes in `03_schema.sql`. In **Checkpoint 3 (CP3)**, we wrote the SQL queries in `04_queries.sql` to support dashboard statistics, workload allocation, multi-field filtering, management reporting hierarchies, and approval workflows.

For **Checkpoint 4 (CP4)**, our objective is to analyze the performance of these queries using PostgreSQL's `EXPLAIN (ANALYZE, BUFFERS)` command. We examine:
1. The execution plan chosen by the PostgreSQL query planner for each query.
2. The execution time taken by each query in milliseconds.
3. The impact of the secondary indexes we created in `03_schema.sql` by comparing query performance with indexes enabled versus with indexes disabled.
4. The execution behavior of complex queries such as recursive Common Table Expressions (CTEs), multi-table joins, and aggregations.

All raw query execution plans generated from PostgreSQL are stored in the [dbms/plans/](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/) directory.

---

## 2. Database Setup and Test Data

To measure query execution times and see realistic query plans, we loaded the `03_schema.sql` table definitions into a PostgreSQL database and populated it with sample data:

| Table | Number of Rows | Description |
|---|---|---|
| `department` | 6 | Engineering departments (Platform, Core Product, Infrastructure, Analytics, Security, UX). |
| `employee` | 250 | Employees arranged in a 4-level reporting hierarchy (Leadership -> Managers -> Leads -> Engineers). |
| `project` | 60 | Projects with different priorities (critical, high, medium, low) and statuses (active, planned, on_hold, completed). |
| `allocation` | 600 | Work assignments linking employees to projects with allocated hours and status (active and closed). |
| `allocation_history` | 897 | Log of allocation events (created, updated, closed). |
| `performance_review` | 250 | Employee performance scores and review notes. |
| `approval_request` | 100 | Allocation change requests submitted by employees awaiting manager review. |

---

## 3. Query Execution Plan Concepts

When running `EXPLAIN (ANALYZE, BUFFERS)` in PostgreSQL, the database engine returns the plan tree it used to execute the query. Key terms used in our analysis include:

- **Planning Time:** Time taken by the PostgreSQL query optimizer to parse the SQL statement, check available indexes, estimate costs, and select the best execution path.
- **Execution Time:** The actual time taken by the database engine to run the plan and return the rows.
- **Cost `(cost=startup..total)`:** An internal estimation metric used by the optimizer. The first number is the startup cost to fetch the first row, and the second is the total estimated cost to fetch all rows.
- **Scan Types:**
  - `Seq Scan` (Sequential Scan): Reads the table row by row from disk or memory. PostgreSQL chooses this when a table is small or when a query needs to read a large portion of the table.
  - `Index Scan` / `Bitmap Index Scan`: Uses a B-tree index to find matching rows directly without scanning the whole table. When several rows match, PostgreSQL uses a `Bitmap Index Scan` to gather block pointers and read pages in sequential disk order.
- **Join Types:**
  - `Hash Join`: Builds an in-memory hash table of the smaller relation on the join key and probes it with rows from the outer relation.
  - `Nested Loop`: For every row from the outer table, looks up matching rows in the inner table (frequently using an index).
- **Buffers (`shared hit`):** The number of 8 KB memory pages retrieved from PostgreSQL's shared buffer cache. A higher hit rate means the data was retrieved directly from RAM without disk I/O.

---

## 4. Query Timings and Comparison Table

We tested each query from `04_queries.sql` under two conditions:
1. **With Indexes (Indexed):** Using the B-tree indexes defined in `03_schema.sql`.
2. **Without Indexes (Baseline):** Temporarily disabling index scans (`SET enable_indexscan = off; SET enable_bitmapscan = off;`) to force full table scans.

| Query ID | Query Name | Plan Node Type | Time Without Index (ms) | Time With Index (ms) | Speedup (%) | Plan File |
|---|---|---|---|---|---|---|
| **1.1** | Active projects ranked by priority | `Hash Join` + `Sort` | 0.120 ms | 0.124 ms | Baseline | [01_dashboard_projects.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/01_dashboard_projects.txt) |
| **1.2** | Current employee workload & classification | `Hash Join` + `HashAggregate` | 0.275 ms | 0.241 ms | **+12.4%** | [02_employee_workload.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/02_employee_workload.txt) |
| **1.3** | Free employees (`NOT EXISTS`) | `Index Scan` + `Hash Join` | 0.186 ms | 0.205 ms | Baseline | [03_free_employees.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/03_free_employees.txt) |
| **1.4** | Overloaded employees (hours > 40) | `Hash Join` + `HashAggregate` | 0.207 ms | 0.214 ms | Baseline | [04_overloaded_employees.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/04_overloaded_employees.txt) |
| **1.5** | Employees with spare capacity (1-39 hrs) | `Hash Join` + `HashAggregate` | 0.198 ms | 0.194 ms | **+2.0%** | [05_spare_capacity_employees.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/05_spare_capacity_employees.txt) |
| **1.6** | Dashboard summary statistics | `Seq Scan` Subplans | 0.175 ms | 0.181 ms | Baseline | [06_dashboard_summary.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/06_dashboard_summary.txt) |
| **2.1** | Employee current assignments by ID | `Bitmap Index Scan` (`idx_allocation_employee`) | 0.058 ms | 0.052 ms | **+10.3%** | [07_employee_assignments.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/07_employee_assignments.txt) |
| **2.2** | Project team roster and hours | `Bitmap Index Scan` (`idx_allocation_project`) | 0.074 ms | 0.071 ms | **+4.1%** | [08_project_team.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/08_project_team.txt) |
| **2.3** | Duplicate active allocations check | `HashAggregate` | 0.102 ms | 0.098 ms | **+3.9%** | [09_duplicate_allocations_check.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/09_duplicate_allocations_check.txt) |
| **2.4** | Employee hours available calculation | `Bitmap Index Scan` (`idx_allocation_employee`) | 0.052 ms | 0.040 ms | **+23.1%** | [10_employee_hours_available.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/10_employee_hours_available.txt) |
| **2.6** | Allocations ending soon (next 14 days) | `Hash Join` | 0.107 ms | 0.107 ms | Baseline | [11_allocations_ending_soon.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/11_allocations_ending_soon.txt) |
| **3.1** | Filter employees by department | `Index Scan` (`idx_employee_department`) | 0.081 ms | 0.079 ms | **+2.5%** | [12_filter_by_department.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/12_filter_by_department.txt) |
| **3.2** | Filter employees by role (`ILIKE`) | `Seq Scan` on `employee` | 0.219 ms | 0.217 ms | **+0.9%** | [13_filter_by_role.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/13_filter_by_role.txt) |
| **3.3** | Projects by status | `Seq Scan` on `project` | 0.036 ms | 0.038 ms | Baseline | [14_projects_by_status.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/14_projects_by_status.txt) |
| **3.4** | Combined department, role & workload filter | `Bitmap Heap Scan` + `Hash Join` | 0.199 ms | 0.183 ms | **+8.0%** | [15_combined_filters.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/15_combined_filters.txt) |
| **4.1** | Direct reports and active hours | `Seq Scan` + `Hash Join` | 0.115 ms | 0.112 ms | **+2.6%** | [16_direct_reports_workload.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/16_direct_reports_workload.txt) |
| **4.2** | Recursive team hierarchy tree (Org Tree) | `WorkTable Scan` + `CTE Scan` | 0.295 ms | 0.294 ms | **+0.3%** | [17_recursive_org_tree.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/17_recursive_org_tree.txt) |
| **4.3** | Management escalation chain upward | `WorkTable Scan` + `CTE Scan` | 0.097 ms | 0.100 ms | Baseline | [18_recursive_chain_upward.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/18_recursive_chain_upward.txt) |
| **4.4** | Top-level employees (`manager_id IS NULL`) | `Seq Scan` on `employee` | 0.037 ms | 0.036 ms | **+2.7%** | [19_top_level_employees.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/19_top_level_employees.txt) |
| **4.5** | Managers ranked by direct report count | `Hash Join` + `HashAggregate` | 0.109 ms | 0.111 ms | Baseline | [20_managers_report_count.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/20_managers_report_count.txt) |
| **5.2** | Pending approval requests with manager | `Bitmap Index Scan` (`idx_approval_status`) | 0.140 ms | 0.131 ms | **+6.4%** | [21_pending_approval_requests.txt](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/21_pending_approval_requests.txt) |

---

## 5. Observations and Analysis of Key Queries

### 5.1 Employee Current Assignments (Query 2.1)
- **Goal:** Fetch active project assignments for an individual employee (`WHERE employee_id = 6 AND status = 'active'`).
- **With Index:** PostgreSQL uses `Bitmap Index Scan on idx_allocation_employee`. It searches the B-tree index for `employee_id = 6`, finds the exact 5 matching rows out of 600 total allocations in $0.004\text{ ms}$, and retrieves only those pages.
- **Without Index:** PostgreSQL performs a `Seq Scan` on the entire `allocation` table, reading all 600 rows and filtering out 596 non-matching rows.
- **Result:** The index prevents scanning the whole table, resulting in faster and more efficient row retrieval.

### 5.2 Workload Classification (Query 1.2)
- **Goal:** Group active allocations by employee, sum their hours, and classify them as 'free', 'normal', or 'overloaded'.
- **Execution:** Uses a `HashAggregate` to compute `SUM(hours_allocated)` grouped by `employee_id`, then performs a `Left Hash Join` with `employee` (so employees with 0 allocations are preserved) and an inner `Hash Join` with `department`.
- **Result:** Execution time was $0.241\text{ ms}$. The pre-aggregation inside the subquery keeps the hash table small and fast.

### 5.3 Finding Free Employees (Query 1.3)
- **Goal:** List employees who have zero active allocations using `NOT EXISTS`.
- **Execution:** Uses a `Hash Anti Join` between `employee` and `allocation`. The anti-join emits an employee as soon as it confirms that no active allocation row matches `employee_id`.
- **Result:** Runs in $0.205\text{ ms}$ without needing an expensive full-table outer join.

### 5.4 Recursive Organizational Hierarchy Tree (Query 4.2)
- **Goal:** Traverse the reporting hierarchy starting from the top leader (`id = 1`) down to all reporting engineers using `WITH RECURSIVE`.
- **Execution:**
  1. **Anchor Step:** Finds the top employee using `Index Scan using employee_pkey` on `employee.id = 1`.
  2. **Recursive Step:** Joins `employee` with the intermediate results stored in a temporary in-memory `WorkTable`.
  3. **Termination:** Runs for 5 depth iterations until no further subordinates are found, resolving the full 250-employee hierarchy in $0.294\text{ ms}$.

### 5.5 Pending Approval Requests (Query 5.2)
- **Goal:** Display pending allocation change requests along with the requester, their reporting manager, the proposed employee, and the target project.
- **Execution:** PostgreSQL uses `idx_approval_status` to filter only rows where `status = 'pending'`, avoiding finished requests. It then joins `employee` (twice: once for requester, once for manager) and `project`.
- **Result:** Completed in $0.131\text{ ms}$ with all pages fetched from shared buffer memory (`shared hit=33`).

---

## 6. How the Indexes from `03_schema.sql` Helped

In `03_schema.sql`, we added 13 indexes on foreign key and status columns. Here is how they functioned during testing:

1. **`idx_allocation_employee` (`allocation.employee_id`):**  
   Most important index in the project. Whenever an employee's workload, available hours, or assignments are checked, this index narrows the search from 600 rows down to the few rows belonging to that employee (Query 2.1 speedup: **+10.3%**, Query 2.4 speedup: **+23.1%**).
2. **`idx_allocation_project` (`allocation.project_id`):**  
   Speeds up project team roster lookups (Query 2.2).
3. **`idx_approval_status` (`approval_request.status`):**  
   Allows the dashboard to instantly find `pending` requests without scanning historical `approved` and `rejected` records (Query 5.2).
4. **`idx_employee_manager` (`employee.manager_id`):**  
   Supports direct reports queries (Query 4.1) and speeds up hierarchy joins in recursive CTE queries.
5. **Why small tables use `Seq Scan`:**  
   For queries on `department` (6 rows) or `project` (60 rows), PostgreSQL often chooses a `Seq Scan` even when an index exists. This is expected behavior: reading 1 disk page sequentially is faster than reading an index page plus a table page.

---

## 7. Key Learnings & Conclusion

From completing Checkpoint 4 for our WorkGrid project, we learned:
1. **How PostgreSQL executes SQL:** Writing a query is only half the work; inspecting `EXPLAIN ANALYZE` shows what the database is actually doing under the hood (scans, joins, sorts, and buffers).
2. **Foreign Key Indexing:** In relational databases, creating indexes on foreign key columns (like `allocation.employee_id` and `allocation.project_id`) is essential because join conditions and filter predicates heavily rely on them.
3. **Index Trade-offs:** Indexes speed up `SELECT` queries with selective filters, but they add overhead during `INSERT` and `UPDATE` operations. Having targeted indexes on frequently queried columns provides the best balance for WorkGrid.
4. **Summary:** All 21 queries tested from `04_queries.sql` execute in under $0.30\text{ ms}$ on PostgreSQL, demonstrating that our normalized schema and indexes provide efficient, reliable performance for the WorkGrid system.
