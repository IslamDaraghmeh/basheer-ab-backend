import { userModel } from "#db/models/User.model.js";
import bcrypt from 'bcryptjs';
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import { sendEmail } from "#services/email.js";
import DepartmentModel from "#db/models/Department.model.js";
import { logAudit } from "#utils/auditLogger.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  unauthorizedResponse
} from "#utils/apiResponse.js";

export const getProfile = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user._id);

  if (!user) {
    return notFoundResponse(res, "User");
  }

  logger.info("User profile retrieved", { userId: user._id });

  return successResponse(res, { user }, "Profile retrieved successfully");
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  const user = await userModel.findById(userId);
  if (!user) {
    return notFoundResponse(res, "User");
  }

  const oldValues = { name: user.name, email: user.email };

  if (email) {
    const existEmail = await userModel.findOne({ email: email });
    if (existEmail && existEmail._id.toString() !== userId) {
      return badRequestResponse(res, "Email is already in use");
    }
    user.email = email;
  }

  if (name) {
    user.name = name;
  }

  await user.save();

  logger.info("User profile updated", {
    userId,
    oldValues,
    newValues: { name: user.name, email: user.email }
  });

  return successResponse(res, {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  }, "Profile updated successfully");
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await userModel.findById(userId);
  if (!user) {
    return notFoundResponse(res, "User");
  }

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return unauthorizedResponse(res, "Current password is incorrect");
  }

  const hash = bcrypt.hashSync(newPassword, parseInt(process.env.saltRound));
  user.password = hash;
  await user.save();

  await logAudit({
    userId: user._id,
    userName: user.name,
    action: "Password Changed",
    entity: "User",
    entityId: user._id,
    oldValue: null,
    newValue: { timestamp: new Date() }
  });

  logger.info("User password changed", { userId });

  return successResponse(res, null, "Password changed successfully");
});

export const create = asyncHandler(async (req, res) => {
  const finduser = await userModel.findOne({ email: "admin123@gmail.com" });

  if (!finduser) {
    const hashedPassword = await bcrypt.hash('Islam123..', parseInt(process.env.saltRound));
    const adminUser = new userModel({
      name: "admin",
      email: "islam@ab.com",
      role: "admin",
      password: hashedPassword,
      status: "active"
    });

    await adminUser.save();

    logger.info("Admin user created", { email: adminUser.email });

    return createdResponse(res, { adminUser }, "Admin user created successfully");
  } else {
    return badRequestResponse(res, "User already exists");
  }
});

export const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email: email });

  if (!user) {
    return notFoundResponse(res, "User");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return unauthorizedResponse(res, "Incorrect password");
  }

  const token = jwt.sign(
    { id: user._id, email, name: user.name, role: user.role },
    process.env.TokenSignIn,
    { expiresIn: 60 * 60 * 24 }
  );

  logger.info("User signed in", { userId: user._id, email });

  return successResponse(res, { token, user }, "Sign in successful");
});

