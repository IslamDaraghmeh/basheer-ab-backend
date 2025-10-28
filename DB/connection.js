import mongoose from "mongoose";
const ConnectDb=async()=>{
    return await mongoose.connect(process.env.DB_URI)
    .then(res=>{
        console.log("connected")
    }).catch(error=>{
        console.log(`fail connect ${error}`)

    })
}
export default ConnectDb;