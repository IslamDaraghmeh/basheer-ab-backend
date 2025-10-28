import { insuredModel } from "../../../../DB/models/Insured.model.js";
import TakafulAccidentReportModel from "../../../../DB/models/TakafulAccidentReport.model.js";
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
export const addAccidentReport = async (req, res) => {
  try {
    const { plateNumber } = req.params;

    const insured = await insuredModel.findOne({ "vehicles.plateNumber": plateNumber });

    if (!insured) {
      return res.status(404).json({ message: "Insured person or vehicle not found" });
    }

    const vehicle = insured.vehicles.find(v => v.plateNumber.toString() === plateNumber.toString());

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found under the insured person's vehicles" });
    }

    const newAccidentReport = new TakafulAccidentReportModel({
      insuredId: insured._id,

      accidentInfo: {
        reportDate: req.body.accidentInfo.reportDate,
        accidentDate: req.body.accidentInfo.accidentDate,
        accidentType: req.body.accidentInfo.accidentType,
        accidentLocation: req.body.accidentInfo.accidentLocation,
        accidentTime: req.body.accidentInfo.accidentTime,
        passengersCount: req.body.accidentInfo.passengersCount,
        agentName: req.body.accidentInfo.agentName,
      },

      policyInfo: {
        policyNumber: req.body.policyInfo.policyNumber,
        branch: req.body.policyInfo.branch,
        durationFrom: req.body.policyInfo.durationFrom,
        durationTo: req.body.policyInfo.durationTo,
        issueDate: req.body.policyInfo.issueDate,
        isFullCoverage: req.body.policyInfo.isFullCoverage,
        fullCoverageFee: req.body.policyInfo.fullCoverageFee,
        isThirdParty: req.body.policyInfo.isThirdParty,
        thirdPartyFee: req.body.policyInfo.thirdPartyFee,
        isMandatory: req.body.policyInfo.isMandatory,
        maxAllowedPassengers: req.body.policyInfo.maxAllowedPassengers,
      },

      insuredPerson: {
        name: req.body.insuredPerson.name,
        address: req.body.insuredPerson.address,
        residence: req.body.insuredPerson.residence,
        workAddress: req.body.insuredPerson.workAddress,
        workPhone: req.body.insuredPerson.workPhone,
      },

      driverInfo: {
        name: req.body.driverInfo.name,
        idNumber: req.body.driverInfo.idNumber,
        birthDate: req.body.driverInfo.birthDate,
        age: req.body.driverInfo.age,
        residence: req.body.driverInfo.residence,
        address: req.body.driverInfo.address,
        workAddress: req.body.driverInfo.workAddress,
        workPhone: req.body.driverInfo.workPhone,
        relationToInsured: req.body.driverInfo.relationToInsured,
      },

      licenseInfo: {
        licenseNumber: req.body.licenseInfo.licenseNumber,
        licenseType: req.body.licenseInfo.licenseType,
        issueDate: req.body.licenseInfo.issueDate,
        expiryDate: req.body.licenseInfo.expiryDate,
        matchesVehicleType: req.body.licenseInfo.matchesVehicleType,
      },

      insuredVehicle: {
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        type: vehicle.type,
        ownership: vehicle.ownership,
        modelNumber: vehicle.modelNumber,
        licenseExpiry: vehicle.licenseExpiry,
        lastTest: vehicle.lastTest,
        color: vehicle.color,
        price: vehicle.price,

        damage: {
          front: req.body.insuredVehicle.damage.front,
          back: req.body.insuredVehicle.damage.back,
          left: req.body.insuredVehicle.damage.left,
          right: req.body.insuredVehicle.damage.right,
          estimatedValue: req.body.insuredVehicle.damage.estimatedValue,
          towingCompany: req.body.insuredVehicle.damage.towingCompany,
          garage: req.body.insuredVehicle.damage.garage,
        }
      },

      otherVehicles: req.body.otherVehicles.map(v => ({
        vehicleNumber: v.vehicleNumber,
        ownerName: v.ownerName,
        driverName: v.driverName,
        colorAndType: v.colorAndType,
        totalWeight: v.totalWeight,
        address: v.address,
        phone: v.phone,
        insuranceCompany: v.insuranceCompany,
        policyNumber: v.policyNumber,
        insuranceType: v.insuranceType,
        damageDescription: v.damageDescription,
      })),

      policeAndWitnesses: {
        reportedDate: req.body.policeAndWitnesses.reportedDate,
        policeAuthority: req.body.policeAndWitnesses.policeAuthority,
        sketchDrawn: req.body.policeAndWitnesses.sketchDrawn,
        policeCame: req.body.policeAndWitnesses.policeCame,
        witnesses: req.body.policeAndWitnesses.witnesses.map(w => ({
          name: w.name,
          phone: w.phone,
          address: w.address,
        }))
      },

      passengers: req.body.passengers.map(p => ({
        name: p.name,
        age: p.age,
        address: p.address,
        hospital: p.hospital,
        injuryDescription: p.injuryDescription,
      })),

      accidentNarration: req.body.accidentNarration,
      notifierSignature: req.body.notifierSignature,
      receiverName: req.body.receiverName,
      receiverNotes: req.body.receiverNotes,

      declaration: {
        declarerName: req.body.declaration.declarerName,
        declarationDate: req.body.declaration.declarationDate,
        documentCheckerName: req.body.declaration.documentCheckerName,
        checkerJob: req.body.declaration.checkerJob,
        checkerSignature: req.body.declaration.checkerSignature,
        checkerDate: req.body.declaration.checkerDate,
      }
    });

    await newAccidentReport.save();


      const user = req.user;
                    const   message= `${user.name} add new  takaful accident report`
          await sendNotificationLogic({
            senderId: req.user._id,
                 message
          })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Add new  Takaful Accident Report  by${user.name}`,
      entity: " Takaful Accident Report",
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

    const findTakafulAccident = await TakafulAccidentReportModel.findById(id);
    if (!findTakafulAccident) {
      return res.status(404).json({ message: "Accident report not found" });
    }

    const deleteAcc = await TakafulAccidentReportModel.findByIdAndDelete(id);
    if (!deleteAcc) {
      return res.status(500).json({ message: "Failed to delete accident report" });
    }

 
    const user = req.user;

                  const   message= `${user.name} delete takaful accident report`
        await sendNotificationLogic({
          senderId: req.user._id,
               message
        })
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `User ${user.name} (ID: ${user._id}) deleted a Takaful accident report `,
      entity: "TakafulAccidentReport",
      entityId: id,
      oldValue: findTakafulAccident,
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
    const findAll = await TakafulAccidentReportModel.find({});
    if (!findAll || findAll.length === 0) {
      return res.status(404).json({ message: "No accident reports found" });
    } else {
      return res.status(200).json({ message: "Success", data: findAll });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while fetching accident reports" });
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;
    const find = await TakafulAccidentReportModel.findById(id);
    if (!find) {
      return res.status(404).json({ message: "Accident report not found" });
    } else {
      return res.status(200).json({ message: "Success", data: find });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while fetching the accident report" });
  }
};