export const forgetPassword = asyncHandler(async (req, res) => {
  const { code, email, newPassword } = req.body;

  if (!code) {
    return badRequestResponse(res, "Please enter the reset code");
  }

  // Create hash of the code to compare with stored hash
  const crypto = await import('crypto');
  const hashedToken = crypto.createHash('sha256').update(code).digest('hex');

  // Find user with valid reset token that hasn't expired
  const user = await userModel.findOne({
    email,
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    // Increment failed attempts for the user (if they exist)
    const failedUser = await userModel.findOne({ email });
    if (failedUser) {
      failedUser.resetPasswordAttempts = (failedUser.resetPasswordAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (failedUser.resetPasswordAttempts >= 5) {
        failedUser.resetPasswordLockUntil = Date.now() + 60 * 60 * 1000; // 1 hour lock
        await failedUser.save();

        logger.warn("Account locked due to too many reset attempts", { email });

        return badRequestResponse(res, "Too many failed attempts. Account locked for 1 hour.");
      }

      await failedUser.save();
    }

    logger.warn("Invalid or expired reset code attempted", { email });

    return badRequestResponse(res, "Invalid or expired reset code");
  }

  // Check if account is locked
  if (user.resetPasswordLockUntil && user.resetPasswordLockUntil > Date.now()) {
    const remainingTime = Math.ceil((user.resetPasswordLockUntil - Date.now()) / 60000);
    return badRequestResponse(res, `Account is locked. Try again in ${remainingTime} minutes.`);
  }

  // Hash new password
  const hash = await bcrypt.hash(newPassword, parseInt(process.env.saltRound));

  // Update password and clear reset fields
  user.password = hash;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordAttempts = 0;
  user.resetPasswordLockUntil = undefined;
  user.sendCode = null; // Clear legacy field
  await user.save();

  // Log password reset for audit
  await logAudit({
    userId: user._id,
    userName: user.name,
    action: 'Password Reset',
    entity: 'User',
    entityId: user._id,
    oldValue: null,
    newValue: { timestamp: new Date() }
  });

  logger.info("Password reset successfully", { userId: user._id, email });

  return successResponse(res, null, "Password reset successfully. Please login with your new password.");
});

export const sendCode = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user
  const findUser = await userModel.findOne({ email: email });

  if (!findUser) {
    // Don't reveal if user exists - security best practice
    logger.warn("Password reset requested for non-existent email", { email });

    return successResponse(res, null, "If the email exists in our system, a reset code has been sent");
  }

  // Check if account is locked
  if (findUser.resetPasswordLockUntil && findUser.resetPasswordLockUntil > Date.now()) {
    const remainingTime = Math.ceil((findUser.resetPasswordLockUntil - Date.now()) / 60000);
    return badRequestResponse(res, `Too many attempts. Please try again in ${remainingTime} minutes.`);
  }

  // Generate secure reset token (32 random bytes)
  const crypto = await import('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing in database
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token and expiration (15 minutes)
  findUser.resetPasswordToken = hashedToken;
  findUser.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  findUser.resetPasswordAttempts = 0; // Reset attempts counter
  await findUser.save();

  const message = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <title>Email Confirmation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style type="text/css">
          body, table, td, a { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
          table, td { mso-table-rspace: 0pt; mso-table-lspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; }
          a[x-apple-data-detectors] { font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; line-height: inherit !important; color: inherit !important; text-decoration: none !important; }
          div[style*="margin: 16px 0;"] { margin: 0 !important; }
          body { width: 100% !important; height: 100% !important; padding: 0 !important; margin: 0 !important; }
          table { border-collapse: collapse !important; }
          a { color: #1a82e2; }
          img { height: auto; line-height: 100%; text-decoration: none; border: 0; outline: none; }
        </style>
      </head>
      <body style="background-color: #e9ecef;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" bgcolor="#e9ecef">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                <tr>
                  <td align="center" valign="top" style="padding:36px 24px">
                    <a href="https://www.blogdesire.com" style="display:inline-block" target="_blank">

                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#e9ecef">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                <tr>
                  <td align="left" bgcolor="#ffffff" style="padding:36px 24px 0;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;border-top:3px solid #d4dadf">
                    <h1 style="margin:0;font-size:32px;font-weight:700;letter-spacing:-1px;line-height:48px">Verify Your Email Address</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#e9ecef">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                <tr>
                  <td align="left" bgcolor="#ffffff" style="padding:24px;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px">
                    <p style="margin: 0;">Thank you for using Insurance App! Use the following code:</p>
                    <h2 style="margin: 20px 0; font-size: 28px; font-weight: 700; color:hsl(94, 59%, 35%);">${resetToken}</h2>
                  </td>
                </tr>
                <tr>
                  <td align="left" bgcolor="#ffffff" style="padding:24px;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;border-bottom:3px solid #d4dadf">
                    <p style="margin:0">Insurance App</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding:24px">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                <tr>
                  <td align="center" bgcolor="#e9ecef" style="padding:12px 24px;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:#666">
                    <p style="margin: 0;">You received this email because we received a request for password reset for your account.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // Send email with the UNHASHED token (user needs this)
  await sendEmail(email, 'Password Reset Request', message);

  // Log password reset request for audit
  await logAudit({
    userId: findUser._id,
    userName: findUser.name,
    action: 'Password Reset Request',
    entity: 'User',
    entityId: findUser._id,
    oldValue: null,
    newValue: { email, requestedAt: new Date() }
  });

  logger.info("Password reset code sent", { userId: findUser._id, email });

  return successResponse(res, null, "If the email exists in our system, a reset code has been sent. The code will expire in 15 minutes.");
});

export const createDepartmentHead = asyncHandler(async (req, res) => {
  const { name, email, password, status } = req.body;
  const { id } = req.params;

  const findDep = await DepartmentModel.findById(id);
  if (!findDep) {
    return notFoundResponse(res, "Department");
  }

  if (findDep.headOfEmployee) {
    return badRequestResponse(res, "There is already a head of department for this department");
  }

  const hashPassword = await bcrypt.hash(password, parseInt(process.env.saltRound));
  const findEmail = await userModel.findOne({ email: email });

  if (findEmail) {
    return badRequestResponse(res, "User already exists");
  }

  const newUser = new userModel({
    name,
    email,
    role: "HeadOfEmployee",
    password: hashPassword,
    departmentId: findDep._id,
    status
  });

  await newUser.save();

  findDep.headOfEmployee = {
    _id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status
  };

  await findDep.save();

  const adminUser = await userModel.findById(req.user._id);

  await logAudit({
    userId: req.user._id,
    userName: adminUser.name,
    action: `Add Department Head by ${adminUser.name}`,
    entity: "User",
    entityId: newUser._id,
    oldValue: null,
    newValue: {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      departmentId: findDep._id
    }
  });

  logger.info("Department head created", {
    userId: newUser._id,
    departmentId: findDep._id,
    createdBy: req.user._id
  });

  return createdResponse(res, { department: findDep }, "Head of department added successfully");
});

export const deleteDepartmentHead = asyncHandler(async (req, res) => {
  const { depId, userId } = req.params;

  const department = await DepartmentModel.findById(depId);

  if (!department) {
    return notFoundResponse(res, "Department");
  }

  if (!department.headOfEmployee || !department.headOfEmployee._id) {
    return badRequestResponse(res, "This department has no head of employee");
  }

  if (department.headOfEmployee._id.toString() !== userId.toString()) {
    return badRequestResponse(res, "This user is not the head of the department");
  }

  const headData = { ...department.headOfEmployee.toObject() };

  department.headOfEmployee = null;
  await department.save();

  const user = await userModel.findById(userId);
  if (user) {
    await userModel.findByIdAndDelete(userId);
  }

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: "Delete Department Head",
    entity: "User",
    entityId: userId,
    oldValue: headData,
    newValue: null
  });

  logger.info("Department head deleted", {
    userId,
    departmentId: depId,
    deletedBy: req.user._id
  });

  return successResponse(res, { department }, "Head of department removed successfully");
});

export const getHeadOfDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findDep = await DepartmentModel.findById(id);
  if (!findDep) {
    return notFoundResponse(res, "Department");
  }

  const findHead = await findDep.headOfEmployee;

  logger.info("Department head retrieved", { departmentId: id });

  return successResponse(res, { findHead }, "Head of department retrieved");
});

