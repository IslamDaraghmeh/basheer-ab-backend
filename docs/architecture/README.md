# System Architecture

## Overview

The Insurance Management System is a Node.js/Express backend application with MongoDB database, designed to manage insurance policies, customer information, payments, and agent operations.

---

## Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** JavaScript (ES6+)

### Database
- **Primary Database:** MongoDB
- **ODM:** Mongoose

### External Services
- **File Storage:** Cloudinary
- **Email:** SMTP (via nodemailer)
- **SMS:** Integration ready
- **Payment Gateway:** Tranzila (for online payments)

### Security & Validation
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **Validation:** Joi
- **Rate Limiting:** express-rate-limit

---

## Project Structure

```
final_back_insurance/
├── DB/
│   └── models/          # Mongoose models
├── src/
│   ├── middleware/      # Express middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── rateLimiter.js
│   │   └── ...
│   ├── modules/         # Feature modules
│   │   ├── User/
│   │   ├── insured/
│   │   ├── accident/
│   │   ├── expense/
│   │   └── ...
│   └── services/        # Shared services
│       ├── email.js
│       ├── multer.js
│       └── ...
├── logs/                # Application logs
├── docs/                # Documentation
└── index.js            # Application entry point
```

---

## Module Structure

Each module follows this structure:

```
module/
├── controller/          # Business logic
│   └── [module].controller.js
├── [module].route.js   # Route definitions
├── [module].endpoint.js # Permission definitions
└── [module].validation.js # Request validation schemas
```

---

## Key Architectural Decisions

### 1. Nested Documents vs References
- **Vehicles** are nested in **Insured** documents
- **Insurance** policies are nested in **Vehicle** documents
- **Payments** are nested in **Insurance** documents
- Rationale: These are tightly coupled and typically queried together

### 2. Separate Collections
- **Cheques** have their own collection for flexible querying
- **AgentTransactions** tracked separately for financial reporting
- **Accidents** separate for independent lifecycle

### 3. Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, HeadOfEmployee, Employee, Agents)
- Department-based permissions for granular control

### 4. Audit Trail
- **AuditLog** model tracks all significant changes
- Automatic logging in controllers
- Includes user info, old/new values, timestamps

### 5. Caching Strategy
- Redis-based caching for frequently accessed data
- Cache invalidation on data changes
- TTL-based expiration

---

## API Design Principles

1. **RESTful Routes** - Standard HTTP methods and resource naming
2. **Consistent Response Format** - All responses follow same structure
3. **Error Handling** - Centralized error handling middleware
4. **Validation** - Request validation before processing
5. **Rate Limiting** - Different limits for different endpoint types

---

## Security Measures

1. **Authentication Required** - Most endpoints require JWT token
2. **Password Security** - bcrypt with configurable salt rounds
3. **Rate Limiting** - Prevents brute force and abuse
4. **Input Validation** - Joi schemas validate all inputs
5. **SQL Injection Prevention** - Mongoose parameterized queries
6. **XSS Prevention** - Input sanitization

---

## Scalability Considerations

1. **Stateless API** - JWT-based authentication for horizontal scaling
2. **Database Indexing** - Strategic indexes for query performance
3. **Caching Layer** - Redis for frequently accessed data
4. **Async Operations** - Non-blocking I/O for better throughput
5. **Pagination** - All list endpoints support pagination

---

## Future Enhancements

- [ ] GraphQL API option
- [ ] Real-time notifications via WebSockets
- [ ] Advanced reporting and analytics
- [ ] Mobile app API optimizations
- [ ] Microservices architecture migration
