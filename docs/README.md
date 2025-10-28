# Insurance Management System - Documentation

Welcome to the Insurance Management System API documentation.

## 📚 Documentation Structure

### `/api` - API Endpoints Documentation
Contains detailed documentation for all API endpoints organized by module.

- **Customers (Insured)** - Customer management endpoints
- **Vehicles** - Vehicle management endpoints
- **Insurance** - Insurance policy endpoints
- **Payments** - Payment processing and tracking
- **Cheques** - Cheque management
- **Agents** - Agent management and statements
- **Accidents** - Accident reporting and management
- **Expenses** - Expense tracking
- **Users** - User and employee management
- **Departments** - Department and permissions

### `/guides` - Implementation Guides
Step-by-step guides for common tasks and integrations.

### `/models` - Data Models
Database schema and model documentation.

### `/architecture` - System Architecture
System design, architecture decisions, and technical specifications.

---

## 🚀 Quick Start

### Base URL
```
http://localhost:3002/api/v1
```

### Authentication
Most endpoints require Bearer token authentication:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### Common Response Format
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ }
}
```

---

## 📖 Main Modules

1. **Customers (Insured)** - `/api/v1/insured`
2. **Vehicles** - `/api/v1/insured/vehicles`
3. **Insurance** - `/api/v1/insured/insurance`
4. **Payments** - `/api/v1/insured/payments`
5. **Cheques** - `/api/v1/cheque`
6. **Agents** - `/api/v1/agents`
7. **Accidents** - `/api/v1/accident`
8. **Expenses** - `/api/v1/expense`
9. **Users** - `/api/v1/user`
10. **Departments** - `/api/v1/department`

---

## 📝 Contributing to Documentation

When adding new features:
1. Document API endpoints in `/api/[module-name].md`
2. Add implementation guides in `/guides/` if needed
3. Update model documentation in `/models/` for schema changes
4. Keep this README updated with new modules