export const createEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password, status } = req.body;

  const findDep = await DepartmentModel.findById(id);
  if (!findDep) {
    return notFoundResponse(res, "Department");
  }

  const findEmail = await userModel.findOne({ email });
  if (findEmail) {
    return badRequestResponse(res, "User already exists");
  }

  const hashPassword = await bcrypt.hash(password, parseInt(process.env.saltRound));

  const newUser = new userModel({
    name,
    email,
    role: "employee",
    password: hashPassword,
    departmentId: id,
    status
  });

  await newUser.save();

  findDep.employees.push({
    _id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status
  });

  await findDep.save();

  const findUser = await userModel.findById(req.user._id);

  await logAudit({
    userId: req.user._id,
    action: `Add employee by ${findUser.name}`,
    userName: findUser.name,
    entity: "Employee",
    entityId: newUser._id,
    oldValue: null,
    newValue: {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      departmentId: newUser.departmentId,
      status: newUser.status,
    }
  });

  logger.info("Employee created", {
    employeeId: newUser._id,
    departmentId: id,
    createdBy: req.user._id
  });

  return createdResponse(res, {
    department: findDep,
    employee: newUser
  }, "Employee added successfully");
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const { depId, employeeId } = req.params;

  const findDep = await DepartmentModel.findById(depId);
  if (!findDep) {
    return notFoundResponse(res, "Department");
  }

  const employeeIndex = findDep.employees.findIndex(emp => emp._id.toString() === employeeId);
  if (employeeIndex === -1) {
    return notFoundResponse(res, "Employee not found in this department");
  }

  const employeeData = findDep.employees[employeeIndex];

  findDep.employees.splice(employeeIndex, 1);
  await findDep.save();

  await userModel.findByIdAndDelete(employeeId);

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: "Delete Employee",
    entity: "Employee",
    entityId: employeeId,
    oldValue: employeeData,
    newValue: null
  });

  logger.info("Employee deleted", {
    employeeId,
    departmentId: depId,
    deletedBy: req.user._id
  });

  return successResponse(res, { department: findDep }, "Employee successfully deleted from the department");
});

