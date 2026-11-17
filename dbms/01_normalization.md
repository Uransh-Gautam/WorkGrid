# WorkGrid — Database Normalization

**Project:** WorkGrid  
**Team:** T0085  
**Section:** B  
**Course:** AP — Database Management Systems

---

## 1. Introduction

WorkGrid is an employee workload and project allocation management system. It helps organizations manage employees, departments, projects, work assignments, allocation history, performance reviews, and approval requests.

The purpose of database normalization is to organize data efficiently, reduce redundancy, prevent data anomalies, and maintain data integrity.

This document presents the proposed relational database design for WorkGrid and explains how it follows the principles of First Normal Form (1NF), Second Normal Form (2NF), and Third Normal Form (3NF).

**Note:** This is the proposed logical design based on the current project requirements and README. It must be validated against the final implemented database schema before submission.

---

## 2. Proposed Database Entities

The proposed database consists of the following seven entities:

| Entity | Purpose |
|---|---|
| DEPARTMENT | Stores department information. |
| EMPLOYEE | Stores employee details and reporting relationships. |
| PROJECT | Stores project information and status. |
| ALLOCATION | Records employee assignments to projects. |
| ALLOCATION_HISTORY | Maintains a history of allocation changes. |
| PERFORMANCE_REVIEW | Stores employee performance review records. |
| APPROVAL_REQUEST | Stores requests for allocation changes and their approval status. |

### 2.1 Primary Keys and Foreign Keys

**DEPARTMENT**
- department_id (Primary Key)
- name

**EMPLOYEE**
- employee_id (Primary Key)
- name
- role
- department_id (Foreign Key → DEPARTMENT.department_id)
- manager_id (Foreign Key → EMPLOYEE.employee_id, nullable)

**PROJECT**
- project_id (Primary Key)
- name
- status
- priority

**ALLOCATION**
- allocation_id (Primary Key)
- employee_id (Foreign Key → EMPLOYEE.employee_id)
- project_id (Foreign Key → PROJECT.project_id)
- start_date
- end_date
- hours_allocated
- status

**ALLOCATION_HISTORY**
- history_id (Primary Key)
- allocation_id (Foreign Key → ALLOCATION.allocation_id)
- change_type
- changed_at

**PERFORMANCE_REVIEW**
- review_id (Primary Key)
- employee_id (Foreign Key → EMPLOYEE.employee_id)
- review_date
- notes
- score

**APPROVAL_REQUEST**
- request_id (Primary Key)
- requested_by (Foreign Key → EMPLOYEE.employee_id)
- approved_by (Foreign Key → EMPLOYEE.employee_id, nullable)
- status
- created_at

---

## 3. First Normal Form (1NF)

A relation is in First Normal Form when:

1. Every attribute contains atomic (indivisible) values.
2. Each column contains values of a single domain.
3. There are no repeating groups or multivalued attributes.
4. Each record can be uniquely identified using a key.

### Application to WorkGrid

In the proposed WorkGrid design:

- Each employee has an individual employee_id.
- Each department has an individual department_id.
- Project details are stored separately from employee details.
- Each employee-project assignment is stored as an individual ALLOCATION record.
- Multiple performance reviews are stored as separate records rather than as multiple review columns in EMPLOYEE.
- Allocation changes are stored as individual ALLOCATION_HISTORY records.

For example, an employee working on three projects will have three separate allocation records instead of storing three project names in a single employee record.

**Conclusion:** The proposed relations satisfy 1NF because their attributes are atomic and repeating groups are avoided.

---

## 4. Second Normal Form (2NF)

A relation is in Second Normal Form when:

1. It is already in First Normal Form.
2. Every non-prime attribute is fully functionally dependent on the entire candidate key.
3. No partial dependency exists on a proper subset of a candidate key.

### Application to WorkGrid

The proposed design uses a single-column surrogate primary key for each entity.

Examples:

- In EMPLOYEE, employee_id determines name, role, department_id, and manager_id.
- In PROJECT, project_id determines name, status, and priority.
- In ALLOCATION, allocation_id determines employee_id, project_id, start_date, end_date, hours_allocated, and status.
- In PERFORMANCE_REVIEW, review_id determines employee_id, review_date, notes, and score.

Because the proposed primary keys consist of a single attribute, partial dependency on a proper subset of the primary key cannot occur.

