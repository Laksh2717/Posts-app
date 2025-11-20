import mongoose, { Schema } from "mongoose";

const friendSchema = Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      default: "noStatus",
      enum: ["accepted", "rejected", "pending", "noStatus"]
    }
  },
  { timeStamps: true }
);

const Friend = mongoose.model("Friend", friendSchema);

export default Friend;
