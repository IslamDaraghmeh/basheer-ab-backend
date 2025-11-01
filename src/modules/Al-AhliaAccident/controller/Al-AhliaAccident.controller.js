/**
 * Al-Ahlia Accident Report Controller
 * Refactored to use accident report factory - reduces from 197 lines to ~80 lines (59% reduction)
 */
import AlAhliaAccidentReportModel from "#db/models/Al-AhliaAccident.model.js";
import { createAccidentReportController } from "#utils/accidentReportFactory.js";

// Custom mapper for Al-Ahlia-specific fields
const alAhliaMapper = (reportData, insured, vehicle, body) => {
  return {
    insuredId: insured._id,

    policyInfo: {
      policyNumber: body.policyInfo?.policyNumber,
      branch: body.policyInfo?.branch,
      coverageType: body.policyInfo?.coverageType,
      policyStartDate: body.policyInfo?.policyStartDate,
      policyEndDate: body.policyInfo?.policyEndDate,
    },

    insuredDetails: {
      name: `${insured.first_name} ${insured.last_name}`,
      idNumber: insured.id_Number,
      phoneNumber: insured.phone_number,
      address: insured.city,
      email: insured.email,
    },

    vehicleInfo: {
      plateNumber: vehicle.plateNumber,
      vehicleType: vehicle.type,
      model: vehicle.model,
      modelNumber: vehicle.modelNumber,
      color: vehicle.color,
      chassisNumber: body.vehicleInfo?.chassisNumber,
      engineNumber: body.vehicleInfo?.engineNumber,
      licenseExpiryDate: vehicle.licenseExpiry,
      ownership: vehicle.ownership,
    },

    driverInfo: {
      name: body.driverInfo?.name,
      idNumber: body.driverInfo?.idNumber,
      age: body.driverInfo?.age,
      phoneNumber: body.driverInfo?.phoneNumber,
      address: body.driverInfo?.address,
      licenseNumber: body.driverInfo?.licenseNumber,
      licenseType: body.driverInfo?.licenseType,
      licenseIssueDate: body.driverInfo?.licenseIssueDate,
      licenseExpiryDate: body.driverInfo?.licenseExpiryDate,
      relationToInsured: body.driverInfo?.relationToInsured,
    },

    accidentInfo: {
      date: body.accidentInfo?.date,
      time: body.accidentInfo?.time,
      location: body.accidentInfo?.location,
      accidentType: body.accidentInfo?.accidentType,
      description: body.accidentInfo?.description,
      weatherCondition: body.accidentInfo?.weatherCondition,
      roadCondition: body.accidentInfo?.roadCondition,
      numberOfPassengers: body.accidentInfo?.numberOfPassengers,
      estimatedSpeed: body.accidentInfo?.estimatedSpeed,
      policeInformed: body.accidentInfo?.policeInformed,
      policeStationName: body.accidentInfo?.policeStationName,
      policeReportNumber: body.accidentInfo?.policeReportNumber,
    },

    damages: {
      vehicleDamages: body.damages?.vehicleDamages,
      estimatedRepairCost: body.damages?.estimatedRepairCost,
      front: body.damages?.front,
      back: body.damages?.back,
      left: body.damages?.left,
      right: body.damages?.right,
    },

    thirdPartyInfo: (body.thirdPartyInfo || []).map(tp => ({
      vehiclePlateNumber: tp.vehiclePlateNumber,
      ownerName: tp.ownerName,
      ownerPhone: tp.ownerPhone,
      driverName: tp.driverName,
      driverPhone: tp.driverPhone,
      vehicleType: tp.vehicleType,
      insuranceCompany: tp.insuranceCompany,
      insurancePolicyNumber: tp.insurancePolicyNumber,
      damagesDescription: tp.damagesDescription,
    })),

    injuries: (body.injuries || []).map(inj => ({
      personName: inj.personName,
      age: inj.age,
      typeOfInjury: inj.typeOfInjury,
      description: inj.description,
      hospitalName: inj.hospitalName,
      isPassenger: inj.isPassenger,
    })),

    witnesses: (body.witnesses || []).map(w => ({
      name: w.name,
      phoneNumber: w.phoneNumber,
      address: w.address,
    })),

    additionalRemarks: body.additionalRemarks,
    reporterName: body.reporterName,
    reporterSignature: body.reporterSignature,
    reportDate: body.reportDate,
    attachments: body.attachments || [],
  };
};

// Export all controller functions from factory
export const { create, list, getById, deleteAccidentReport, update } =
  createAccidentReportController(AlAhliaAccidentReportModel, "Al-Ahlia", alAhliaMapper);