The employee-project relationship is represented through the ALLOCATION table, avoiding the need to store multiple projects in an employee record.

**Conclusion:** The proposed relations satisfy 2NF, assuming the stated keys and dependencies accurately reflect the implemented business rules.

---

## 5. Third Normal Form (3NF)

A relation is in Third Normal Form when:

1. It is already in Second Normal Form.
2. No non-key attribute is transitively dependent on a candidate key through another non-key attribute.

### Application to WorkGrid

WorkGrid separates independently managed entities into different relations.

Examples:

**1. Department and Employee**

Department information is stored in DEPARTMENT, while EMPLOYEE stores only department_id as a foreign key.

This avoids repeatedly storing department names and other department details for every employee.

**2. Employee and Manager**

Employee details are stored in EMPLOYEE. The manager_id attribute references another employee record instead of duplicating manager information.

**3. Employee and Project**

Employee and project details are maintained independently. Their relationship is represented through ALLOCATION.

**4. Allocation History**

Historical changes are stored separately in ALLOCATION_HISTORY rather than adding repeated historical fields to ALLOCATION.

**5. Performance Reviews**

Review information is maintained in PERFORMANCE_REVIEW, allowing multiple reviews for one employee without repeating employee information.

**6. Approval Requests**

Approval information is maintained in APPROVAL_REQUEST, with requested_by and approved_by referencing employee records.

**Conclusion:** The proposed decomposition is designed to satisfy 3NF by keeping attributes associated with the entity they describe and referencing related entities through foreign keys. Final verification requires checking all actual functional dependencies.

---

## 6. Functional Dependencies

A functional dependency describes a relationship in which one attribute or set of attributes uniquely determines another attribute or set of attributes.

The following functional dependencies are assumed for the proposed design:

| Relation | Functional Dependency |
|---|---|
| DEPARTMENT | department_id → name |
| EMPLOYEE | employee_id → name, role, department_id, manager_id |
| PROJECT | project_id → name, status, priority |
| ALLOCATION | allocation_id → employee_id, project_id, start_date, end_date, hours_allocated, status |
| ALLOCATION_HISTORY | history_id → allocation_id, change_type, changed_at |
| PERFORMANCE_REVIEW | review_id → employee_id, review_date, notes, score |
| APPROVAL_REQUEST | request_id → requested_by, approved_by, status, created_at |

These dependencies assume that each surrogate identifier uniquely identifies one record.

Additional business constraints, such as unique department names or restrictions on overlapping active allocations, must be defined separately where required.

---

## 7. Boyce-Codd Normal Form (BCNF)

A relation is in Boyce-Codd Normal Form when, for every non-trivial functional dependency X → Y, X is a superkey.

The proposed relations use surrogate primary keys as determinants of their non-key attributes.

Under the functional dependencies listed above, each determinant is a candidate key, so the proposed relations satisfy BCNF.

However, this conclusion is conditional on the completeness of the stated functional dependencies. Additional dependencies discovered during implementation must be checked before claiming BCNF for the final database.

---

## 8. Benefits of Normalization in WorkGrid

Normalization provides several benefits to the WorkGrid system:

1. **Reduced Data Redundancy:** Department, employee, and project information is stored independently instead of being duplicated across allocation records.
2. **Improved Data Consistency:** Updates to department or employee information can be made in one place.
3. **Prevention of Update Anomalies:** Changes to a project or department do not require updating multiple unrelated records.
4. **Prevention of Insertion Anomalies:** Departments and projects can be created independently of employee allocations.
5. **Prevention of Deletion Anomalies:** Removing an allocation does not automatically remove the corresponding employee or project.
6. **Referential Integrity:** Foreign keys maintain relationships between related records.
7. **Scalability:** New employees, projects, allocations, reviews, and approval records can be added without restructuring unrelated entities.

---

## 9. Conclusion

The proposed WorkGrid database design separates employee, department, project, allocation, history, performance review, and approval information into distinct relational tables.

The design follows the principles of 1NF, 2NF, and 3NF and is conditionally in BCNF under the stated functional dependencies.

This normalized structure provides a foundation for reliable data storage, consistent updates, reduced redundancy, and future expansion of the WorkGrid application.

The final database implementation must be checked against this document to ensure that the actual schema, keys, constraints, and functional dependencies remain consistent with the proposed design.
