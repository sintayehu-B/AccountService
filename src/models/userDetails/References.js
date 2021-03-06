const mongoose = require("mongoose");
const ReferencesSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "FullName is required"],
    },
    position: {
      type: String,
      required: [true, "Position is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "PhoneNumber is required"],
    },
    previousExperience: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreviousExperience",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("References", ReferencesSchema);
