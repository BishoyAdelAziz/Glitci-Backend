// validators/projectValidator.js
const Joi = require("joi");

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const employeeAssignmentSchema = Joi.object({
  employee: mongoId.required(),
  compensation: Joi.number().min(0).required(),
  hoursWorked: Joi.number().min(0).default(0),
  paymentStatus: Joi.string()
    .valid("pending", "partial", "paid")
    .default("pending"),
});

const clientPaymentSchema = Joi.object({
  amount: Joi.number().required(),
  notes: Joi.string().trim().max(500).allow(""),
  date: Joi.date().default(Date.now),
  paymentMethod: Joi.string()
    .valid("cash", "bank_transfer", "check", "credit_card", "other")
    .default("bank_transfer"),
  reference: Joi.string().trim().allow(""),
});

const employeePaymentSchema = Joi.object({
  employee: mongoId.required(),
  amount: Joi.number().required(), // ← This allows negative numbers!
  notes: Joi.string().trim().max(500).allow(""),
  date: Joi.date().default(Date.now),
  paymentMethod: Joi.string()
    .valid("cash", "bank_transfer", "check", "credit_card", "other")
    .default("bank_transfer"),
});

const expenseSchema = Joi.object({
  description: Joi.string().trim().min(2).max(200).required(),
  amount: Joi.number().required(),
  category: Joi.string()
    .valid("equipment", "software", "travel", "marketing", "office", "other")
    .required(),
  date: Joi.date().default(Date.now),
  receipt: Joi.string().uri().allow(""),
});

// Project validators
// validators/projectValidator.js - Make sure createProject schema is correct
exports.createProject = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(1000).allow(""),
  client: mongoId.required(),
  department: mongoId.required(),
  budget: Joi.number().min(0).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().allow(null),
  status: Joi.string()
    .valid("planning", "active", "on_hold", "completed", "cancelled")
    .default("planning"),
  employees: Joi.array().items(employeeAssignmentSchema).default([]),
  services: Joi.array().items(mongoId).default([]),
  isActive: Joi.boolean().default(true),
});

exports.updateProject = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(1000).allow(""),
  client: mongoId,
  department: mongoId,
  budget: Joi.number().min(0),
  startDate: Joi.date(),
  endDate: Joi.date().allow(null),
  status: Joi.string().valid(
    "planning",
    "active",
    "on_hold",
    "completed",
    "cancelled"
  ),
  employees: Joi.array().items(employeeAssignmentSchema).min(0),
  services: Joi.array().items(mongoId).min(0),
  isActive: Joi.boolean(),
});

exports.addClientPayment = clientPaymentSchema;
exports.addEmployeePayment = employeePaymentSchema;
exports.addExpense = expenseSchema;

exports.listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  skip: Joi.number().integer().min(0).optional(),
  client: mongoId.optional(),
  department: mongoId.optional(),
  status: Joi.string()
    .valid("planning", "active", "on_hold", "completed", "cancelled")
    .optional(),
  search: Joi.string().trim().min(1).max(100).optional(),
  minBudget: Joi.number().min(0).optional(),
  maxBudget: Joi.number().min(0).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);
