const AppError = require("./AppError");

module.exports = async (Model, ids, message) => {
  const count = await Model.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) {
    throw new AppError(message || "Invalid reference IDs", 400);
  }
};
