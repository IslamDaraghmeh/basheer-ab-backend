import mongoose, { Schema } from "mongoose";

const accidentCommentSchema = new Schema(
  {
    accident: {
      type: Schema.Types.ObjectId,
      ref: "accident",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    images: [{ type: String }],
    isInternal: {
      type: Boolean,
      default: false,
      comment: "Internal notes are only visible to staff, not customers"
    },
  },
  { timestamps: true }
);

// Index for faster queries
accidentCommentSchema.index({ accident: 1, createdAt: -1 });

const AccidentCommentModel = mongoose.model("AccidentComment", accidentCommentSchema);

export { AccidentCommentModel };
