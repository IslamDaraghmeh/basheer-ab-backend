import { userModel } from "#db/models/User.model.js";
import bcrypt from 'bcryptjs';
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  createdResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse
} from "#utils/apiResponse.js";

export const create = asyncHandler(async (req, res) => {
  const { name, email, password, status } = req.body;

  // Check for required fields
  if (!name || !email || !password) {
    return badRequestResponse(res, "Missing required fields");
  }

  const findAgent = await userModel.findOne({ email });
  if (findAgent) {
    return conflictResponse(res, "Agent already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const newAgent = new userModel({
    name,
    email,
    password: hashedPassword,
    role: "agents",
    status,
  });

  const savedAgent = await newAgent.save();

  if (!savedAgent) {
    return badRequestResponse(res, "Error adding agent");
  }

  const findUser = await userModel.findById(req.user._id);

  await logAudit({
    userId: req.user._id,
    action: `Add new agent by ${findUser.name}`,
    userName: findUser.name,
    entity: "User",
    entityId: savedAgent._id,
    oldValue: null,
    newValue: {
      name: savedAgent.name,
      email: savedAgent.email,
      role: savedAgent.role,
      status: savedAgent.status,
    },
  });

  return createdResponse(res, { newAgent: savedAgent }, "Agent added successfully");
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findAgent = await userModel.findById(id);

  if (!findAgent) {
    return notFoundResponse(res, "Agent");
  }

  const oldValue = {
    name: findAgent.name,
    email: findAgent.email,
    role: findAgent.role,
    status: findAgent.status,
  };

  const findUser = await userModel.findById(req.user._id);
  const deletedAgent = await userModel.findByIdAndDelete(id);

  if (!deletedAgent) {
    return badRequestResponse(res, "Deletion error");
  }

  await logAudit({
    userId: req.user._id,
    action: `Delete agent by ${findUser.name}`,
    userName: findUser.name,
    entity: "User",
    entityId: deletedAgent._id,
    oldValue,
    newValue: null,
  });

  return successResponse(res, null, "Agent deleted successfully");
});

export const update = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const { id } = req.params;

  const findAgent = await userModel.findById(id);
  if (!findAgent) {
    return notFoundResponse(res, "Agent");
  }

  const findUser = await userModel.findById(req.user._id);

  const oldValue = {
    name: findAgent.name,
    email: findAgent.email,
    role: findAgent.role,
  };

  findAgent.name = name || findAgent.name;
  findAgent.email = email || findAgent.email;
  findAgent.role = role || findAgent.role;

  if (password) {
    const salt = await bcrypt.genSalt(8);
    findAgent.password = await bcrypt.hash(password, salt);
  }

  await findAgent.save();

  const newValue = {
    name: findAgent.name,
    email: findAgent.email,
    role: findAgent.role,
  };

  await logAudit({
    userId: req.user._id,
    action: `Update agent info by ${findUser.name}`,
    userName: findUser.name,
    entity: "User",
    entityId: findAgent._id,
    oldValue,
    newValue,
  });

  return successResponse(res, { agent: findAgent }, "Agent updated successfully");
});

export const list = asyncHandler(async (req, res) => {
  const getAll = await userModel.find({ role: "agents" });

  if (!getAll || getAll.length === 0) {
    return notFoundResponse(res, "Agents");
  }

  return successResponse(res, { agents: getAll, count: getAll.length }, "Agents retrieved successfully");
});

export const count = asyncHandler(async (req, res) => {
  const count = await userModel.countDocuments({ role: "agents" });
  return successResponse(res, { total: count }, "Total agents count");
});
