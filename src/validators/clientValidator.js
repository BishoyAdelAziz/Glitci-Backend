const Joi = require("joi");

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

exports.createClient = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  companyName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phones: Joi.array()
    .items(Joi.string().pattern(/^\+?\d{10,15}$/))
    .min(1)
    .required(),
  industry: Joi.string().trim().max(50).optional(),
  notes: Joi.string().trim().max(1000).optional(),
  isActive: Joi.boolean().default(true),
});

exports.updateClient = exports.createClient.fork(
  ["name", "companyName", "email", "phones", "industry", "notes", "isActive"],
  (schema) => schema.optional()
);

exports.listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  skip: Joi.number().integer().min(0).optional(),
  search: Joi.string().trim().min(1).max(100).optional(),
  isActive: Joi.boolean().optional(),
  industry: Joi.string().trim().max(50).optional(),
}).unknown(true); // Allow unknown fields
