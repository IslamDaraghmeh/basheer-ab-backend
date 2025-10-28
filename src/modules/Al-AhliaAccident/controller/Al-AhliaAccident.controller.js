import { insuredModel } from "../../../../DB/models/Insured.model.js";
import AhliAccidentReportModel from "../../../../DB/models/Al-AhliaAccident.model.js";
import { createNotification, sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
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


export const addNewAccedentReport = async (req, res) => {
  const { plateNumber } = req.params;

  try {
    const insured = await insuredModel.findOne({ "vehicles.plateNumber": plateNumber });

    if (!insured) {
      return res.status(404).json({ message: "Insured person or vehicle not found." });
    }

    const vehicle = insured.vehicles.find(v => v.plateNumber.toString() === plateNumber.toString());

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found in the insured person's vehicle list." });
    }

    const addNewAccedentReport = new AhliAccidentReportModel({
      insuredId: insured._id,

      reportNumber: req.body.reportNumber,
      accidentDate: req.body.accidentDate,
      accidentTime: req.body.accidentTime,
      policeNumber: req.body.policeNumber,
      agentNumber: req.body.agentNumber,

      policyInfo: {
        policyNumber: req.body.policyInfo.policyNumber,
        type: req.body.policyInfo.type,
        durationFrom: req.body.policyInfo.durationFrom,
        durationTo: req.body.policyInfo.durationTo,
      },

      insuredPerson: {
        name: insured.fullName || req.body.insuredPerson.name,
      },

      driverInfo: {
        name: req.body.driverInfo.name,
        idNumber: req.body.driverInfo.idNumber,
        age: req.body.driverInfo.age,
        licenseNumber: req.body.driverInfo.licenseNumber,
        licenseType: req.body.driverInfo.licenseType,
        licenseIssueDate: req.body.driverInfo.licenseIssueDate,
        matchesVehicle: req.body.driverInfo.matchesVehicle,
      },

      vehicleInfo: {
        usage: req.body.vehicleInfo.usage,
        manufactureYear: req.body.vehicleInfo.manufactureYear,
        vehicleType: vehicle.type || req.body.vehicleInfo.vehicleType,
        registrationNumber: plateNumber,
        registrationType: req.body.vehicleInfo.registrationType,
        lastTestDate: vehicle.lastTest,
        licenseExpiry: vehicle.licenseExpiry || req.body.vehicleInfo.licenseExpiry,
      },

      accidentDetails: {
        location: req.body.accidentDetails.location,
        time: req.body.accidentDetails.time,
        weather: req.body.accidentDetails.weather,
        purposeOfUse: req.body.accidentDetails.purposeOfUse,
        accidentType: req.body.accidentDetails.accidentType,
        sketch: req.body.accidentDetails.sketch,
        driverStatement: req.body.accidentDetails.driverStatement,
        signature: req.body.accidentDetails.signature,
      },

      thirdPartyVehicles: req.body.thirdPartyVehicles || [],
      thirdPartyInjuries: req.body.thirdPartyInjuries || [],
      thirdPartyPassengers: req.body.thirdPartyPassengers || [],
      externalWitnesses: req.body.externalWitnesses || [],

      declaration: {
        driverSignature: req.body.declaration.driverSignature,
        declarationDate: req.body.declaration.declarationDate,
        officerSignature: req.body.declaration.officerSignature,
        officerDate: req.body.declaration.officerDate,
      }
    });

    await addNewAccedentReport.save();
        const user = req.user;
            const   message= `${user.name} add  al_ahii accident report`
                               await sendNotificationLogic({
                                 senderId: req.user._id,
                                      message
                               })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Add new Ahli Accident Report by${user.name}`,
      entity: "AhliAccidentReport",
      entityId: addNewAccedentReport._id,
      oldValue: null,
      newValue: addNewAccedentReport,
    });

    return res.status(201).json({ message: "Accident report added successfully.", data: addNewAccedentReport });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while adding the accident report." });
  }
};


export const deleteAccidentReport = async (req, res) => {
  try {
    const { id } = req.params;

    const findTrustAccident = await AhliAccidentReportModel.findById(id);
    if (!findTrustAccident) {
      return res.status(404).json({ message: "Accident report not found." });
    }

    const deleteAcc = await AhliAccidentReportModel.findByIdAndDelete(id);
    if (!deleteAcc) {
      return res.status(400).json({ message: "Accident report deletion failed." });
    }


    const user = req.user;
           const   message= `${user.name} delete  al_ahii accident report`
                               await sendNotificationLogic({
                                 senderId: req.user._id,
                                      message
                               })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Delete Ahli Accident Report by ${user.name} `,
      entity: "AhliAccidentReport",
      entityId: id,
      oldValue: findTrustAccident,
      newValue: null
    });

    return res.status(200).json({ message: "Accident report deleted successfully." });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while deleting the accident report." });
  }
};


export const findAll = async (req, res) => {
  try {
    const findAll = await AhliAccidentReportModel.find({});
    if (!findAll || findAll.length === 0) {
      return res.status(404).json({ message: "No accident reports found." });
    } else {
      return res.status(200).json({ message: "Success", data: findAll });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while retrieving accident reports." });
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;
    const findOne = await AhliAccidentReportModel.findById(id);
    if (!findOne) {
      return res.status(404).json({ message: "Accident report not found." });
    } else {
      return res.status(200).json({ message: "Success", data: findOne });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while retrieving the accident report." });
  }
};
