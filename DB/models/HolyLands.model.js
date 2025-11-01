import mongoose,{Schema} from "mongoose";

const HolyLandsAccidentReportSchema = new mongoose.Schema({
      insuredId: { 
        type: Schema.Types.ObjectId, 
        ref: "Insured", 
        required: true 
      },
  insuranceDetails: {
    policyNumber: String,
    insuranceDuration: String,
    fromDate: Date,
    toDate: Date,
    insuranceType: String,
    vehicleNumber: String,
  },
  vehicleDetails: {
    vehicleColor: String,
    vehicleBranch: String,
    chassisNumber: String,
    plateNumber: String,
    modelYear: Number,
    vehicleUsage: String,
  },
  ownerAndDriverDetails: {
    ownerName: String,
    driverName: String,
    driverID: String,
    driverLicenseNumber: String,
    driverLicenseGrade: String,
    licenseIssueDate: Date,
    licenseExpiryDate: Date,
    driverPhone: String,
    driverAddress: String,
    driverProfession: String,
    licenseIssuePlace: String,
  },
  accidentDetails: {
    accidentDate: Date,
    accidentTime: String,
    speedAtTime: String,
    numberOfPassengers: Number,
    lightsUsed: String,
    directionFrom: String,
    accidentDirection: String,
    accidentLocation: String,
    accidentDetailsText: String,
    accidentCause: String,
    notesByBranchManager: String,
    policeNotified: Boolean,
    whoInformedPolice: String,
  },
  otherVehicles: [
    {
      vehicleNumber: String,
      vehicleType: String,
      make: String,
      model: String,
      plateNumber: String,
      insuranceCompany: String,
      driverName: String,
      driverAddress: String,
      details: String,
    },
  ],
  involvementDetails: {
    damageToUserCar: String,
    damageToThirdParty: String,
  },
  injuries: [
    {
      name: String,
      age: Number,
      address: String,
      occupation: String,
      maritalStatus: String,
      injuryType: String,
    },
  ],
  injuredNamesAndAddresses: String,
  passengerNamesAndAddresses: String,
  additionalDetails: String,
  signature: String,
  signatureDate: Date,
  employeeNotes: String,
  employeeSignature: String,
  employeeDate: Date,
});
const HolyLandsAccidentReportModel = mongoose.model(
  "HolyLandsAccidentReport",
  HolyLandsAccidentReportSchema
);

export default HolyLandsAccidentReportModel;