import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, 
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, 
    message: { type: String, required: true }, 
    isRead: { type: Boolean, default: false }, 
  },
  { timestamps: true }
);

const notificationModel= mongoose.model("Notification", notificationSchema);
export default notificationModel
