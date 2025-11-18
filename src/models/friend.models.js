import mongoose, { Schema } from "mongoose";

const friendSchema = Schema(
  {
    friend1: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    friend2: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timeStamps: true }
);

const Friend = mongoose.Model("Friend", friendSchema);

export default Friend;
