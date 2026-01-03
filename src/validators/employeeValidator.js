const Joi = require("joi");

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

exports.createEmployee = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  department: mongoId.required(),
  position: mongoId.required(),
  skills: Joi.array().items(mongoId).min(1).unique().required(),
  isActive: Joi.boolean().default(true),
});

exports.updateEmployee = exports.createEmployee.fork(
  ["name", "email", "department", "position", "skills"],
  (schema) => schema.optional()
);

exports.listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  skip: Joi.number().integer().min(0).optional(), // Add skip parameter
  department: mongoId.optional(),
  position: mongoId.optional(),
  skill: mongoId.optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().trim().min(1).max(100).optional(), // Changed min from 2 to 1 to allow single character search
}).unknown(true); // Allow unknown fields to handle skip parameter
