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
        type:String,
        required:true  // No default password - must be set explicitly
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
    // Password reset fields
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    resetPasswordAttempts: {
        type: Number,
        default: 0
    },
    resetPasswordLockUntil: {
        type: Date,
        default: null
    },
    // Legacy field - kept for backward compatibility, will be replaced by resetPasswordToken
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
