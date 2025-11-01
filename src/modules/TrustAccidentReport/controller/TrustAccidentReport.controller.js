/**
 * Trust Accident Report Controller
 * Refactored to use accident report factory - reduces from 214 lines to ~85 lines (60% reduction)
 */
import TrustAccidentReportModel from "#db/models/TrustAccidentReport.model.js";
import { createAccidentReportController } from "#utils/accidentReportFactory.js";

// Custom mapper for Trust-specific fields
const trustMapper = (reportData, insured, vehicle, body) => {
  return {
    insuredId: insured._id,

    policyDetails: {
      policyNumber: body.policyDetails?.policyNumber,
      issueDate: body.policyDetails?.issueDate,
      expiryDate: body.policyDetails?.expiryDate,
      branch: body.policyDetails?.branch,
    },

    insuredPersonDetails: {
      name: `${insured.first_name} ${insured.last_name}`,
      idNumber: insured.id_Number,
      phone: insured.phone_number,
      address: insured.city,
      email: insured.email,
    },

    vehicleDetails: {
      plateNumber: vehicle.plateNumber,
      model: vehicle.model,
      type: vehicle.type,
      color: vehicle.color,
      modelNumber: vehicle.modelNumber,
      chassisNumber: body.vehicleDetails?.chassisNumber,
      licenseExpiry: vehicle.licenseExpiry,
      usage: vehicle.ownership,
    },

    driverDetails: {
      name: body.driverDetails?.name,
      idNumber: body.driverDetails?.idNumber,
      age: body.driverDetails?.age,
      phone: body.driverDetails?.phone,
      address: body.driverDetails?.address,
      licenseNumber: body.driverDetails?.licenseNumber,
      licenseType: body.driverDetails?.licenseType,
      licenseIssueDate: body.driverDetails?.licenseIssueDate,
      licenseExpiryDate: body.driverDetails?.licenseExpiryDate,
      relationToOwner: body.driverDetails?.relationToOwner,
    },

    accidentDetails: {
      accidentDate: body.accidentDetails?.accidentDate,
      accidentTime: body.accidentDetails?.accidentTime,
      accidentLocation: body.accidentDetails?.accidentLocation,
      accidentType: body.accidentDetails?.accidentType,
      accidentDescription: body.accidentDetails?.accidentDescription,
      weatherConditions: body.accidentDetails?.weatherConditions,
      roadConditions: body.accidentDetails?.roadConditions,
      numberOfPassengers: body.accidentDetails?.numberOfPassengers,
      vehicleSpeed: body.accidentDetails?.vehicleSpeed,
      policeReported: body.accidentDetails?.policeReported,
      policeStation: body.accidentDetails?.policeStation,
      policeReportNumber: body.accidentDetails?.policeReportNumber,
    },

    vehicleDamage: {
      front: body.vehicleDamage?.front,
      back: body.vehicleDamage?.back,
      left: body.vehicleDamage?.left,
      right: body.vehicleDamage?.right,
      estimatedCost: body.vehicleDamage?.estimatedCost,
      description: body.vehicleDamage?.description,
    },

    thirdPartyVehicles: (body.thirdPartyVehicles || []).map(v => ({
      plateNumber: v.plateNumber,
      ownerName: v.ownerName,
      ownerPhone: v.ownerPhone,
      driverName: v.driverName,
      vehicleType: v.vehicleType,
      color: v.color,
      insuranceCompany: v.insuranceCompany,
      policyNumber: v.policyNumber,
      damageDescription: v.damageDescription,
    })),

    injuries: (body.injuries || []).map(i => ({
      name: i.name,
      age: i.age,
      injuryType: i.injuryType,
      injuryDescription: i.injuryDescription,
      hospitalName: i.hospitalName,
      isPassenger: i.isPassenger,
    })),

    witnesses: (body.witnesses || []).map(w => ({
      name: w.name,
      phone: w.phone,
      address: w.address,
    })),

    additionalNotes: body.additionalNotes,
    reporterSignature: body.reporterSignature,
    reportDate: body.reportDate,
  };
};

// Export all controller functions from factory
export const { create, list, getById, deleteAccidentReport, update } =
  createAccidentReportController(TrustAccidentReportModel, "Trust", trustMapper);
