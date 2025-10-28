import { userModel } from "../../../../DB/models/user.model.js";
import bcrypt from 'bcryptjs'
import { nanoid } from "nanoid"
import jwt from "jsonwebtoken"
import { sendEmail } from "../../../services/email.js";
import DepartmentModel from "../../../../DB/models/Department.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";

const logAudit = async ({ userId, action, entity, entityId, userName, oldValue = null, newValue = null }) => {
  try {
    await AuditLogModel.create({
      user: userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      userName
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};


export const profile = async (req, res) => {
  console.log(req.user);
  const user = await userModel.findById(req.user._id);
  if (!user) {
    res.json({ message: 'user not found' })
  }

  res.json({ message: 'success', user })
}
export const changeInformation = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (email) {
      const existEmail = await userModel.findOne({ email: email })
      if (existEmail && existEmail._id.toString() !== userId) {
        return res.status(400).json({ message: 'Email was already using' });
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    res.json({
      message: 'update success',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });


  } catch (err) {
    console.log(err)
  }
}
export const changepassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" })
    }
    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) {
      res.status(400).json({ message: 'please ensure that your password is correct' });
    }
    const hash = bcrypt.hashSync(newPassword, parseInt(process.env.saltRound))
    res.status(200).json({ message: "success", user });
    user.password = hash;
    await user.save();
    res.json({ message: 'change password successfully' });
  } catch (err) {
    console.log(err)
  }
}
export const addAdmin = async (req, res) => {

  const finduser = await userModel.findOne({ email: "admin123@gmail.com" })


  if (!finduser) {
    const hashedPassword = await bcrypt.hash('Islam123..', parseInt(process.env.saltRound))
    const adminUser = new userModel({
      name: "admin",
      email: "islam@ab.com",
      role: "admin",
      password: hashedPassword,
      status: "active"
    })

    await adminUser.save();
    res.status(200).json({ message: "sucsses", adminUser })

  } else {
    res.json({ message: "user already exists" })

  }

}
export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email: email })

    if (!user) {
      return res.status(404).json({ message: "user not found" })
    } else {
      const match = await bcrypt.compare(password, user.password)
      if (!match) {
        res.json('please ensure that your password is correct');
      } else {
        const token = jwt.sign({ id: user._id, email, name: user.name, role: user.role }, process.env.TokenSignIn, { expiresIn: 60 * 60 * 24 })
        res.status(200).json({ message: "success", token, user });

      }
    }

  } catch (error) {
    next(error)

  }
}

export const forgetPassward = async (req, res, next) => {
  const { code, email, newPassword } = req.body
  try {
    if (code == null) {
      return res.json('Please enter the reset code');
    } else {
      const hash = bcrypt.hashSync(newPassword, parseInt(process.env.saltRound))
      const user = await userModel.findOneAndUpdate({ email: email, sendCode: code }, { password: hash, sendCode: null })
      if (!user) {
        return res.json('Please verify the code');
      }
      return res.status(200).json({ message: "sucsses", user })
    }
  } catch (error) {

    next(error)
  }

}

