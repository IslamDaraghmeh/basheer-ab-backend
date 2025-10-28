import {Schema, model} from 'mongoose'
const userSchema=new Schema({
    name:{
        type:String,
        required:true  
    },
    email:{
        type:String ,
        required:true,
    },
    password:{
        type:String ,
    
        default:"islam@112233" 
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        default: null,
      },
    role:{
        type:String ,
        enum:['admin', 'employee','insured','HeadOfEmployee','agents']

        
    },
    sendCode: {
        type: String,
        default: null
    },
    status:{
        type:String ,
        required:true,
        enum:["inactive","active"],
        default:"active"
    }
})
const userModel=model('user',userSchema)
export {userModel}
