import PalestineAccidentReportModel from "../../../../DB/models/PalestineAccidentReport.model.js";
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
export const addAccedentReport = async (req, res) => {
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
      return res.status(404).json({
        message: "The vehicle was not found in the insured person's vehicle list",
      });
    }

    const driverInfo = {
      name: req.body.driverInfo.name,
      idNumber: req.body.driverInfo.idNumber,
      age: req.body.driverInfo.age,
      occupation: req.body.driverInfo.occupation,
      address: req.body.driverInfo.address,
    };

    if (
      req.body.driverInfo.license &&
      req.body.driverInfo.license.number &&
      req.body.driverInfo.license.type &&
      req.body.driverInfo.license.issueDate &&
      req.body.driverInfo.license.expiryDate
    ) {
      driverInfo.license = {
        number: req.body.driverInfo.license.number,
        type: req.body.driverInfo.license.type,
        issueDate: req.body.driverInfo.license.issueDate,
        expiryDate: req.body.driverInfo.license.expiryDate,
      };
    }

    const newAccidentReport = new PalestineAccidentReportModel({
      insuredId: insured._id,

      agentInfo: {
        agentName: req.body.agentInfo.agentName,
        documentNumber: req.body.agentInfo.documentNumber,
        documentType: req.body.agentInfo.documentType,
        insurancePeriod: {
          from: req.body.agentInfo.insurancePeriod.from,
          to: req.body.agentInfo.insurancePeriod.to,
        },
      },

      vehicleInfo: {
        documentDate: req.body.vehicleInfo.documentDate,
        vehicleNumber: vehicle.plateNumber,
        vehicleType: vehicle.type,
        make: req.body.vehicleInfo.make,
        modelYear: vehicle.model,
        usage: req.body.vehicleInfo.usage,
        color: vehicle.color,
        ownerName: req.body.vehicleInfo.ownerName,
        ownerID: insured._id,
        registrationExpiry: vehicle.licenseExpiry,
      },

      driverInfo,

      accidentDetails: {
        accidentDate: req.body.accidentDetails.accidentDate,
        time: req.body.accidentDetails.time,
        location: req.body.accidentDetails.location,
        numberOfPassengers: req.body.accidentDetails.numberOfPassengers,
        vehicleSpeed: req.body.accidentDetails.vehicleSpeed,
        vehiclePurposeAtTime: req.body.accidentDetails.vehiclePurposeAtTime,
        accidentDescription: req.body.accidentDetails.accidentDescription,
        responsibleParty: req.body.accidentDetails.responsibleParty,
        policeInformed: req.body.accidentDetails.policeInformed,
        policeStation: req.body.accidentDetails.policeStation,
      },

      thirdParty: {
        vehicleNumber: req.body.thirdParty.vehicleNumber,
        vehicleType: req.body.thirdParty.vehicleType,
        make: req.body.thirdParty.make,
        model: req.body.thirdParty.model,
        color: req.body.thirdParty.color,
        ownerName: req.body.thirdParty.ownerName,
        ownerPhone: req.body.thirdParty.ownerPhone,
        ownerAddress: req.body.thirdParty.ownerAddress,
        driverName: req.body.thirdParty.driverName,
        driverPhone: req.body.thirdParty.driverPhone,
        driverAddress: req.body.thirdParty.driverAddress,
        insuranceCompany: req.body.thirdParty.insuranceCompany,
        insurancePolicyNumber: req.body.thirdParty.insurancePolicyNumber,
        vehicleDamages: req.body.thirdParty.vehicleDamages,
      },

      injuries: req.body.injuries,
      witnesses: req.body.witnesses,
      passengers: req.body.passengers,

      additionalDetails: {
        notes: req.body.additionalDetails.notes,
        signature: req.body.additionalDetails.signature,
        date: req.body.additionalDetails.date,
        agentRemarks: req.body.additionalDetails.agentRemarks,
      },
    });

    await newAccidentReport.save();
  
      const user = req.user;
          const   message= `${user.name} add new palestine accident report`
    await sendNotificationLogic({
      senderId: req.user._id,
           message
    })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Add new Palestine Accident Report  by${user.name}`,
      entity: "Palestine Accident Report",
      entityId: newAccidentReport._id,
      oldValue: null,
      newValue: newAccidentReport,
    });









    return res.status(201).json({
      message: "Accident report successfully added",
      data: newAccidentReport,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while adding the accident report" });
  }
};
export const deleteAccidentReport = async (req, res) => {
  try {
    const { id } = req.params;
    const foundReport = await PalestineAccidentReportModel.findById(id);

    if (!foundReport) {
      return res.status(404).json({ message: "Not found" });
    }

    const deleted = await PalestineAccidentReportModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(400).json({ message: "Delete failed" });
    }

   
    const user = req.user;
              const   message= `${user.name} delete palestine accident report`
    await sendNotificationLogic({
      senderId: req.user._id,
           message
    })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `User ${user.name} (ID: ${user._id}) deleted a Palestine accident report `,
      entity: "PalestineAccidentReport",
      entityId: id,
      oldValue: foundReport,
      newValue: null
    });

    return res.status(200).json({ message: "Delete successful" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while deleting the report" });
  }
};


export const findAll = async (req, res) => {
  try {
    const allReports = await PalestineAccidentReportModel.find({});
    if (!allReports || allReports.length === 0) {
      return res.status(404).json({ message: "No reports found" });
    } else {
      return res.status(200).json({ message: "Success", data: allReports });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while fetching reports" });
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await PalestineAccidentReportModel.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    } else {
      return res.status(200).json({ message: "Success", data: report });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while fetching the report" });
  }
};