export const listEmployees = asyncHandler(async (req, res) => {
  const { depId } = req.params;

  const findDep = await DepartmentModel.findById(depId);
  if (!findDep) {
    return notFoundResponse(res, "Department");
  }

  const employees = findDep.employees;

  logger.info("Employees listed", { departmentId: depId, count: employees.length });

  return successResponse(res, { employees }, "All employees");
});

/**
 * Get all available permissions
 * GET /api/user/permissions/all
 */
export const listPermissions = asyncHandler(async (req, res) => {
  // Get all available permissions from Department schema enum
  const availablePermissions = [
    // Accident permissions
    { key: "addAccident", label: "Add Accident", category: "Accidents" },
    { key: "deleteAccident", label: "Delete Accident", category: "Accidents" },
    { key: "updateAccident", label: "Update Accident", category: "Accidents" },
    { key: "allAccident", label: "View All Accidents", category: "Accidents" },
    { key: "updateStatus", label: "Update Accident Status", category: "Accidents" },
    { key: "assignAccident", label: "Assign Accident", category: "Accidents" },
    { key: "addComment", label: "Add Accident Comment", category: "Accidents" },
    { key: "getComments", label: "View Accident Comments", category: "Accidents" },

    // Notification permissions
    { key: "createNotification", label: "Create Notification", category: "Notifications" },
    { key: "getNotifications", label: "View Notifications", category: "Notifications" },
    { key: "markAsRead", label: "Mark Notification as Read", category: "Notifications" },
    { key: "deleteNotification", label: "Delete Notification", category: "Notifications" },

    // Insured (Customer) permissions
    { key: "addInsured", label: "Add Customer", category: "Customers" },
    { key: "deleteInsured", label: "Delete Customer", category: "Customers" },
    { key: "updateInsured", label: "Update Customer", category: "Customers" },
    { key: "allInsured", label: "View All Customers", category: "Customers" },
    { key: "findInsuredById", label: "View Customer Details", category: "Customers" },
    { key: "searchCustomer", label: "Search Customers", category: "Customers" },

    // Vehicle permissions
    { key: "addcar", label: "Add Vehicle", category: "Vehicles" },
    { key: "removeCar", label: "Remove Vehicle", category: "Vehicles" },
    { key: "showVehicles", label: "View Vehicles", category: "Vehicles" },
    { key: "updateCar", label: "Update Vehicle", category: "Vehicles" },

    // Road/Service permissions
    { key: "addService", label: "Add Service", category: "Services" },
    { key: "updateService", label: "Update Service", category: "Services" },
    { key: "deleteService", label: "Delete Service", category: "Services" },
    { key: "allServices", label: "View All Services", category: "Services" },

    // Agent permissions
    { key: "addAgents", label: "Add Agent", category: "Agents" },
    { key: "deleteAgents", label: "Delete Agent", category: "Agents" },
    { key: "updateAgents", label: "Update Agent", category: "Agents" },
    { key: "allAgents", label: "View All Agents", category: "Agents" },

    // Insurance Company permissions
    { key: "addCompany", label: "Add Insurance Company", category: "Insurance Companies" },
    { key: "deleteCompany", label: "Delete Insurance Company", category: "Insurance Companies" },
    { key: "updateCompany", label: "Update Insurance Company", category: "Insurance Companies" },
    { key: "allCompany", label: "View All Insurance Companies", category: "Insurance Companies" },

    // Department permissions
    { key: "addDepartment", label: "Add Department", category: "Departments" },
    { key: "deleteDepartment", label: "Delete Department", category: "Departments" },
    { key: "updateDepartment", label: "Update Department", category: "Departments" },
    { key: "allDepartments", label: "View All Departments", category: "Departments" },
    { key: "DepartmentById", label: "View Department Details", category: "Departments" },

    // User/Employee permissions
    { key: "addHeadOfDepartmentToDepartment", label: "Add Department Head", category: "User Management" },
    { key: "deleteHeadOfDepartmentToDepartment", label: "Delete Department Head", category: "User Management" },
    { key: "getHeadOfDepartment", label: "View Department Head", category: "User Management" },
    { key: "addEmployee", label: "Add Employee", category: "User Management" },
    { key: "deleteEmployee", label: "Delete Employee", category: "User Management" },
    { key: "updateEmployee", label: "Update Employee", category: "User Management" },
    { key: "allEmployee", label: "View All Employees", category: "User Management" },

    // Document Settings permissions
    { key: "createDocumentSettings", label: "Create Document Settings", category: "Document Settings" },
    { key: "getActiveDocumentSettings", label: "View Active Document Settings", category: "Document Settings" },
    { key: "getAllDocumentSettings", label: "View All Document Settings", category: "Document Settings" },
    { key: "getDocumentSettingsById", label: "View Document Settings Details", category: "Document Settings" },
    { key: "updateDocumentSettings", label: "Update Document Settings", category: "Document Settings" },
    { key: "deleteDocumentSettings", label: "Delete Document Settings", category: "Document Settings" },
    { key: "activateDocumentSettings", label: "Activate Document Settings", category: "Document Settings" },

    // Insurance Type permissions
    { key: "addType", label: "Add Insurance Type", category: "Insurance Types" },
    { key: "updateType", label: "Update Insurance Type", category: "Insurance Types" },
    { key: "deleteType", label: "Delete Insurance Type", category: "Insurance Types" },
    { key: "allTypes", label: "View All Insurance Types", category: "Insurance Types" },

    // Expense permissions
    { key: "addExpense", label: "Add Expense", category: "Financial" },
    { key: "getExpenses", label: "View Expenses", category: "Financial" },
    { key: "updateExpense", label: "Update Expense", category: "Financial" },
    { key: "deleteExpense", label: "Delete Expense", category: "Financial" },
    { key: "getNetProfit", label: "View Net Profit", category: "Financial" },
    { key: "getCompanyFinancialReport", label: "View Financial Report", category: "Financial" },
    { key: "cancelInsurance", label: "Cancel Insurance", category: "Financial" },

    // Revenue permissions
    { key: "transferInsurance", label: "Transfer Insurance", category: "Financial" },
    { key: "getCustomerPaymentsReport", label: "View Customer Payments Report", category: "Financial" },
    { key: "getCancelledInsurancesReport", label: "View Cancelled Insurances Report", category: "Financial" },

    // Cheque permissions
    { key: "addCheque", label: "Add Cheque", category: "Cheques" },
    { key: "addChequeToInsurance", label: "Add Cheque to Insurance", category: "Cheques" },
    { key: "getAllCheques", label: "View All Cheques", category: "Cheques" },
    { key: "getChequeStatistics", label: "View Cheque Statistics", category: "Cheques" },
    { key: "getChequeById", label: "View Cheque Details", category: "Cheques" },
    { key: "getCustomerCheques", label: "View Customer Cheques", category: "Cheques" },
    { key: "updateChequeStatus", label: "Update Cheque Status", category: "Cheques" },
    { key: "deleteCheque", label: "Delete Cheque", category: "Cheques" },

    // Audit Log permissions
    { key: "viewAuditLogs", label: "View Audit Logs", category: "System" },

    // Payment permissions
    { key: "createPayment", label: "Create Payment", category: "Payments" },
    { key: "verifyTransaction", label: "Verify Transaction", category: "Payments" },
    { key: "voidTransaction", label: "Void Transaction", category: "Payments" },
    { key: "validateCard", label: "Validate Card", category: "Payments" }
  ];

  // Group permissions by category
  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    const category = permission.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({
      key: permission.key,
      label: permission.label
    });
    return acc;
  }, {});

  logger.info("Permissions list retrieved", { totalPermissions: availablePermissions.length });

  return successResponse(res, {
    permissions: availablePermissions,
    groupedPermissions: groupedPermissions,
    categories: Object.keys(groupedPermissions)
  }, "All available permissions retrieved successfully");
});

