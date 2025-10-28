# API Documentation

This folder contains detailed documentation for all API endpoints.

## Available Endpoints

### Customer Management
- [Customers API](./customers.md) - Customer CRUD operations and management
- [Vehicles API](./vehicles.md) - Vehicle management
- [Insurance API](./insurance.md) - Insurance policies management

### Financial
- [Payments API](./payments.md) - Payment processing and tracking
- [Cheques API](./cheques.md) - Cheque management
- [Expenses API](./expenses.md) - Expense tracking

### Operations
- [Agents API](./agents.md) - Agent management and statements
- [Accidents API](./accidents.md) - Accident reporting and tracking

### Administration
- [Users API](./users.md) - User and employee management
- [Departments API](./departments.md) - Department and permissions management

---

## API Documentation Template

When documenting a new endpoint, use this structure:

```markdown
# [Feature Name] API

## Overview
Brief description of what this API does.

---

## Endpoints

### [HTTP Method] [Endpoint Path]

**Authentication:** Required/Not Required
**Permission:** [Permission name if applicable]

#### Request

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Resource ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |

**Body:**
\`\`\`json
{
  "field": "value"
}
\`\`\`

#### Response

**Success (200):**
\`\`\`json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
\`\`\`

**Error (4xx/5xx):**
\`\`\`json
{
  "success": false,
  "message": "Error message"
}
\`\`\`
```
