# Database Migrations

This directory contains database migration scripts for the Insurance Management System.

## Available Migrations

1. **001_create_admin_user.js** - Creates the initial admin user

## Running Migrations

### Run All Migrations
```bash
node migrations/migrate.js up
```

### Rollback Migrations
```bash
node migrations/migrate.js down
```

### List All Migrations
```bash
node migrations/migrate.js list
```

### Run a Specific Migration
```bash
node migrations/001_create_admin_user.js up
```

### Rollback a Specific Migration
```bash
node migrations/001_create_admin_user.js down
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Database
DB_URI=mongodb://localhost:27017/insurance_db
# or
MONGO_URI=mongodb://localhost:27017/insurance_db

# Admin User (Optional - defaults provided)
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@insurance.com
ADMIN_PASSWORD=Admin@123456

# Password Hashing
saltRound=10
```

## Creating New Migrations

1. Create a new file with format: `XXX_description.js`
2. Use the next sequential number (e.g., `002_add_departments.js`)
3. Export `up` and `down` functions:

```javascript
export async function up() {
  // Migration logic
}

export async function down() {
  // Rollback logic
}
```

## Important Notes

⚠️ **SECURITY**: Always change the default admin password after first login!

⚠️ **PRODUCTION**: Set custom admin credentials via environment variables before deploying.

⚠️ **BACKUP**: Always backup your database before running migrations in production.

## Migration on First Deployment

The migrations will run automatically on first deployment when using Docker. See the `docker-compose.yml` file for details.

Alternatively, run manually:
```bash
npm run migrate
```
