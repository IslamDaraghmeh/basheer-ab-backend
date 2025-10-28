import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Migration: Create Initial Admin User
 * Date: 2025-01-26
 * Description: Creates the default admin user for the system
 */

const ADMIN_USER = {
  name: process.env.ADMIN_NAME || "System Admin",
  email: process.env.ADMIN_EMAIL || "admin@ab.com",
  password: process.env.ADMIN_PASSWORD || "Admin@123456",
  role: "admin",
  status: "active",
};

async function up() {
  try {
    console.log("🔄 Starting admin user migration...");

    // Connect to MongoDB
    const dbUri = process.env.DB_URI || process.env.MONGO_URI;
    if (!dbUri) {
      throw new Error("Database URI not found in environment variables");
    }

    await mongoose.connect(dbUri);
    console.log("✅ Connected to database");

    // Get User model
    const User = mongoose.model("user");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: ADMIN_USER.email }, { role: "admin" }],
    });

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists. Skipping creation.");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      return;
    }

    // Hash password
    const saltRounds = parseInt(process.env.saltRound) || 10;
    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, saltRounds);

    // Create admin user
    const adminUser = await User.create({
      name: ADMIN_USER.name,
      email: ADMIN_USER.email,
      password: hashedPassword,
      role: ADMIN_USER.role,
      status: ADMIN_USER.status,
    });

    console.log("✅ Admin user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:", adminUser.email);
    console.log("👤 Name:", adminUser.name);
    console.log("🔑 Role:", adminUser.role);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  IMPORTANT: Change the password after first login!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("🔒 Database connection closed");
  }
}

async function down() {
  try {
    console.log("🔄 Rolling back admin user migration...");

    // Connect to MongoDB
    const dbUri = process.env.DB_URI || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log("✅ Connected to database");

    // Get User model
    const User = mongoose.model("user");

    // Remove admin user
    const result = await User.deleteOne({ email: ADMIN_USER.email });

    if (result.deletedCount > 0) {
      console.log("✅ Admin user removed successfully");
    } else {
      console.log("⚠️  Admin user not found");
    }
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("🔒 Database connection closed");
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "up";

  if (command === "up") {
    up()
      .then(() => {
        console.log("✅ Migration completed successfully");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Migration failed:", error);
        process.exit(1);
      });
  } else if (command === "down") {
    down()
      .then(() => {
        console.log("✅ Rollback completed successfully");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Rollback failed:", error);
        process.exit(1);
      });
  } else {
    console.error('❌ Invalid command. Use "up" or "down"');
    process.exit(1);
  }
}

export { up, down };
