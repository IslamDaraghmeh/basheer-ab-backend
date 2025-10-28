import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    action: {
      type: String,

      required: true,
    },
       userName: {  
      type: String,
      ref: "user",
      required: true,
    },
    entity: {
      type: String, // مثل "Insurance"
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    oldValue: {
      type: Object,
      default: null,
    },
    newValue: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);
export default AuditLogModel;
