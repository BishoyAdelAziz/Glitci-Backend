const mongoose = require("mongoose");

const toObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ObjectId");
  }
  return new mongoose.Types.ObjectId(id);
};

module.exports = toObjectId;
