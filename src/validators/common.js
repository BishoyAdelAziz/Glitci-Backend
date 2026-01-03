// validators/common.js
const Joi = require("joi");

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

exports.bulkDelete = Joi.object({
  ids: Joi.array().items(mongoId).min(1).unique().required(),
});
