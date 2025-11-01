/**
 * Takaful Accident Report Controller
 * Refactored to use accident report factory - reduces from 257 lines to ~105 lines (59% reduction)
 */
import TakafulAccidentReportModel from "#db/models/TakafulAccidentReport.model.js";
import { createAccidentReportController } from "#utils/accidentReportFactory.js";

// Custom mapper for Takaful-specific fields
const takafulMapper = (reportData, insured, vehicle, body) => {
  return {
    insuredId: insured._id,

    accidentInfo: {
      reportDate: body.accidentInfo?.reportDate,
      accidentDate: body.accidentInfo?.accidentDate,
      accidentType: body.accidentInfo?.accidentType,
      accidentLocation: body.accidentInfo?.accidentLocation,
      accidentTime: body.accidentInfo?.accidentTime,
      passengersCount: body.accidentInfo?.passengersCount,
      agentName: body.accidentInfo?.agentName,
    },

    policyInfo: {
      policyNumber: body.policyInfo?.policyNumber,
      branch: body.policyInfo?.branch,
      durationFrom: body.policyInfo?.durationFrom,
      durationTo: body.policyInfo?.durationTo,
      issueDate: body.policyInfo?.issueDate,
      isFullCoverage: body.policyInfo?.isFullCoverage,
      fullCoverageFee: body.policyInfo?.fullCoverageFee,
      isThirdParty: body.policyInfo?.isThirdParty,
      thirdPartyFee: body.policyInfo?.thirdPartyFee,
      isMandatory: body.policyInfo?.isMandatory,
      maxAllowedPassengers: body.policyInfo?.maxAllowedPassengers,
    },

    insuredPerson: {
      name: body.insuredPerson?.name,
      address: body.insuredPerson?.address,
      residence: body.insuredPerson?.residence,
      workAddress: body.insuredPerson?.workAddress,
      workPhone: body.insuredPerson?.workPhone,
    },

    driverInfo: {
      name: body.driverInfo?.name,
      idNumber: body.driverInfo?.idNumber,
      birthDate: body.driverInfo?.birthDate,
      age: body.driverInfo?.age,
      residence: body.driverInfo?.residence,
      address: body.driverInfo?.address,
      workAddress: body.driverInfo?.workAddress,
      workPhone: body.driverInfo?.workPhone,
      relationToInsured: body.driverInfo?.relationToInsured,
    },

    licenseInfo: {
      licenseNumber: body.licenseInfo?.licenseNumber,
      licenseType: body.licenseInfo?.licenseType,
      issueDate: body.licenseInfo?.issueDate,
      expiryDate: body.licenseInfo?.expiryDate,
      matchesVehicleType: body.licenseInfo?.matchesVehicleType,
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
        front: body.insuredVehicle?.damage?.front,
        back: body.insuredVehicle?.damage?.back,
        left: body.insuredVehicle?.damage?.left,
        right: body.insuredVehicle?.damage?.right,
        estimatedValue: body.insuredVehicle?.damage?.estimatedValue,
        towingCompany: body.insuredVehicle?.damage?.towingCompany,
        garage: body.insuredVehicle?.damage?.garage,
      }
    },

    otherVehicles: (body.otherVehicles || []).map(v => ({
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
      reportedDate: body.policeAndWitnesses?.reportedDate,
      policeAuthority: body.policeAndWitnesses?.policeAuthority,
      sketchDrawn: body.policeAndWitnesses?.sketchDrawn,
      policeCame: body.policeAndWitnesses?.policeCame,
      witnesses: (body.policeAndWitnesses?.witnesses || []).map(w => ({
        name: w.name,
        phone: w.phone,
        address: w.address,
      }))
    },

    passengers: (body.passengers || []).map(p => ({
      name: p.name,
      age: p.age,
      address: p.address,
      hospital: p.hospital,
      injuryDescription: p.injuryDescription,
    })),

    accidentNarration: body.accidentNarration,
    notifierSignature: body.notifierSignature,
    receiverName: body.receiverName,
    receiverNotes: body.receiverNotes,
    receiverDate: body.receiverDate,
  };
};

// Export all controller functions from factory
export const { create, list, getById, deleteAccidentReport, update } =
  createAccidentReportController(TakafulAccidentReportModel, "Takaful", takafulMapper);
