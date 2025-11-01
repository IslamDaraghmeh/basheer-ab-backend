import DepartmentModel from "#db/models/Department.model.js";
import mongoose from 'mongoose';
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

const dropUniqueIndex = async () => {
  try {
    await mongoose.connection.db.collection('departments').dropIndex("headOfEmployee.email_1");
    logger.info("Dropped index: headOfEmployee.email");
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      logger.error("Error dropping index", { error: error.message });
    }
  }
};

const dropUniqueIndexEmployee = async () => {
  try {
    await mongoose.connection.db.collection('departments').dropIndex("employees.email_1");
    logger.info("Dropped index: employees.email");
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      logger.error("Error dropping index", { error: error.message });
    }
  }
};

export const create = asyncHandler(async (req, res) => {
  const { name, permissions, description } = req.body;

  await dropUniqueIndex();
  await dropUniqueIndexEmployee();

  const addDepartment = await DepartmentModel.create({
    name,
    permissions,
    description,
  });

  if (!addDepartment) {
    return badRequestResponse(res, "Error in adding department");
  }

  logger.info("Department created", {
    departmentId: addDepartment._id,
    name,
    userId: req.user?._id
  });

  return createdResponse(res, { department: addDepartment }, "Department added successfully");
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const department = await DepartmentModel.findById(id);
  if (!department) {
    return notFoundResponse(res, "Department");
  }

  await DepartmentModel.findByIdAndDelete(id);

  logger.info("Department deleted", {
    departmentId: id,
    name: department.name,
    userId: req.user?._id
  });

  return successResponse(res, null, "Department deleted successfully");
});

export const list = asyncHandler(async (req, res) => {
  const departments = await DepartmentModel.find({});

  if (!departments || departments.length === 0) {
    return notFoundResponse(res, "No departments found");
  }

  logger.info("Departments retrieved", { count: departments.length });

  return successResponse(res, { departments }, "All departments");
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const department = await DepartmentModel.findById(id);
  if (!department) {
    return notFoundResponse(res, "Department");
  }

  logger.info("Department retrieved by ID", { departmentId: id });

  return successResponse(res, { department }, "Requested department");
});

export const update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;

  const department = await DepartmentModel.findById(id);
  if (!department) {
    return notFoundResponse(res, "Department");
  }

  const oldValues = { name: department.name, description: department.description };

  department.name = name || department.name;
  department.description = description || department.description;
  await department.save();

  logger.info("Department updated", {
    departmentId: id,
    oldValues,
    newValues: { name: department.name, description: department.description },
    userId: req.user?._id
  });

  return successResponse(res, { department }, "Department updated successfully");
});
