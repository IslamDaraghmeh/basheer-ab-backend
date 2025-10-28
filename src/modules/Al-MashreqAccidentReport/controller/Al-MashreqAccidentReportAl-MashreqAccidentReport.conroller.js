import AlMashreqAccidentReportModel from "../../../../DB/models/Al-MashreqAccidentReport.model.js";
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
export const addNewAccedentReport = async (req, res) => {
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
      return res.status(404).json({ message: "Vehicle not found under the insured person's list" });
    }

    const newReport = new AlMashreqAccidentReportModel({
      insuredId: insured._id,

      branchOffice: req.body.branchOffice,

      insurancePolicy: {
        type: req.body.insurancePolicy?.type,
        number: req.body.insurancePolicy?.number,
        duration: req.body.insurancePolicy?.duration,
        from: req.body.insurancePolicy?.from,
        to: req.body.insurancePolicy?.to,
      },

      insuredPerson: {
        name: insured.first_name,
        personalNumber: insured.id_Number,
        fullAddress: insured.city,
        phone: insured.phone_number,
      },

      vehicle: {
        registrationNumber: vehicle.plateNumber,
        usage: req.body.vehicle.usage,
        type: vehicle.type,
        makeYear: req.body.vehicle.makeYear,
        color: vehicle.color,
      },

      driver: {
        name: req.body.driver?.name,
        job: req.body.driver?.job,
        fullAddress: req.body.driver?.fullAddress,
        phone: req.body.driver?.phone,
        licenseNumber: req.body.driver?.licenseNumber,
        licenseType: req.body.driver?.licenseType,
        licenseIssueDate: req.body.driver?.licenseIssueDate,
        licenseExpiryDate: req.body.driver?.licenseExpiryDate,
        age: req.body.driver?.age,
        idNumber: req.body.driver?.idNumber,
      },

      accident: {
        date: req.body.accident?.date,
        time: req.body.accident?.time,
        weatherCondition: req.body.accident?.weatherCondition,
        roadCondition: req.body.accident?.roadCondition,
        accidentLocation: req.body.accident?.accidentLocation,
        accidentType: req.body.accident?.accidentType,
        damageToVehicle: req.body.accident?.damageToVehicle,
        vehicleSpeed: req.body.accident?.vehicleSpeed,
        timeOfAccident: req.body.accident?.timeOfAccident,
        passengersCount: req.body.accident?.passengersCount,
        vehicleUsedPermission: req.body.accident?.vehicleUsedPermission,
        accidentNotifierName: req.body.accident?.accidentNotifierName,
        accidentNotifierPhone: req.body.accident?.accidentNotifierPhone,
      },

      otherVehicles: req.body.otherVehicles || [],
      vehicleDamages: req.body.vehicleDamages,
      personalInjuries: req.body.personalInjuries || [],
      thirdPartyInjuredNames: req.body.thirdPartyInjuredNames || [],
      vehiclePassengers: req.body.vehiclePassengers || [],
      externalWitnesses: req.body.externalWitnesses || [],

      driverSignature: {
        name: req.body.driverSignature?.name,
        date: req.body.driverSignature?.date,
      },

      claimant: {
        name: req.body.claimant?.name,
        signature: req.body.claimant?.signature,
      },

      receiver: {
        name: req.body.receiver?.name,
        notes: req.body.receiver?.notes,
      },

      generalNotes: req.body.generalNotes,
    });

    await newReport.save();
       const user = req.user;
                               const   message= `${user.name} add new  al_mashreq accident report`
                       await sendNotificationLogic({
                         senderId: req.user._id,
                              message
                       })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Add new Al_Mashreq Accident Report  by${user.name}`,
      entity: "Al_Mashreq Accident Report ",
      entityId: newReport._id,
      oldValue: null,
      newValue: newReport,
    });





    res.status(201).json({ message: "Accident report successfully saved", report: newReport });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while adding the accident report" });
  }
};


export const deleteAccidentReport = async (req, res) => {
  try {
    const { id } = req.params;

    const findTrustAccident = await AlMashreqAccidentReportModel.findById(id);
    if (!findTrustAccident) {
      return res.status(404).json({ message: "Report not found" });
    }

    const deleteAcc = await AlMashreqAccidentReportModel.findByIdAndDelete(id);
    if (!deleteAcc) {
      return res.status(500).json({ message: "Report deletion failed" });
    }

    
    const user = req.user;
                   const   message= `${user.name} delete  al_mashreq accident report`
                       await sendNotificationLogic({
                         senderId: req.user._id,
                              message
                       })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Delete Al_Mashreq Accident Report  by${user.name}`,
      entity: "AlMashreqAccidentReport",
      entityId: id,
      oldValue: findTrustAccident,
      newValue: null
    });

    return res.status(200).json({ message: "Report deleted successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while deleting the accident report" });
  }
};



export const findAll = async (req, res) => {
  try {
    const findAll = await AlMashreqAccidentReportModel.find({});
    if (!findAll || findAll.length === 0) {
      return res.status(404).json({ message: "No accident reports found" });
    } else {
      return res.status(200).json({ message: "Success", reports: findAll });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while retrieving accident reports" });
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await AlMashreqAccidentReportModel.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Accident report not found" });
    } else {
      return res.status(200).json({ message: "Success", report });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while retrieving the accident report" });
  }
};
