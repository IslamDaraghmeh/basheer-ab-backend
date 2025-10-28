import mongoose, { Schema } from "mongoose";

const AhliaAccidentReportSchema = new Schema({
        insuredId: { 
          type: Schema.Types.ObjectId, 
          ref: "Insured", 
          required: true 
        },
  reportNumber: { type: String },                  
  accidentDate: { type: Date, required: true },   
  accidentTime: { type: String, required: true },  

  policeNumber: { type: String },                  
  agentNumber: { type: String },                  
  policyInfo: {
    policyNumber: { type: String },                
    type: { type: String, enum: ['A.C.T', 'TPL', 'COM'] }, 
    durationFrom: { type: Date },                 
    durationTo: { type: Date }                   
  },

  insuredPerson: {
    name: { type: String },                        
  },

  driverInfo: {
    name: { type: String },                        
    idNumber: { type: String },                   
    age: { type: Number },                       
    licenseNumber: { type: String },               
    licenseType: { type: String },               
    licenseIssueDate: { type: Date },             
    matchesVehicle: { type: Boolean },            
  },

  vehicleInfo: {
    usage: { type: String },                      
    manufactureYear: { type: String },             
    vehicleType: { type: String },               
    registrationNumber: { type: String },          
    registrationType: { type: String },           
    lastTestDate: { type: Date },                  
    licenseExpiry: { type: Date }                 
  },

  accidentDetails: {
    location: { type: String },                 
    time: { type: String },                       
    weather: { type: String },                    
    purposeOfUse: { type: String },                
    accidentType: { type: String, enum: ['bodily', 'material', 'bodily_and_material'] }, 
    sketch: { type: String },                      
    driverStatement: { type: String },             
    signature: { type: String }                   
  },


  thirdPartyVehicles: [
    {
      vehicleNumber: { type: String },            
      type: { type: String },                      
      model: { type: String },                    
      color: { type: String },                    
      ownerName: { type: String },             
      ownerAddress: { type: String },              
      ownerPhone: { type: String },               
      driverName: { type: String },               
      driverAddress: { type: String },             
      driverPhone: { type: String },              
      insuranceCompany: { type: String },         
      insurancePolicyNumber: { type: String },  
      damageDetails: { type: String }             
    }
  ],

  thirdPartyInjuries: [
    {
      name: { type: String },
      age: { type: Number },
      address: { type: String },
      profession: { type: String },
      injuryType: { type: String }
    }
  ],

  thirdPartyPassengers: [
    { name: { type: String } }
  ],

  externalWitnesses: [
    { name: { type: String } }
  ],

  declaration: {
    driverSignature: { type: String },
    declarationDate: { type: Date },
    officerSignature: { type: String },            
    officerDate: { type: Date }                   
  }
});

const AhliAccidentReportModel = mongoose.model("AhliAccidentReport", AhliaAccidentReportSchema);

export  default AhliAccidentReportModel ;
