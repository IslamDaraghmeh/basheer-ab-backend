/**
 * Al-Mashreq Accident Report Controller
 * Refactored to use accident report factory - reduces from 218 lines to ~75 lines (66% reduction)
 */
import AlMashreqAccidentReportModel from "#db/models/Al-MashreqAccidentReport.model.js";
import { createAccidentReportController } from "#utils/accidentReportFactory.js";

// Custom mapper for Al-Mashreq-specific fields
const alMashreqMapper = (reportData, insured, vehicle, body) => {
  return {
    insuredId: insured._id,

    branchOffice: body.branchOffice,

    insurancePolicy: {
      type: body.insurancePolicy?.type,
      number: body.insurancePolicy?.number,
      duration: body.insurancePolicy?.duration,
      from: body.insurancePolicy?.from,
      to: body.insurancePolicy?.to,
    },

    insuredPerson: {
      name: insured.first_name,
      personalNumber: insured.id_Number,
      fullAddress: insured.city,
      phone: insured.phone_number,
    },

    vehicle: {
      registrationNumber: vehicle.plateNumber,
      usage: body.vehicle?.usage,
      type: vehicle.type,
      makeYear: body.vehicle?.makeYear,
      color: vehicle.color,
    },

    driver: {
      name: body.driver?.name,
      job: body.driver?.job,
      fullAddress: body.driver?.fullAddress,
      phone: body.driver?.phone,
      licenseNumber: body.driver?.licenseNumber,
      licenseType: body.driver?.licenseType,
      licenseIssueDate: body.driver?.licenseIssueDate,
      licenseExpiryDate: body.driver?.licenseExpiryDate,
      age: body.driver?.age,
      idNumber: body.driver?.idNumber,
    },

    accident: {
      date: body.accident?.date,
      time: body.accident?.time,
      weatherCondition: body.accident?.weatherCondition,
      roadCondition: body.accident?.roadCondition,
      accidentLocation: body.accident?.accidentLocation,
      accidentType: body.accident?.accidentType,
      damageToVehicle: body.accident?.damageToVehicle,
      vehicleSpeed: body.accident?.vehicleSpeed,
      timeOfAccident: body.accident?.timeOfAccident,
      passengersCount: body.accident?.passengersCount,
      vehicleUsedPermission: body.accident?.vehicleUsedPermission,
      accidentNotifierName: body.accident?.accidentNotifierName,
      accidentNotifierPhone: body.accident?.accidentNotifierPhone,
    },

    otherVehicles: body.otherVehicles || [],
    vehicleDamages: body.vehicleDamages,
    personalInjuries: body.personalInjuries || [],
    thirdPartyInjuredNames: body.thirdPartyInjuredNames || [],
    vehiclePassengers: body.vehiclePassengers || [],
    externalWitnesses: body.externalWitnesses || [],

    driverSignature: {
      name: body.driverSignature?.name,
      date: body.driverSignature?.date,
    },

    claimant: {
      name: body.claimant?.name,
      signature: body.claimant?.signature,
    },

    receiver: {
      name: body.receiver?.name,
      notes: body.receiver?.notes,
    },

    generalNotes: body.generalNotes,
  };
};

// Export all controller functions from factory
export const { create, list, getById, deleteAccidentReport, update } =
  createAccidentReportController(AlMashreqAccidentReportModel, "Al-Mashreq", alMashreqMapper);
