import mongoose, { Schema } from "mongoose";

const accidentSchema = new Schema(
  {
    insured: {
      type: Schema.Types.ObjectId,
      ref: "Insured",
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    ticketNumber: {
      type: String,
      unique: true,
      required: false, // Auto-generated in pre-save hook
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Vehicle Accident Report"
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    // Keep 'notes' for backward compatibility but deprecated in favor of 'description'
    notes: { type: String, trim: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ["open", "in_progress", "pending_review", "resolved", "closed"],
      default: "open"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null
    },
    closedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    statusHistory: [{
      status: { type: String },
      changedBy: { type: Schema.Types.ObjectId, ref: "user" },
      changedAt: { type: Date, default: Date.now },
      comment: { type: String }
    }]
  },
  { timestamps: true }
);

// Generate ticket number before saving
accidentSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await mongoose.model('accident').countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    this.ticketNumber = `ACC-${timestamp}-${String(count + 1).padStart(4, '0')}`;
  }

  // Set description from notes for backward compatibility
  if (!this.description && this.notes) {
    this.description = this.notes;
  }

  next();
});

// Index for faster queries
accidentSchema.index({ ticketNumber: 1 });
accidentSchema.index({ status: 1 });
accidentSchema.index({ insured: 1, vehicleId: 1 });

const accidentModel = mongoose.model("accident", accidentSchema);

export { accidentModel };
