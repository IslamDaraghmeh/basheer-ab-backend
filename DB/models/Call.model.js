import mongoose, { Schema } from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callid: {
      type: String,
      required: true,
      unique: true,
    },
    recordingUrl: {
      type: String,
      required: true,
    },
    insuredId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Insured",
      default: null, 
    },
  },
  {
    timestamps: true,
  }
);
const CallModel = mongoose.model("Call", callSchema);
export default CallModel;
