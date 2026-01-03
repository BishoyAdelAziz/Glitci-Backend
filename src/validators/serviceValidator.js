const Joi = require("joi");

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

exports.createService = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().max(500).optional(),
  department: mongoId.required(),
  isActive: Joi.boolean().default(true),
});

exports.updateService = exports.createService.fork(
  ["name", "description", "department", "isActive"],
  (schema) => schema.optional()
);

exports.listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  skip: Joi.number().integer().min(0).optional(),
  department: mongoId.optional(),
  search: Joi.string().trim().min(1).max(100).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);
