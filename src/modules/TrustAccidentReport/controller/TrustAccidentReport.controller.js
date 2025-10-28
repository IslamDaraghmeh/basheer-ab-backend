import { insuredModel } from "../../../../DB/models/Insured.model.js";
import TrustAccidentReportModel from "../../../../DB/models/TrustAccidentReport.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import { createNotification, sendNotificationLogic } from "../../notification/controller/notification.controller.js";
const logAudit = async ({ userId, action, entity, entityId,userName, oldValue = null, newValue = null }) => {
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

export const addAccedentReport = async (req, res) => {
  const { plateNumber } = req.params;
  try {
    const insured = await insuredModel.findOne({ "vehicles.plateNumber": plateNumber });

    if (!insured) {
      return res.status(404).json({ message: "Insured person or vehicle not found" });
    }

    const vehicle = insured.vehicles.find(v => v.plateNumber.toString() === plateNumber.toString());

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found in the insured person's vehicle list" });
    }

    const newAccidentReport = new TrustAccidentReportModel({
      insuredId: insured._id,

      accidentDetails: {
        location: req.body.accidentDetails.location,
        date: req.body.accidentDetails.date,
        time: req.body.accidentDetails.time,
        accidentType: req.body.accidentDetails.accidentType,
        reportDate: req.body.accidentDetails.reportDate,
      },

      insuredVehicle: {
        plateNumber: vehicle.plateNumber,
        type: vehicle.type,
        model: vehicle.model,
        color: vehicle.color,
        ownership: vehicle.ownership,
        usage: req.body.insuredVehicle.usage,
        manufactureYear: req.body.insuredVehicle.manufactureYear,
        chassisNumber: req.body.insuredVehicle.chassisNumber,
        testExpiry: vehicle.licenseExpiry,
        insuranceCompany: req.body.insuredVehicle.insuranceCompany,
        policyNumber: req.body.insuredVehicle.policyNumber,
        insuranceType: req.body.insuredVehicle.insuranceType,
        insurancePeriod: {
          from: req.body.insuredVehicle.insurancePeriod.from,
          to: req.body.insuredVehicle.insurancePeriod.to,
        },
      },

      driverDetails: {
        name: req.body.driverDetails.name,
        birthDate: req.body.driverDetails.birthDate,
        address: req.body.driverDetails.address,
        licenseNumber: req.body.driverDetails.licenseNumber,
        licenseType: req.body.driverDetails.licenseType,
        licenseExpiry: req.body.driverDetails.licenseExpiry,
        relationToInsured: req.body.driverDetails.relationToInsured,
      },

      damages: {
        front: req.body.damages.front,
        back: req.body.damages.back,
        right: req.body.damages.right,
        left: req.body.damages.left,
        estimatedCost: req.body.damages.estimatedCost,
        garageName: req.body.damages.garageName,
        towCompany: req.body.damages.towCompany,
      },

      otherVehicle: {
        plateNumber: req.body.otherVehicle.plateNumber,
        type: req.body.otherVehicle.type,
        model: req.body.otherVehicle.model,
        color: req.body.otherVehicle.color,
        insuranceCompany: req.body.otherVehicle.insuranceCompany,
        driverName: req.body.otherVehicle.driverName,
        driverAddress: req.body.otherVehicle.driverAddress,
        licenseNumber: req.body.otherVehicle.licenseNumber,
        damageDescription: req.body.otherVehicle.damageDescription,
      },

      witnesses: req.body.witnesses,

      policeReport: {
        reportDate: req.body.policeReport.reportDate,
        authority: req.body.policeReport.authority,
        sketchDrawn: req.body.policeReport.sketchDrawn,
        officersPresent: req.body.policeReport.officersPresent,
      },

      narration: req.body.narration,
      signature: req.body.signature,

      declaration: {
        declarerName: req.body.declaration.declarerName,
        declarationDate: req.body.declaration.declarationDate,
        reviewerName: req.body.declaration.reviewerName,
        reviewerSignature: req.body.declaration.reviewerSignature,
        reviewDate: req.body.declaration.reviewDate,
      },
    });

    await newAccidentReport.save();

    const user = req.user;
                        const   message= `${user.name} add new  trust accident report`
          await sendNotificationLogic({
            senderId: req.user._id,
                 message
          })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Add new  Trust Accident Report  by${user.name}`,
      entity: " Trust Accident Report",
      entityId: newAccidentReport._id,
      oldValue: null,
      newValue: newAccidentReport,
    });

    return res.status(201).json({ message: "Accident report added successfully", data: newAccidentReport });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while adding the accident report" });
  }
};

export const deleteAccidentReport = async (req, res) => {
  try {
    const { id } = req.params;
    const accidentReport = await TrustAccidentReportModel.findById(id);

    if (!accidentReport) {
      return res.status(404).json({ message: "Accident report not found" });
    }

    const deleted = await TrustAccidentReportModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(400).json({ message: "Failed to delete accident report" });
    }

  
    const user = req.user;
                     const   message= `${user.name} delete  trust accident report`
          await sendNotificationLogic({
            senderId: req.user._id,
                 message
          })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `User ${user.name} (ID: ${user._id}) deleted a Trust accident report`,
      entity: "TrustAccidentReport",
      entityId: id,
      oldValue: accidentReport,
      newValue: null
    });

    return res.status(200).json({ message: "Accident report deleted successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while deleting the accident report" });
  }
};


export const findAll = async (req, res) => {
  try {
    const allReports = await TrustAccidentReportModel.find({});
    console.log(allReports)
    if (!allReports || allReports.length === 0) {
      return res.status(404).json({ message: "No accident reports found" });
    }
    return res.status(200).json({ message: "Success", data: allReports });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while retrieving accident reports" });
  }
};


export const findById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await TrustAccidentReportModel.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Accident report not found" });
    }
    return res.status(200).json({ message: "Success", data: report });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while retrieving the accident report" });
  }
};
