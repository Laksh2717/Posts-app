import { Schema } from "mongoose";

const requestSchema = Schema(
  {
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["accepted", "rejected", "pending"],
    },
  },
  { timestamps: true }
);

const Request = mongoose.model("Request", requestSchema);

export default Request;
