/**
 * HolyLands Accident Report Controller
 * Refactored to use accident report factory - reduces from 197 lines to ~60 lines (70% reduction)
 */
import HolyLandsAccidentReportModel from "#db/models/HolyLands.model.js";
import { createAccidentReportController } from "#utils/accidentReportFactory.js";

// Custom mapper for HolyLands-specific fields
const holyLandsMapper = (reportData, insured, vehicle, body) => {
  return {
    insuredId: insured._id,

    insuranceDetails: {
      policyNumber: body.insuranceDetails?.policyNumber,
      insuranceDuration: body.insuranceDetails?.insuranceDuration,
      fromDate: body.insuranceDetails?.fromDate,
      toDate: body.insuranceDetails?.toDate,
      insuranceType: body.insuranceDetails?.insuranceType,
      vehicleNumber: vehicle.plateNumber,
    },

    vehicleDetails: {
      vehicleColor: vehicle.color,
      vehicleBranch: body.vehicleDetails?.vehicleBranch,
      chassisNumber: body.vehicleDetails?.chassisNumber,
      plateNumber: vehicle.plateNumber,
      modelYear: vehicle.modelNumber,
      vehicleUsage: vehicle.ownership,
    },

    ownerAndDriverDetails: {
      ownerName: `${insured.first_name} ${insured.last_name}`,
      driverName: body.ownerAndDriverDetails?.driverName || "",
      driverID: body.ownerAndDriverDetails?.driverID || "",
      driverLicenseNumber: body.ownerAndDriverDetails?.driverLicenseNumber || "",
      driverLicenseGrade: body.ownerAndDriverDetails?.driverLicenseGrade || "",
      licenseIssueDate: body.ownerAndDriverDetails?.licenseIssueDate || null,
      licenseExpiryDate: vehicle.licenseExpiry,
      driverPhone: body.ownerAndDriverDetails?.driverPhone || "",
      driverAddress: body.ownerAndDriverDetails?.driverAddress || "",
      driverProfession: body.ownerAndDriverDetails?.driverProfession || "",
      licenseIssuePlace: body.ownerAndDriverDetails?.licenseIssuePlace || "",
    },

    accidentDetails: body.accidentDetails || {},
    otherVehicles: body.otherVehicles || [],
    involvementDetails: body.involvementDetails || {},
    injuries: body.injuries || [],
    injuredNamesAndAddresses: body.injuredNamesAndAddresses || "",
    passengerNamesAndAddresses: body.passengerNamesAndAddresses || "",
    additionalDetails: body.additionalDetails || "",
    signature: body.signature || "",
    signatureDate: body.signatureDate || null,
    employeeNotes: body.employeeNotes || "",
    employeeSignature: body.employeeSignature || "",
    employeeDate: body.employeeDate || null,
  };
};

// Export all controller functions from factory
export const { create, list, getById, deleteAccidentReport, update } =
  createAccidentReportController(HolyLandsAccidentReportModel, "HolyLands", holyLandsMapper);
