import HoliAccidentReportModel from "../../../../DB/models/HoleLands.model.js";
import { insuredModel } from "../../../../DB/models/Insured.model.js";
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

export const addNewAccedentReport= async (req, res) => {
  const { plateNumber } = req.params;

  try {
    const insured = await insuredModel.findOne({ "vehicles.plateNumber": plateNumber });

    if (!insured) {
      return res.status(404).json({ message: "Insured person or vehicle not found" });
    }

    const vehicle = insured.vehicles.find(
      (v) => v.plateNumber.toString() === plateNumber.toString()
    );

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found for this insured person" });
    }

    const newReport = new HoliAccidentReportModel({
      insuredId: insured._id,

      insuranceDetails: {
        policyNumber: req.body.insuranceDetails.policyNumber,
        insuranceDuration: req.body.insuranceDetails.insuranceDuration,
        fromDate: req.body.insuranceDetails.fromDate,
        toDate: req.body.insuranceDetails.toDate,
        insuranceType: req.body.insuranceDetails.insuranceType,
        vehicleNumber: vehicle.plateNumber,
      },

      vehicleDetails: {
        vehicleColor: vehicle.color,
        vehicleBranch: req.body.vehicleDetails.vehicleBranch,
        chassisNumber: req.body.vehicleDetails.chassisNumber,
        plateNumber: vehicle.plateNumber,
        modelYear: vehicle.modelNumber,
        vehicleUsage: vehicle.ownership,
      },

      ownerAndDriverDetails: {
        ownerName: `${insured.first_name} ${insured.last_name}`,
        driverName: req.body.ownerAndDriverDetails?.driverName || "",
        driverID: req.body.ownerAndDriverDetails?.driverID || "",
        driverLicenseNumber: req.body.ownerAndDriverDetails?.driverLicenseNumber || "",
        driverLicenseGrade: req.body.ownerAndDriverDetails?.driverLicenseGrade || "",
        licenseIssueDate: req.body.ownerAndDriverDetails?.licenseIssueDate || null,
        licenseExpiryDate: vehicle.licenseExpiry,
        driverPhone: req.body.ownerAndDriverDetails?.driverPhone || "",
        driverAddress: req.body.ownerAndDriverDetails?.driverAddress || "",
        driverProfession: req.body.ownerAndDriverDetails?.driverProfession || "",
        licenseIssuePlace: req.body.ownerAndDriverDetails?.licenseIssuePlace || "",
      },

      accidentDetails: req.body.accidentDetails || {},

      otherVehicles: req.body.otherVehicles || [],

      involvementDetails: req.body.involvementDetails || {},

      injuries: req.body.injuries || [],

      injuredNamesAndAddresses: req.body.injuredNamesAndAddresses || "",
      passengerNamesAndAddresses: req.body.passengerNamesAndAddresses || "",
      additionalDetails: req.body.additionalDetails || "",
      signature: req.body.signature || "",
      signatureDate: req.body.signatureDate || null,
      employeeNotes: req.body.employeeNotes || "",
      employeeSignature: req.body.employeeSignature || "",
      employeeDate: req.body.employeeDate || null,
    });

    await newReport.save();
      const user = req.user;
                             const   message= `${user.name} add new  holyland accident report`
                await sendNotificationLogic({
                  senderId: req.user._id,
                       message
                })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Add new holy land  Accident Report  by${user.name}`,
      entity: "holy land  Accident Report",
      entityId: newReport._id,
      oldValue: null,
      newValue: newReport,
    });





    

    return res.status(201).json({
      message: "Accident report created successfully",
      report: newReport,
    });

  } catch (error) {
    console.error("Error adding accident report:", error);
    return res.status(500).json({ message: "An error occurred while adding the accident report" });
  }
};

export const deleteAccidentReport = async (req, res) => {
  try {
    const { id } = req.params;
    const foundReport = await HoliAccidentReportModel.findById(id);

    if (!foundReport) {
      return res.status(404).json({ message: "Not found" });
    }

    const deleted = await HoliAccidentReportModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(500).json({ message: "Delete not successful" });
    }

    // ✅ تسجيل في Audit Log
    const user = req.user;
                       const   message= `${user.name} delete holyland accident report`
                await sendNotificationLogic({
                  senderId: req.user._id,
                       message
                })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Delete HoliAccidentReport by ${user.name}`,
      entity: "HoliAccidentReport",
      entityId: id,
      oldValue: foundReport,
      newValue: null
    });

    return res.status(200).json({ message: "Deleted successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while deleting the accident report" });
  }
};


export const findAll = async (req, res) => {
  try {
    const reports = await HoliAccidentReportModel.find({});
    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: "No reports found" });
    } else {
      return res.status(200).json({ message: "Success", reports });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while fetching accident reports" });
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await HoliAccidentReportModel.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    } else {
      return res.status(200).json({ message: "Success", report });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while fetching the accident report" });
  }
};
