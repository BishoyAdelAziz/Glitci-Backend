const Joi = require("joi");
const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  search: Joi.string().trim().min(2).max(100).optional(),
});

const createDepartment = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  isActive: Joi.boolean().default(true),
});

const updateDepartment = createDepartment.fork(["name", "isActive"], (schema) =>
  schema.optional()
);

module.exports = { listQuery, createDepartment, updateDepartment };
