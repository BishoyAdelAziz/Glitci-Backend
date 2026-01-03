const Joi = require("joi");
const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  department: mongoId.optional(),
  search: Joi.string().trim().min(2).max(100).optional(),
});

const createPosition = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().max(200).optional(),
  department: mongoId.required(),
  skills: Joi.array().items(mongoId).min(1).optional(),
  isActive: Joi.boolean().default(true),
});

const updatePosition = createPosition.fork(
  ["name", "description", "department", "skills"],
  (schema) => schema.optional()
);

module.exports = { listQuery, createPosition, updatePosition };