export const sendCode = async (req, res, next) => {
  try {
    const { email } = req.body;


    const findUser = await userModel.findOne({ email: email });
    if (!findUser) {
      return res.status(404).json({ message: 'Please log in' })
    }


    const code = nanoid();


    const user = await userModel.findOneAndUpdate(
      { _id: findUser.id },
      { sendCode: code },
      { new: true }
    );

    if (!user) {
      return res.status(500).json({ message: 'Failed to send code' });
    }


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
                          <p style="margin: 0;">Thank you for using Insurance App! Use the following code rts:</p>
                          <h2 style="margin: 20px 0; font-size: 28px; font-weight: 700; color:hsl(94, 59%, 35%);">${code}</h2>
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
                          <p style="margin: 0;">You received this email because we received a request for  App for your account.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
          `;


    await sendEmail(email, 'Password Reset Request', message);


    return res.status(200).json({ message: 'Code sent successfully ', user });

  } catch (error) {
    console.error(error);
    next(error)

  }
};


export const addHeadOfDepartmentToDepartment = async (req, res, next) => {
  const { name, email, password, status } = req.body;
  const { id } = req.params;

  try {

    const findDep = await DepartmentModel.findById(id);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" });

    }


    if (findDep.headOfEmployee) {
      return res.status(400).json({ message: "There is already a head of department for this department" });
    }

    const hashPassword = await bcrypt.hash(password, parseInt(process.env.saltRound));
    const findEmail = await userModel.findOne({ email: email });
    if (findEmail) {
      return res.status(400).json({ message: "User already exists" })

    } else {




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

      return res.status(201).json({
        message: "Head of department added successfully",
        department: findDep,
      });
    }
  } catch (error) {
    console.log(error.message)
    next(error)
  }
};


export const deleteHeadOfDepartmentFromDepartment = async (req, res, next) => {
  const { depId, userId } = req.params;

  try {
    const department = await DepartmentModel.findById(depId);

    if (!department) {
      return res.status(404).json({ message: "This department doesn't exist" });
    }


    if (!department.headOfEmployee || !department.headOfEmployee._id) {
      return res.status(400).json({ message: "This department has no head of employee" });
    }


    if (department.headOfEmployee._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: "This user is not the head of the department" });
    }


    department.headOfEmployee = null;
    await department.save();


    const user = await userModel.findById(userId);
    if (user) {
      await userModel.findByIdAndDelete(userId);
    }

    return res.status(200).json({ message: "Head of department removed successfully", department });

  } catch (error) {
    console.log(error.message);
    next(error);
  }
};




export const getHeadOfDepartment = async (req, res, next) => {
  const { id } = req.params;
  try {
    const findDep = await DepartmentModel.findById(id);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" })
    } else {
      const findHead = await findDep.headOfEmployee;
      res.status(200).json({ message: "Head of department retrieved", findHead });
    }

  } catch (error) {
    console.log(error.message);
    next(error)

  }
}

export const addEmployee = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, password, status } = req.body;

  try {
    const findDep = await DepartmentModel.findById(id);
    if (!findDep) {
      return res.status(404).json({ message: "Department not found" });
    }

    const findEmail = await userModel.findOne({ email });
    if (findEmail) {
      return res.status(400).json({ message: "User already exists" });
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

    const findUser = await userModel.findById(req.user._id)
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

    return res.status(201).json({
      message: "Employee added successfully",
      department: findDep,
      employee: newUser,
    });

  } catch (error) {
    next(error);
  }
};



export const deleteEmployee = async (req, res, next) => {
  const { depId, employeeId } = req.params;

  try {
    const findDep = await DepartmentModel.findById(depId);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" });
    }

    const employeeIndex = findDep.employees.findIndex(emp => emp._id.toString() === employeeId);
    if (employeeIndex === -1) {
      return res.status(404).json({ message: "Employee not found in this department" });
    }


    const employeeData = findDep.employees[employeeIndex];


    findDep.employees.splice(employeeIndex, 1);
    await findDep.save();


    await userModel.findByIdAndDelete(employeeId);


    await logAudit({
      userId: req.user._id,
      action: "Delete",
      entity: "Employee",
      entityId: employeeId,
      oldValue: employeeData,
      newValue: null
    });

    return res.status(200).json({
      message: "Employee successfully deleted from the department",
      department: findDep,
    });

  } catch (error) {
    console.log(error.message);
    next(error);
  }
};















export const allEmployee = async (req, res, next) => {
  const { depId } = req.params;
  try {
    const findDep = await DepartmentModel.findById(depId);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" });
    }
    const employees = findDep.employees;
    return res.status(200).json({ message: "All employees", employees });

  } catch (error) {
    console.log(error.message);
    next(error)

  }
};

/**
 * Get all available permissions
 * GET /api/user/permissions/all
 */
export const getAllPermissions = async (req, res, next) => {
  try {
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
      { key: "Deletenotification", label: "Delete Notification", category: "Notifications" },

      // Insured (Customer) permissions
      { key: "addInsured", label: "Add Customer", category: "Customers" },
      { key: "deleteInsured", label: "Delete Customer", category: "Customers" },
      { key: "updateInsured", label: "Update Customer", category: "Customers" },
      { key: "allInsured", label: "View All Customers", category: "Customers" },
      { key: "findbyidInsured", label: "View Customer Details", category: "Customers" },
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
      { key: "upateCompany", label: "Update Insurance Company", category: "Insurance Companies" },
      { key: "allCompany", label: "View All Insurance Companies", category: "Insurance Companies" },

      // Department permissions
      { key: "addDepartment", label: "Add Department", category: "Departments" },
      { key: "deleteDepartment", label: "Delete Department", category: "Departments" },
      { key: "updateDepartment", label: "Update Department", category: "Departments" },
      { key: "allDepartments", label: "View All Departments", category: "Departments" },
      { key: "DepartmentById", label: "View Department Details", category: "Departments" },

      // User/Employee permissions
      { key: "addHeadOfDepartmentToDepartmen", label: "Add Department Head", category: "User Management" },
      { key: "deleteHeadOfDepartmentToDepartmen", label: "Delete Department Head", category: "User Management" },
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

    return res.status(200).json({
      success: true,
      message: "All available permissions retrieved successfully",
      data: {
        permissions: availablePermissions,
        groupedPermissions: groupedPermissions,
        categories: Object.keys(groupedPermissions)
      }
    });

  } catch (error) {
    console.error("Error getting permissions:", error);
    next(error);
  }
};

/**
 * Get current user's permissions
 * GET /api/user/permissions/my-permissions
 */
export const getMyPermissions = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get user with department
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Admin has all permissions
    if (user.role === 'admin') {
      const allPermissions = [
        // Accident permissions
        "addAccident", "deleteAccident", "updateAccident", "allAccident",
        "updateStatus", "assignAccident", "addComment", "getComments",
        // Notification permissions
        "createNotification", "getNotifications", "markAsRead", "Deletenotification",
        // Insured (Customer) permissions
        "addInsured", "deleteInsured", "updateInsured", "allInsured", "findbyidInsured", "searchCustomer",
        // Vehicle permissions
        "addcar", "removeCar", "showVehicles", "updateCar",
        // Road/Service permissions
        "addService", "updateService", "deleteService", "allServices",
        // Agent permissions
        "addAgents", "deleteAgents", "updateAgents", "allAgents",
        // Insurance Company permissions
        "addCompany", "deleteCompany", "upateCompany", "allCompany",
        // Department permissions
        "addDepartment", "deleteDepartment", "updateDepartment", "allDepartments", "DepartmentById",
        // User/Employee permissions
        "addHeadOfDepartmentToDepartmen", "deleteHeadOfDepartmentToDepartmen", "getHeadOfDepartment",
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

      return res.status(200).json({
        success: true,
        message: "User permissions retrieved successfully",
        data: {
          userId: user._id,
          userName: user.name,
          role: user.role,
          isAdmin: true,
          permissions: allPermissions,
          departmentId: null,
          departmentName: null
        }
      });
    }

    // For employees and head of employees, get department permissions
    if (!user.departmentId) {
      return res.status(200).json({
        success: true,
        message: "User has no department assigned",
        data: {
          userId: user._id,
          userName: user.name,
          role: user.role,
          isAdmin: false,
          permissions: [],
          departmentId: null,
          departmentName: null
        }
      });
    }

    const department = await DepartmentModel.findById(user.departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "User permissions retrieved successfully",
      data: {
        userId: user._id,
        userName: user.name,
        role: user.role,
        isAdmin: false,
        permissions: department.permissions || [],
        departmentId: department._id,
        departmentName: department.name
      }
    });

  } catch (error) {
    console.error("Error getting user permissions:", error);
    next(error);
  }
};

/**
 * Reset employee password by admin
 * PATCH /api/v1/user/reset-employee-password/:userId
 */
export const resetEmployeePassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Find the user to reset password for
    const targetUser = await userModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent admins from resetting other admin passwords
    if (targetUser.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You cannot reset an admin's password"
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.saltRound));

    // Store old password hash for audit log
    const oldPasswordHash = targetUser.password;

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

    return res.status(200).json({
      success: true,
      message: `Password reset successfully for ${targetUser.name}`,
      data: {
        userId: targetUser._id,
        userName: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });

  } catch (error) {
    console.error("Error resetting employee password:", error);
    next(error);
  }
};
