import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration Runner
 * Usage:
 *   node migrations/migrate.js up    - Run all pending migrations
 *   node migrations/migrate.js down  - Rollback last migration
 *   node migrations/migrate.js list  - List all migrations
 */

async function runMigrations(direction = 'up') {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js') && file !== 'migrate.js')
    .sort();

  if (files.length === 0) {
    console.log('No migrations found');
    return;
  }

  console.log(`Running migrations ${direction}...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const file of files) {
    try {
      const migrationPath = path.join(migrationsDir, file);
      const migration = await import(`file://${migrationPath}`);

      console.log(`📄 ${file}`);

      if (direction === 'up' && migration.up) {
        await migration.up();
      } else if (direction === 'down' && migration.down) {
        await migration.down();
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Failed to run migration ${file}:`, error.message);
      process.exit(1);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All migrations completed successfully');
}

function listMigrations() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js') && file !== 'migrate.js')
    .sort();

  console.log('\n📋 Available Migrations:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Parse command
const command = process.argv[2] || 'up';

switch (command) {
  case 'up':
    runMigrations('up');
    break;
  case 'down':
    runMigrations('down');
    break;
  case 'list':
    listMigrations();
    break;
  default:
    console.error('❌ Invalid command. Use: up, down, or list');
    process.exit(1);
}
