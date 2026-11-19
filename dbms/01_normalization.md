# WorkGrid - Database Normalisation

**Project:** WorkGrid  
**Team:** T0085  
**Section:** B  
**Course:** AP — Database Management Systems  
**Database:** PostgreSQL

---

## 1. Introduction

WorkGrid is an employee workload and project allocation management system designed to manage departments, employees, projects, employee allocations, allocation history, performance reviews, and allocation change approval requests.

Database normalisation is the process of organising relational data to reduce redundancy, prevent insertion, update, and deletion anomalies, and maintain data integrity.

This document explains the normalisation of the WorkGrid relational database through First Normal Form (1NF), Second Normal Form (2NF), Third Normal Form (3NF), and Boyce-Codd Normal Form (BCNF).

The database design uses primary keys, foreign keys, unique constraints, and separate relations to represent independent entities and their relationships.

---

## 2. Database Entities

The WorkGrid database consists of seven primary relations.

| Relation | Purpose |
|---|---|
| DEPARTMENT | Stores department details. |
| EMPLOYEE | Stores employee details and reporting relationships. |
| PROJECT | Stores project information, status, and priority. |
| ALLOCATION | Records employee assignments to projects. |
| ALLOCATION_HISTORY | Records historical events associated with allocations. |
| PERFORMANCE_REVIEW | Stores performance review information for employees. |
| APPROVAL_REQUEST | Stores requests for allocation changes, proposed changes, and approval status. |

### 2.1 Primary Keys and Attributes

**DEPARTMENT**
- `id` — Primary Key
- `name` — Unique department name

**EMPLOYEE**
- `id` — Primary Key
- `name`
- `role`
- `department_id` — Foreign Key referencing DEPARTMENT
- `manager_id` — Nullable self-referencing Foreign Key referencing EMPLOYEE

**PROJECT**
- `id` — Primary Key
- `name` — Unique project name
- `status`
- `priority`

**ALLOCATION**
- `id` — Primary Key
- `employee_id` — Foreign Key referencing EMPLOYEE
- `project_id` — Foreign Key referencing PROJECT
- `start_date`
- `end_date`
- `hours_allocated`
- `status`

**ALLOCATION_HISTORY**
- `id` — Primary Key
- `allocation_id` — Foreign Key referencing ALLOCATION
- `change_type`
- `changed_at`

**PERFORMANCE_REVIEW**
- `id` — Primary Key
- `employee_id` — Foreign Key referencing EMPLOYEE
- `review_date`
- `notes`
- `score`

**APPROVAL_REQUEST**
- `id` — Primary Key
- `allocation_id` — Foreign Key referencing ALLOCATION
- `requested_by` — Foreign Key referencing EMPLOYEE
- `approved_by` — Nullable Foreign Key referencing EMPLOYEE
- `requested_employee_id` — Foreign Key referencing EMPLOYEE
- `requested_project_id` — Foreign Key referencing PROJECT
- `requested_hours_allocated`
- `requested_start_date`
- `requested_end_date`
- `status`
- `created_at`

The approval request relation stores proposed allocation changes separately from the existing allocation, allowing requests to be reviewed before the actual allocation is modified.

---

## 3. First Normal Form (1NF)

A relation is in First Normal Form when:

- Each attribute contains a single atomic value.
- Each column contains values belonging to a consistent domain.
- No repeating groups or multivalued attributes exist within a record.
- Records can be uniquely identified using a key.

### Application to WorkGrid

The WorkGrid database satisfies the principles of 1NF because:

- Every department is stored as a separate record in DEPARTMENT.
- Every employee is stored as an individual record in EMPLOYEE.
- Project information is stored independently in PROJECT.
- Employee-project assignments are stored as individual ALLOCATION records.
- Performance reviews are stored as separate records in PERFORMANCE_REVIEW.
- Allocation history entries are stored individually in ALLOCATION_HISTORY.
- Each allocation change request is stored as an individual APPROVAL_REQUEST record.

For example, if an employee works on three projects, the system stores three separate allocation records instead of storing multiple project names in a single employee record.

Similarly, multiple approval requests for an allocation are represented as separate records, rather than storing multiple requests inside one column.