/**
 * Get current user's permissions
 * GET /api/user/permissions/my-permissions
 */
export const getMyPermissions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user with department
  const user = await userModel.findById(userId);
  if (!user) {
    return notFoundResponse(res, "User");
  }

  // Admin has all permissions
  if (user.role === 'admin') {
    const allPermissions = [
      // Accident permissions
      "addAccident", "deleteAccident", "updateAccident", "allAccident",
      "updateStatus", "assignAccident", "addComment", "getComments",
      // Notification permissions
      "createNotification", "getNotifications", "markAsRead", "deleteNotification",
      // Insured (Customer) permissions
      "addInsured", "deleteInsured", "updateInsured", "allInsured", "findInsuredById", "searchCustomer",
      // Vehicle permissions
      "addcar", "removeCar", "showVehicles", "updateCar",
      // Road/Service permissions
      "addService", "updateService", "deleteService", "allServices",
      // Agent permissions
      "addAgents", "deleteAgents", "updateAgents", "allAgents",
      // Insurance Company permissions
      "addCompany", "deleteCompany", "updateCompany", "allCompany",
      // Department permissions
      "addDepartment", "deleteDepartment", "updateDepartment", "allDepartments", "DepartmentById",
      // User/Employee permissions
      "addHeadOfDepartmentToDepartment", "deleteHeadOfDepartmentToDepartment", "getHeadOfDepartment",
      "addEmployee", "deleteEmployee", "updateEmployee", "allEmployee",
      // Document Settings permissions
      "createDocumentSettings", "getActiveDocumentSettings", "getAllDocumentSettings",
      "getDocumentSettingsById", "updateDocumentSettings", "deleteDocumentSettings", "activateDocumentSettings",
      // Insurance Type permissions
      "addType", "updateType", "deleteType", "allTypes",
      // Expense permissions
      "addExpense", "getExpenses", "updateExpense", "deleteExpense",
      "getNetProfit", "getCompanyFinancialReport", "cancelInsurance",
      // Revenue permissions
      "transferInsurance", "getCustomerPaymentsReport", "getCancelledInsurancesReport",
      // Cheque permissions
      "addCheque", "addChequeToInsurance", "getAllCheques", "getChequeStatistics",
      "getChequeById", "getCustomerCheques", "updateChequeStatus", "deleteCheque",
      // Audit Log permissions
      "viewAuditLogs",
      // Payment permissions
      "createPayment", "verifyTransaction", "voidTransaction", "validateCard"
    ];

    logger.info("Admin permissions retrieved", { userId });

    return successResponse(res, {
      userId: user._id,
      userName: user.name,
      role: user.role,
      isAdmin: true,
      permissions: allPermissions,
      departmentId: null,
      departmentName: null
    }, "User permissions retrieved successfully");
  }

  // For employees and head of employees, get department permissions
  if (!user.departmentId) {
    logger.info("User has no department assigned", { userId });

    return successResponse(res, {
      userId: user._id,
      userName: user.name,
      role: user.role,
      isAdmin: false,
      permissions: [],
      departmentId: null,
      departmentName: null
    }, "User has no department assigned");
  }

  const department = await DepartmentModel.findById(user.departmentId);
  if (!department) {
    return notFoundResponse(res, "Department");
  }

  logger.info("User permissions retrieved", {
    userId,
    departmentId: department._id,
    permissionCount: (department.permissions || []).length
  });

  return successResponse(res, {
    userId: user._id,
    userName: user.name,
    role: user.role,
    isAdmin: false,
    permissions: department.permissions || [],
    departmentId: department._id,
    departmentName: department.name
  }, "User permissions retrieved successfully");
});

