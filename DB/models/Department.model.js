

import { Schema, model } from "mongoose";

const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
   
    },
    description: { 
      type: String,
      required: true,  
    },
    headOfEmployee: {
      type: {
        _id: { type: Schema.Types.ObjectId, ref: "user" },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, default: "HeadOfEmployee" },
        status:{type: String, default:'active'}
      },
      default: null,
    },
    employees: [
      {
        _id: { type: Schema.Types.ObjectId, ref: "user" },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, default: "employee" },
        status:{type: String, default:'active'}
      },
    ],
 
    permissions: [
      {
        type: String,
        enum: [
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
        ],
      },
    ],
  },  
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Automatically calculate the number of employees
departmentSchema.virtual("employeeCount").get(function () {
  return this.employees?.length || 0;
});

export default model("Department", departmentSchema);
