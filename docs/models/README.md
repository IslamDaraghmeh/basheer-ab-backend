# Data Models

This folder contains documentation for all database models and schemas.

## Core Models

### Customer Management
- **Insured** - Customer information and profile
- **Vehicle** - Vehicle details (nested in Insured)
- **Insurance** - Insurance policies (nested in Vehicle)
- **Payment** - Payment records (nested in Insurance)

### Financial
- **Cheque** - Cheque records and tracking
- **Expense** - Expense records
- **Revenue** - Revenue tracking
- **AgentTransaction** - Agent credit/debit transactions

### Operations
- **Accident** - Accident reports
- **AccidentComment** - Comments on accident reports

### Administration
- **User** - System users (admin, employees, agents)
- **Department** - Departments with permissions
- **AuditLog** - System audit trail

### Configuration
- **InsuranceCompany** - Insurance company definitions
- **InsuranceType** - Available insurance types
- **DocumentSettings** - Document numbering settings

---

## Model Relationships

```
Insured (Customer)
  └─ vehicles []
      └─ insurance []
          └─ payments []
          └─ cheques [] (ref: Cheque)

Department
  └─ headOfEmployee (ref: User)
  └─ employees [] (ref: User)

Accident
  └─ comments [] (ref: AccidentComment)
  └─ assignedTo (ref: User)

AgentTransaction
  └─ agentId (ref: User)
  └─ insuredId (ref: Insured)
```

---

## Schema Documentation Template

When documenting a model:

```markdown
# [Model Name]

## Overview
Brief description of what this model represents.

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| field1 | String | Yes | Description |
| field2 | Number | No | Description |

## Indexes
- field1, field2 (compound)
- field3

## Relationships
- Belongs to: [Parent Model]
- Has many: [Child Model]

## Hooks
- Pre-save: Description
- Post-save: Description

## Example Document
\`\`\`json
{
  "field1": "value",
  "field2": 123
}
\`\`\`
```