**Conclusion:** The WorkGrid relations satisfy 1NF by maintaining atomic attribute values and avoiding repeating groups and multivalued fields.

---

## 4. Second Normal Form (2NF)

A relation is in Second Normal Form when:

- It is already in First Normal Form.
- Every non-prime attribute is fully functionally dependent on every candidate key.
- No partial dependency exists on a proper subset of a candidate key.

### Application to WorkGrid

The WorkGrid relations primarily use single-attribute surrogate primary keys.

Examples of functional dependencies include:

- In DEPARTMENT, `id` determines `name`.
- In EMPLOYEE, `id` determines `name`, `role`, `department_id`, and `manager_id`.
- In PROJECT, `id` determines `name`, `status`, and `priority`.
- In ALLOCATION, `id` determines employee, project, dates, hours, and status.
- In PERFORMANCE_REVIEW, `id` determines the employee, review date, notes, and score.

Because each primary key consists of a single attribute, partial dependency on a proper subset of the primary key cannot occur.

The ALLOCATION relation represents the many-to-many relationship between employees and projects. This avoids storing multiple project assignments in the EMPLOYEE relation and maintains individual assignment records.

**Conclusion:** The relations satisfy 2NF because they are in 1NF and their single-attribute primary keys eliminate partial dependencies on composite primary keys.

---

## 5. Third Normal Form (3NF)

A relation is in Third Normal Form when:

- It is already in Second Normal Form.
- Non-key attributes do not depend transitively on candidate keys through other non-key attributes.

### Application to WorkGrid

WorkGrid separates information according to the entities to which it belongs.

### 5.1 Department and Employee

Department information is maintained in DEPARTMENT, while EMPLOYEE stores the department reference through `department_id`.

This avoids storing department names repeatedly for every employee.

### 5.2 Employee and Manager

Manager information is represented through the self-referencing `manager_id` attribute in EMPLOYEE.

The database references the manager's employee record instead of duplicating manager details for every subordinate.

### 5.3 Employee and Project

Employee and project details are stored independently.

ALLOCATION represents the relationship between employees and projects and contains assignment-specific attributes such as dates, allocated hours, and status.

### 5.4 Allocation and Allocation History

Current allocation details are stored in ALLOCATION, while historical allocation events are stored in ALLOCATION_HISTORY.

This separation avoids mixing current assignment information with historical event records.

### 5.5 Employee and Performance Review

Performance review details are maintained in PERFORMANCE_REVIEW.

An employee can have multiple performance reviews without repeating employee information in every review record.

### 5.6 Allocation and Approval Request

APPROVAL_REQUEST stores the allocation being changed, the requester, the optional approver, and the proposed employee, project, hours, and dates.

The proposed values are maintained separately from the existing allocation. This prevents proposed changes from overwriting the current allocation before the approval process is completed.

**Conclusion:** The relations are designed to satisfy 3NF by keeping attributes associated with their respective entities and storing relationships through foreign keys. This conclusion is based on the functional dependencies and business rules defined for WorkGrid.

---

## 6. Functional Dependencies

A functional dependency (FD) describes a relationship in which one attribute or a set of attributes uniquely determines another attribute or set of attributes.

The following functional dependencies are assumed for the WorkGrid database:

| Relation | Functional Dependency |
|---|---|
| DEPARTMENT | `id → name` |
| EMPLOYEE | `id → name, role, department_id, manager_id` |
| PROJECT | `id → name, status, priority` |
| ALLOCATION | `id → employee_id, project_id, start_date, end_date, hours_allocated, status` |
| ALLOCATION_HISTORY | `id → allocation_id, change_type, changed_at` |
| PERFORMANCE_REVIEW | `id → employee_id, review_date, notes, score` |
| APPROVAL_REQUEST | `id → allocation_id, requested_by, approved_by, requested_employee_id, requested_project_id, requested_hours_allocated, requested_start_date, requested_end_date, status, created_at` |

These functional dependencies are based on the assumption that each primary key uniquely identifies a record.

Additional candidate keys exist where uniqueness constraints are enforced. For example:

- `DEPARTMENT.name` is unique.
- `PROJECT.name` is unique.

