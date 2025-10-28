import { userModel } from "../../../../DB/models/User.model.js";
import bcrypt from 'bcryptjs'

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
}


export const addAgents = async (req, res, next) => {
  try {
    const { name, email, password, status } = req.body;

    // Check for required fields
    if (!name || !email || !password ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const findAgent = await userModel.findOne({ email });
    if (findAgent) {
      return res.status(400).json({ message: "Agent already exists" });
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
      return res.status(400).json({ message: "Error adding agent" });
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

    return res.status(201).json({ message: "Agent added successfully", newAgent: savedAgent });
  } catch (error) {
    next(error);
  }
};


export const deleteAgents = async (req, res, next) => {
  const { id } = req.params;

  try {
    const findAgent = await userModel.findById(id);
   
    if (!findAgent) {
      return res.status(404).json({ message: "Agent not exist" });
    } 

 
    const oldValue = {
      name: findAgent.name,
      email: findAgent.email,
      role: findAgent.role,
      status: findAgent.status,
    };
   const findUser=await userModel.findById(req.user._id)
    const deletedAgent = await userModel.findByIdAndDelete(id);

    if (!deletedAgent) {
      return res.status(400).json({ message: "Deletion error" });
    } else {
      
      await logAudit({
        userId: req.user._id,     
        action: `Delete agent by ${findUser.name}`,
        userName:findUser.name,
        entity: "User",            
        entityId: deletedAgent._id,
        oldValue,
        newValue: null,
      });

      return res.status(200).json({ message: "Agent deleted successfully" });
    }
  } catch (error) {
    next(error);
  }
};

export const updateAgents = async (req, res, next) => {
  const { name, email, password, role } = req.body;
  const { id } = req.params;

  try {
    const findAgent = await userModel.findById(id);
    if (!findAgent) {
      return res.status(404).json({ message: "Agent not found" });
    }
   const findUser=await userModel.findById(req.user._id)
   
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
      action: `Update agent info my ${findUser.name}`,
      userName:name,
      entity: "User",         
      entityId: findAgent._id,
      oldValue,
      newValue,
    });

    res.status(200).json({ message: "Agent updated successfully", agent: findAgent });

  } catch (error) {
    next(error);
  }
};


export const allAgents = async (req, res, next) => {
  try {
    const getAll = await userModel.find({ role: "agents" })
    if (!getAll) {
      return res.status(404).json({ message: " No agents found " })
    } else {
      return res.status(200).json({ message: "Agents ", getAll })
    }

  } catch (error) {

    next(error)
  }
}

export const totalAgents = async (req, res, next) => {
  try {
    const count = await userModel.countDocuments({ role: "agents" });
    return res.status(200).json({ message: "Total agents count", total: count });
  } catch (error) {
    next(error);
  }
};


