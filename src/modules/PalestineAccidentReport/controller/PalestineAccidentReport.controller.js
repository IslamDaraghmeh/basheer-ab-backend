/**
 * Palestine Accident Report Controller
 * Refactored to use accident report factory - reduces from 237 lines to ~90 lines (62% reduction)
 */
import PalestineAccidentReportModel from "#db/models/PalestineAccidentReport.model.js";
import { createAccidentReportController } from "#utils/accidentReportFactory.js";

// Custom mapper for Palestine-specific fields
const palestineMapper = (reportData, insured, vehicle, body) => {
  const driverInfo = {
    name: body.driverInfo?.name,
    idNumber: body.driverInfo?.idNumber,
    age: body.driverInfo?.age,
    occupation: body.driverInfo?.occupation,
    address: body.driverInfo?.address,
  };

  if (
    body.driverInfo?.license &&
    body.driverInfo.license.number &&
    body.driverInfo.license.type &&
    body.driverInfo.license.issueDate &&
    body.driverInfo.license.expiryDate
  ) {
    driverInfo.license = {
      number: body.driverInfo.license.number,
      type: body.driverInfo.license.type,
      issueDate: body.driverInfo.license.issueDate,
      expiryDate: body.driverInfo.license.expiryDate,
    };
  }

  return {
    insuredId: insured._id,

    agentInfo: {
      agentName: body.agentInfo?.agentName,
      documentNumber: body.agentInfo?.documentNumber,
      documentType: body.agentInfo?.documentType,
      insurancePeriod: {
        from: body.agentInfo?.insurancePeriod?.from,
        to: body.agentInfo?.insurancePeriod?.to,
      },
    },

    vehicleInfo: {
      documentDate: body.vehicleInfo?.documentDate,
      vehicleNumber: vehicle.plateNumber,
      vehicleType: vehicle.type,
      make: body.vehicleInfo?.make,
      modelYear: vehicle.model,
      usage: body.vehicleInfo?.usage,
      color: vehicle.color,
      ownerName: body.vehicleInfo?.ownerName,
      ownerID: insured._id,
      registrationExpiry: vehicle.licenseExpiry,
    },

    driverInfo,

    accidentDetails: {
      accidentDate: body.accidentDetails?.accidentDate,
      time: body.accidentDetails?.time,
      location: body.accidentDetails?.location,
      numberOfPassengers: body.accidentDetails?.numberOfPassengers,
      vehicleSpeed: body.accidentDetails?.vehicleSpeed,
      vehiclePurposeAtTime: body.accidentDetails?.vehiclePurposeAtTime,
      accidentDescription: body.accidentDetails?.accidentDescription,
      responsibleParty: body.accidentDetails?.responsibleParty,
      policeInformed: body.accidentDetails?.policeInformed,
      policeStation: body.accidentDetails?.policeStation,
    },

    thirdParty: {
      vehicleNumber: body.thirdParty?.vehicleNumber,
      vehicleType: body.thirdParty?.vehicleType,
      make: body.thirdParty?.make,
      model: body.thirdParty?.model,
      color: body.thirdParty?.color,
      ownerName: body.thirdParty?.ownerName,
      ownerPhone: body.thirdParty?.ownerPhone,
      ownerAddress: body.thirdParty?.ownerAddress,
      driverName: body.thirdParty?.driverName,
      driverPhone: body.thirdParty?.driverPhone,
      driverAddress: body.thirdParty?.driverAddress,
      insuranceCompany: body.thirdParty?.insuranceCompany,
      insurancePolicyNumber: body.thirdParty?.insurancePolicyNumber,
      vehicleDamages: body.thirdParty?.vehicleDamages,
    },

    injuries: body.injuries || [],
    witnesses: body.witnesses || [],
    passengers: body.passengers || [],

    additionalDetails: {
      notes: body.additionalDetails?.notes,
      signature: body.additionalDetails?.signature,
      date: body.additionalDetails?.date,
      agentRemarks: body.additionalDetails?.agentRemarks,
    },
  };
};

// Export all controller functions from factory
export const { create, list, getById, deleteAccidentReport, update } =
  createAccidentReportController(PalestineAccidentReportModel, "Palestine", palestineMapper);