Therefore, department names and project names can also act as candidate keys, assuming their unique constraints are enforced in the database.

Business rules that are not represented by these functional dependencies, such as allocation capacity, valid statuses, date restrictions, and approval rules, are maintained separately through constraints and application logic where applicable.

---

## 7. Boyce-Codd Normal Form (BCNF)

A relation is in Boyce-Codd Normal Form when, for every non-trivial functional dependency:

`X → Y`

X must be a superkey of that relation.

### Application to WorkGrid

The WorkGrid relations use surrogate identifiers as primary keys.

Under the functional dependencies listed in Section 6:

- `DEPARTMENT.id` determines the department attributes.
- `EMPLOYEE.id` determines the employee attributes.
- `PROJECT.id` determines the project attributes.
- `ALLOCATION.id` determines the allocation attributes.
- `ALLOCATION_HISTORY.id` determines the history attributes.
- `PERFORMANCE_REVIEW.id` determines the review attributes.
- `APPROVAL_REQUEST.id` determines the approval request attributes.

These determinants are candidate keys. The unique department and project names are additional candidate keys in their respective relations.

Based on the stated functional dependencies, the relations satisfy BCNF because the determinants of the listed non-trivial dependencies are candidate keys.

This conclusion assumes that no additional non-key functional dependencies exist beyond those documented and enforced by the database design.

---

## 8. Integrity Constraints and Business Rules

Normalisation is supported by database constraints that maintain valid data and relationships.

| Constraint | Purpose |
|---|---|
| Primary Key | Uniquely identifies every record in a relation. |
| Foreign Key | Maintains valid references between related relations. |
| Unique Constraint | Prevents duplicate department names and project names. |
| Manager Constraint | Prevents an employee from being their own manager. |
| Project Status Constraint | Restricts projects to permitted status values. |
| Project Priority Constraint | Restricts projects to permitted priority values. |
| Allocation Hours Constraint | Ensures allocated hours are positive. |
| Allocation Date Constraint | Prevents the allocation end date from preceding the start date. |
| Allocation Status Constraint | Restricts allocations to valid status values. |
| History Constraint | Restricts allocation history event types to permitted values. |
| Performance Score Constraint | Restricts review scores to the valid range of 1–10. |
| Approval Status Constraint | Restricts approval requests to permitted status values. |
| Proposed Hours Constraint | Ensures proposed allocation hours are positive. |
| Proposed Date Constraint | Prevents a proposed end date from preceding the proposed start date when an end date is provided. |
| Normalisation constraint | Prevents an employee from approving their own request. |

Foreign keys maintain referential integrity between employees, departments, projects, allocations, reviews, history records, and approval requests.

---

## 9. Benefits of Normalisation in WorkGrid

### Reduced Data Redundancy

Employee, department, and project information is maintained independently rather than repeatedly stored in allocation records.

### Improved Data Consistency

Updates to department, employee, and project information can be performed in their respective relations.

### Prevention of Update Anomalies

Changes to a department or project do not require modifying unrelated allocation records.

### Prevention of Insertion Anomalies

Departments and projects can be recorded independently of allocation assignments.

### Prevention of Deletion Anomalies

Deleting an allocation does not inherently require deleting the employee or project associated with it.

### Referential Integrity

Foreign keys ensure that references between relations correspond to valid records.

### Scalability

The database can accommodate additional employees, projects, allocations, performance reviews, and approval requests without restructuring unrelated entities.

---

## 10. Conclusion

The WorkGrid database separates department, employee, project, allocation, allocation history, performance review, and approval request information into distinct relational tables.

The design follows the principles of 1NF, 2NF, and 3NF, and satisfies BCNF under the stated functional dependencies and candidate key assumptions.

The use of primary keys, foreign keys, unique constraints, and separate relations minimises unnecessary redundancy and helps prevent data anomalies.

By maintaining proposed allocation changes separately in APPROVAL_REQUEST, the system supports a structured approval workflow without directly overwriting the existing allocation during the request stage.

The normalised relational design provides a foundation for data consistency, integrity, efficient maintenance, and future expansion of the WorkGrid system.
