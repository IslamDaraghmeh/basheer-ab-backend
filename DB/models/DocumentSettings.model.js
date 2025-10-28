import mongoose from "mongoose";

const documentSettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String, // URL or file path to logo
    default: null
  },
  header: {
    text: {
      type: String,
      default: ""
    },
    backgroundColor: {
      type: String,
      default: "#ffffff"
    },
    textColor: {
      type: String,
      default: "#000000"
    },
    fontSize: {
      type: Number,
      default: 16
    }
  },
  footer: {
    text: {
      type: String,
      default: ""
    },
    backgroundColor: {
      type: String,
      default: "#ffffff"
    },
    textColor: {
      type: String,
      default: "#000000"
    },
    fontSize: {
      type: Number,
      default: 12
    }
  },
  documentTemplate: {
    marginTop: {
      type: Number,
      default: 20
    },
    marginBottom: {
      type: Number,
      default: 20
    },
    marginLeft: {
      type: Number,
      default: 20
    },
    marginRight: {
      type: Number,
      default: 20
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  }
}, {
  timestamps: true
});

// Ensure only one active document settings at a time
documentSettingsSchema.pre('save', async function(next) {
  if (this.isActive) {
    await mongoose.model('DocumentSettings').updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

const DocumentSettings = mongoose.model("DocumentSettings", documentSettingsSchema);
export default DocumentSettings;