/**
 * Reset employee password by admin
 * PATCH /api/v1/user/reset-employee-password/:userId
 */
export const resetEmployeePassword = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  // Validate user ID
  if (!userId) {
    return badRequestResponse(res, "User ID is required");
  }

  // Find the user to reset password for
  const targetUser = await userModel.findById(userId);
  if (!targetUser) {
    return notFoundResponse(res, "User");
  }

  // Prevent admins from resetting other admin passwords
  if (targetUser.role === 'admin' && req.user.role !== 'admin') {
    return unauthorizedResponse(res, "You cannot reset an admin's password");
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.saltRound));

  // Update the password
  targetUser.password = hashedPassword;
  await targetUser.save();

  // Log the action
  const adminUser = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    action: `Reset password for user ${targetUser.name}`,
    userName: adminUser.name,
    entity: "User",
    entityId: targetUser._id,
    oldValue: { passwordChanged: true },
    newValue: { passwordReset: true, resetBy: adminUser.name }
  });

  logger.info("Employee password reset by admin", {
    targetUserId: targetUser._id,
    resetBy: req.user._id
  });

  return successResponse(res, {
    userId: targetUser._id,
    userName: targetUser.name,
    email: targetUser.email,
    role: targetUser.role
  }, `Password reset successfully for ${targetUser.name}`);
});
