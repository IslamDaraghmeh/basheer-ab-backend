import mongoose, { Schema } from "mongoose";

const TrustAccidentReportSchema = new Schema({
  insuredId: {
    type: Schema.Types.ObjectId,
    ref: "Insured",
    required: true,
  },

  
  accidentDetails: {
    location: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    accidentType: { type: String, required: true }, 
    reportDate: { type: Date, required: true }, 
  },

  
  insuredVehicle: {
    plateNumber: { type: String, required: true }, 
    type: { type: String, required: true },       
    model: { type: String, required: true },      
    color: { type: String, required: true },       
    ownership: { type: String, required: true }, 
    usage: { type: String, required: true },       
    manufactureYear: { type: String, required: true }, 
    chassisNumber: { type: String, required: true }, 
    testExpiry: { type: Date, required: true },    
    insuranceCompany: { type: String, required: true },
    policyNumber: { type: String, required: true },
    insuranceType: { type: String, required: true },
    insurancePeriod: {
      from: { type: Date, required: true }, 
      to: { type: Date, required: true },  
    },
  },

 
  driverDetails: {
    name: { type: String, required: true },
    birthDate: { type: Date, required: true },
    address: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    licenseType: { type: String, required: true },
    licenseExpiry: { type: Date, required: true },
    relationToInsured: { type: String, required: true },
  },

 
  damages: {
    front: { type: String, required: true },
    back: { type: String, required: true },
    right: { type: String, required: true },
    left: { type: String, required: true },
    estimatedCost: { type: String, required: true },
    garageName: { type: String, required: true },
    towCompany: { type: String, required: true },
  },

 
  otherVehicle: {
    plateNumber: { type: String, required: true },
    type: { type: String, required: true },
    model: { type: String, required: true },
    color: { type: String, required: true },
    insuranceCompany: { type: String, required: true },
    driverName: { type: String, required: true },
    driverAddress: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    damageDescription: { type: String, required: true },
  },

 
  witnesses: [
    {
      name: { type: String, required: true },
      address: { type: String, required: true },
      phone: { type: String, required: true },
    },
  ],


  policeReport: {
    reportDate: { type: Date, required: true },
    authority: { type: String, required: true },
    sketchDrawn: { type: Boolean, required: true },
    officersPresent: { type: Boolean, required: true },
  },


  narration: { type: String, required: true },
  signature: { type: String, required: true },


  declaration: {
    declarerName: { type: String, required: true },
    declarationDate: { type: Date, required: true },
    reviewerName: { type: String, required: true },
    reviewerSignature: { type: String, required: true },
    reviewDate: { type: Date, required: true },
  },
});

const TrustAccidentReportModel = mongoose.model(
  "TrustAccidentReport",
  TrustAccidentReportSchema
);

export default TrustAccidentReportModel;
