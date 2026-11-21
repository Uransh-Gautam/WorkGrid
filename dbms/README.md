# WorkGrid - Database Management Systems Deliverables

**Course:** AP — Database Management Systems  
**Project:** WorkGrid  
**Team:** T0085 | **Section:** B  
**Database:** PostgreSQL

This directory contains the database design and SQL deliverables for the WorkGrid college project, organized across four checkpoints:

---

## Checkpoint Deliverables Directory

| Checkpoint | File / Folder | Description |
|---|---|---|
| **CP1** | [`01_normalization.md`](file:///Users/uransh/Desktop/WorkGrid/dbms/01_normalization.md) | Relational normalization analysis covering 1NF, 2NF, 3NF, and BCNF. |
| **CP2** | [`02_er_diagram.md`](file:///Users/uransh/Desktop/WorkGrid/dbms/02_er_diagram.md) | Entity-Relationship (ER) model with entities, attributes, relationships, and constraints. |
| **CP2** | [`03_schema.sql`](file:///Users/uransh/Desktop/WorkGrid/dbms/03_schema.sql) | PostgreSQL schema DDL defining 7 tables, check constraints, foreign keys, and indexes. |
| **CP3** | [`04_queries.sql`](file:///Users/uransh/Desktop/WorkGrid/dbms/04_queries.sql) | SQL query set for dashboards, allocations, filtering, management hierarchy, and approvals. |
| **CP4** | [`05_query_timings.md`](file:///Users/uransh/Desktop/WorkGrid/dbms/05_query_timings.md) | Query performance benchmarks, execution plans, and timing analysis. |
| **CP4** | [`plans/`](file:///Users/uransh/Desktop/WorkGrid/dbms/plans/) | Raw PostgreSQL EXPLAIN ANALYZE execution plan text files for all queries. |

---

## How to Test Queries Locally

To test the schema and inspect execution plans in PostgreSQL:

```bash
# 1. Connect to PostgreSQL and load the schema
psql -d workgrid -f dbms/03_schema.sql

# 2. Run EXPLAIN ANALYZE on any query
psql -d workgrid -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM allocation WHERE employee_id = 6 AND status = 'active';"
```
